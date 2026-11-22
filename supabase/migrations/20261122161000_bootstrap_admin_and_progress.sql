insert into public.profiles(id,full_name,role,is_active)
select 'e7af57b7-089e-412a-8f54-0e4c61900045'::uuid,
 coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Ferah Otomotiv Yönetici'),
 'admin'::public.app_role,true
from auth.users u where u.id='e7af57b7-089e-412a-8f54-0e4c61900045'::uuid
on conflict(id) do update set role='admin',is_active=true,updated_at=now();

create or replace function public.append_service_update(
 p_service_record_id uuid,p_status public.service_status,p_note text
) returns uuid language plpgsql security definer set search_path=public as $$
declare new_update_id uuid;
begin
 if auth.uid() is null then raise exception 'Oturum açmanız gerekiyor.'; end if;
 if not public.has_management_role() and not exists(
  select 1 from public.service_team st
  where st.service_record_id=p_service_record_id and st.profile_id=auth.uid()
 ) then raise exception 'Bu servis kaydına atanmış değilsiniz.'; end if;
 if p_status='delivered' and not public.has_management_role() then
  raise exception 'Aracı yalnızca yönetici veya supervisor teslim edebilir.';
 end if;
 update public.service_records set status=p_status,updated_at=now() where id=p_service_record_id;
 if not found then raise exception 'Servis kaydı bulunamadı.'; end if;
 insert into public.service_updates(service_record_id,status,note,created_by)
 values(p_service_record_id,p_status,nullif(trim(p_note),''),auth.uid())
 returning id into new_update_id;
 return new_update_id;
end $$;
grant execute on function public.append_service_update(uuid,public.service_status,text) to authenticated;
