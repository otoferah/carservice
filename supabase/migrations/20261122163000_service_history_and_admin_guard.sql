-- Preserve per-service customer identity, keep the last admin safe, and order notes reliably.
alter table public.service_records add column if not exists customer_id uuid references public.customers(id);
update public.service_records sr set customer_id=v.customer_id from public.vehicles v
where v.id=sr.vehicle_id and sr.customer_id is null;
alter table public.service_records alter column customer_id set not null;
create index if not exists service_records_customer_idx on public.service_records(customer_id,created_at desc);

create or replace function public.create_service_record(
 p_customer_name text,p_phone text,p_email text,p_plate text,p_brand text,p_model text,
 p_quote_date date,p_quote_provider text,p_parts jsonb,p_team uuid[],
 p_photo_paths text[] default '{}',p_signature_path text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare c uuid; v uuid; r uuid; total numeric(12,2); part jsonb; member_id uuid;
begin
 if auth.uid() is null or not public.has_management_role() then raise exception 'Yalnızca yönetici veya supervisor kayıt oluşturabilir.'; end if;
 if nullif(trim(p_customer_name),'') is null or nullif(trim(p_plate),'') is null or nullif(trim(p_brand),'') is null or nullif(trim(p_model),'') is null then raise exception 'Müşteri, plaka, marka ve model zorunludur.'; end if;
 insert into public.customers(full_name,phone,email) values(trim(p_customer_name),nullif(trim(p_phone),''),nullif(trim(p_email),'')) returning id into c;
 insert into public.vehicles(customer_id,plate,brand,model) values(c,upper(trim(p_plate)),trim(p_brand),trim(p_model))
 on conflict(plate) do update set customer_id=excluded.customer_id,brand=excluded.brand,model=excluded.model,updated_at=now() returning id into v;
 select coalesce(sum((x->>'quantity')::numeric*(x->>'unit_price')::numeric),0) into total from jsonb_array_elements(coalesce(p_parts,'[]'::jsonb)) x;
 insert into public.service_records(vehicle_id,customer_id,quote_date,status,quote_total,quote_provider,customer_signature_path,opened_by)
 values(v,c,coalesce(p_quote_date,current_date),'waiting',total,p_quote_provider,p_signature_path,auth.uid()) returning id into r;
 for part in select * from jsonb_array_elements(coalesce(p_parts,'[]'::jsonb)) loop
  if nullif(trim(part->>'part_name'),'') is not null then
   insert into public.service_parts(service_record_id,part_name,quantity,unit_price,sort_order)
   values(r,trim(part->>'part_name'),coalesce((part->>'quantity')::numeric,1),coalesce((part->>'unit_price')::numeric,0),coalesce((part->>'sort_order')::int,0));
  end if;
 end loop;
 foreach member_id in array coalesce(p_team,'{}'::uuid[]) loop
  insert into public.service_team(service_record_id,profile_id,assignment_role,assigned_by)
  select r,id,role,auth.uid() from public.profiles where id=member_id and is_active and role in('usta','supervisor','admin')
  on conflict(service_record_id,profile_id) do nothing;
 end loop;
 insert into public.service_updates(service_record_id,status,note,created_by)
 values(r,'waiting','Teklif oluşturuldu; araç servise alındı.',auth.uid());
 foreach part in array coalesce(p_photo_paths,'{}'::text[]) loop
  insert into public.service_images(service_record_id,storage_path,uploaded_by) values(r,part,auth.uid());
 end loop;
 return r;
end $$;

create or replace function public.append_service_update(p_service_record_id uuid,p_status public.service_status,p_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_update_id uuid;
begin
 if auth.uid() is null then raise exception 'Oturum açmanız gerekiyor.'; end if;
 if not public.has_management_role() and not public.is_assigned_to_record(p_service_record_id) then raise exception 'Bu servis kaydına atanmış değilsiniz.'; end if;
 if p_status='delivered' and not public.has_management_role() then raise exception 'Aracı yalnızca yönetici veya supervisor teslim edebilir.'; end if;
 update public.service_records set status=p_status,updated_at=clock_timestamp() where id=p_service_record_id;
 if not found then raise exception 'Servis kaydı bulunamadı.'; end if;
 insert into public.service_updates(service_record_id,status,note,created_by,created_at)
 values(p_service_record_id,p_status,nullif(trim(p_note),''),auth.uid(),clock_timestamp()) returning id into new_update_id;
 return new_update_id;
end $$;

create or replace function public.update_profile_role(p_user_id uuid,p_role public.app_role,p_full_name text default null,p_active boolean default true)
returns void language plpgsql security definer set search_path=public as $$
declare other_admins integer;
begin
 if not public.is_admin() then raise exception 'Yalnızca yönetici kullanıcı ve rol yönetebilir.'; end if;
 if p_user_id=auth.uid() and (p_role<>'admin' or not p_active) then raise exception 'Kendi yönetici hesabınızı devre dışı bırakamaz veya rolünü düşüremezsiniz.'; end if;
 if p_role<>'admin' or not p_active then
  select count(*) into other_admins from public.profiles where role='admin' and is_active=true and id<>p_user_id;
  if other_admins=0 then raise exception 'Sistemde en az bir aktif yönetici bulunmalıdır.'; end if;
 end if;
 update public.profiles set role=p_role,full_name=coalesce(p_full_name,full_name),is_active=p_active,updated_at=now() where id=p_user_id;
 if not found then raise exception 'Kullanıcı profili bulunamadı.'; end if;
end $$;

-- Let technicians view names of people assigned to the same work order.
drop policy if exists "profiles read staff" on public.profiles;
drop policy if exists "profiles read staff and teammates" on public.profiles;
create policy "profiles read staff and teammates" on public.profiles for select to authenticated
using (
 public.current_app_role() in ('admin','supervisor')
 or id=auth.uid()
 or exists(
  select 1 from public.service_team mine
  join public.service_team colleague on colleague.service_record_id=mine.service_record_id
  where mine.profile_id=auth.uid() and colleague.profile_id=profiles.id
 )
);
