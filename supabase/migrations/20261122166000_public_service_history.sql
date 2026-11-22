-- Expose only the selected service's non-sensitive progress timeline to customers.
create or replace function public.get_public_vehicle_tracking_history(
 p_token uuid default null,p_plate text default null
)
returns table(
 plate text,brand text,model text,current_status public.service_status,
 quote_date date,record_updated_at timestamptz,
 note text,note_status public.service_status,note_created_at timestamptz
)
language sql stable security definer set search_path=public as $$
 with selected as (
  select sr.id,sr.vehicle_id,sr.status,sr.quote_date,sr.updated_at,sr.created_at
  from public.service_records sr join public.vehicles v on v.id=sr.vehicle_id
  where (p_token is not null and sr.tracking_token=p_token)
   or (p_token is null and p_plate is not null
    and upper(regexp_replace(v.plate,'\s+','','g'))=upper(regexp_replace(p_plate,'\s+','','g')))
  order by sr.created_at desc limit 1
 )
 select v.plate,v.brand,v.model,s.status,s.quote_date,s.updated_at,
  u.note,u.status,u.created_at
 from selected s join public.vehicles v on v.id=s.vehicle_id
 left join public.service_updates u on u.service_record_id=s.id
 order by u.created_at asc
$$;
grant execute on function public.get_public_vehicle_tracking_history(uuid,text) to anon,authenticated;

-- Replace a duplicate system status message with the technician's actual note.
create or replace function public.append_service_update(
 p_service_record_id uuid,p_status public.service_status,p_note text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_old_status public.service_status; new_update_id uuid;
begin
 if auth.uid() is null then raise exception 'Oturum açmanız gerekiyor.'; end if;
 if not public.has_management_role() and not public.is_assigned_to_record(p_service_record_id) then
  raise exception 'Bu servis kaydına atanmış değilsiniz.';
 end if;
 select status into v_old_status from public.service_records where id=p_service_record_id for update;
 if not found then raise exception 'Servis kaydı bulunamadı.'; end if;
 if p_status='delivered' and not public.has_management_role() then
  raise exception 'Aracı yalnızca yönetici veya supervisor teslim edebilir.';
 end if;
 if v_old_status='delivered' and p_status<>'delivered' and not public.has_management_role() then
  raise exception 'Teslim edilmiş araç yeniden açılacaksa yönetici veya supervisor onayı gerekir.';
 end if;
 update public.service_records set status=p_status,updated_at=clock_timestamp() where id=p_service_record_id;
 if v_old_status is distinct from p_status then
  update public.service_updates set note=coalesce(nullif(trim(p_note),''),'Durum güncellendi: '||p_status::text),
   created_by=auth.uid(),created_at=clock_timestamp()
  where id=(select id from public.service_updates where service_record_id=p_service_record_id
   order by created_at desc,id desc limit 1) returning id into new_update_id;
 end if;
 if new_update_id is null then
  insert into public.service_updates(service_record_id,status,note,created_by,created_at)
  values(p_service_record_id,p_status,coalesce(nullif(trim(p_note),''),'Servis gelişmesi kaydedildi.'),auth.uid(),clock_timestamp())
  returning id into new_update_id;
 end if;
 return new_update_id;
end $$;
grant execute on function public.append_service_update(uuid,public.service_status,text) to authenticated;
