-- Managers and supervisors may edit the estimate and team without erasing progress history.
create or replace function public.update_service_record(
 p_service_record_id uuid,p_customer_name text,p_phone text,p_email text,
 p_plate text,p_brand text,p_model text,p_quote_date date,p_quote_provider text,
 p_parts jsonb,p_team uuid[]
) returns void language plpgsql security definer set search_path=public as $$
declare v_customer_id uuid; v_vehicle_id uuid; v_status public.service_status;
 v_total numeric(12,2); part jsonb; member_id uuid;
begin
 if auth.uid() is null or not public.has_management_role() then
  raise exception 'Servis kayıtlarını yalnızca yönetici veya supervisor düzenleyebilir.';
 end if;
 if nullif(trim(p_customer_name),'') is null or nullif(trim(p_plate),'') is null
  or nullif(trim(p_brand),'') is null or nullif(trim(p_model),'') is null then
  raise exception 'Müşteri, plaka, marka ve model zorunludur.';
 end if;
 select customer_id,vehicle_id,status into v_customer_id,v_vehicle_id,v_status
 from public.service_records where id=p_service_record_id for update;
 if not found then raise exception 'Servis kaydı bulunamadı.'; end if;
 update public.customers set full_name=trim(p_customer_name),phone=nullif(trim(p_phone),''),
  email=nullif(trim(p_email),''),updated_at=now() where id=v_customer_id;
 update public.vehicles set plate=upper(trim(p_plate)),brand=trim(p_brand),
  model=trim(p_model),updated_at=now() where id=v_vehicle_id;
 select coalesce(sum((x->>'quantity')::numeric*(x->>'unit_price')::numeric),0)
 into v_total from jsonb_array_elements(coalesce(p_parts,'[]'::jsonb)) x;
 update public.service_records set quote_date=coalesce(p_quote_date,quote_date),
  quote_provider=p_quote_provider,quote_total=v_total,updated_at=now() where id=p_service_record_id;
 delete from public.service_parts where service_record_id=p_service_record_id;
 for part in select * from jsonb_array_elements(coalesce(p_parts,'[]'::jsonb)) loop
  if nullif(trim(part->>'part_name'),'') is not null then
   insert into public.service_parts(service_record_id,part_name,quantity,unit_price,sort_order)
   values(p_service_record_id,trim(part->>'part_name'),coalesce((part->>'quantity')::numeric,1),
    coalesce((part->>'unit_price')::numeric,0),coalesce((part->>'sort_order')::int,0));
  end if;
 end loop;
 delete from public.service_team where service_record_id=p_service_record_id;
 foreach member_id in array coalesce(p_team,'{}'::uuid[]) loop
  insert into public.service_team(service_record_id,profile_id,assignment_role,assigned_by)
  select p_service_record_id,id,role,auth.uid() from public.profiles
  where id=member_id and is_active and role in('usta','supervisor','admin')
  on conflict(service_record_id,profile_id) do nothing;
 end loop;
 insert into public.service_updates(service_record_id,status,note,created_by)
 values(p_service_record_id,v_status,'Servis dosyası yönetici tarafından düzenlendi.',auth.uid());
end $$;
grant execute on function public.update_service_record(uuid,text,text,text,text,text,text,date,text,jsonb,uuid[]) to authenticated;
