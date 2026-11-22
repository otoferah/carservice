-- Keep the customer snapshot on every service record (not only the latest vehicle owner).
alter table public.service_records add column if not exists customer_id uuid references public.customers(id);
update public.service_records sr set customer_id=v.customer_id from public.vehicles v where v.id=sr.vehicle_id and sr.customer_id is null;
alter table public.service_records alter column customer_id set not null;
create index if not exists service_records_customer_idx on public.service_records(customer_id,created_at desc);

-- Fix status transition authorization in the database, not only in the UI.
create or replace function public.append_service_update(p_service_record_id uuid,p_status public.service_status,p_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare old_status public.service_status; new_id uuid;
begin
 if auth.uid() is null then raise exception 'Oturum açmanız gerekiyor.'; end if;
 if not public.has_management_role() and not public.is_assigned_to_record(p_service_record_id) then raise exception 'Bu servis kaydına atanmış değilsiniz.'; end if;
 select status into old_status from public.service_records where id=p_service_record_id for update;
 if not found then raise exception 'Servis kaydı bulunamadı.'; end if;
 if p_status='delivered' and not public.has_management_role() then raise exception 'Aracı yalnızca yönetici veya supervisor teslim edebilir.'; end if;
 if old_status='delivered' and p_status<>'delivered' and not public.has_management_role() then raise exception 'Teslim edilmiş araç yeniden açılamaz.'; end if;
 if p_status='delivered' and old_status<>'ready' and old_status<>'delivered' then raise exception 'Teslim öncesi araç hazır durumunda olmalıdır.'; end if;
 update public.service_records set status=p_status,updated_at=clock_timestamp() where id=p_service_record_id;
 insert into public.service_updates(service_record_id,status,note,created_by,created_at)
 values(p_service_record_id,p_status,coalesce(nullif(trim(p_note),''),'Servis gelişmesi kaydedildi.'),auth.uid(),clock_timestamp()) returning id into new_id;
 return new_id;
end $$;
grant execute on function public.append_service_update(uuid,public.service_status,text) to authenticated;

-- Never let administrators remove the final active administrator.
create or replace function public.update_profile_role(p_user_id uuid,p_role public.app_role,p_full_name text default null,p_active boolean default true)
returns void language plpgsql security definer set search_path=public as $$
declare active_admins integer;
begin
 if not public.is_admin() then raise exception 'Yalnızca yönetici kullanıcı ve rol yönetebilir.'; end if;
 if p_user_id=auth.uid() and (p_role<>'admin' or not p_active) then raise exception 'Kendi yönetici hesabınızı devre dışı bırakamaz veya rolünü düşüremezsiniz.'; end if;
 if p_role<>'admin' or not p_active then
  select count(*) into active_admins from public.profiles where role='admin' and is_active=true and id<>p_user_id;
  if active_admins=0 then raise exception 'Sistemde en az bir aktif yönetici bulunmalıdır.'; end if;
 end if;
 update public.profiles set role=p_role,full_name=coalesce(p_full_name,full_name),is_active=p_active,updated_at=now() where id=p_user_id;
 if not found then raise exception 'Kullanıcı profili bulunamadı.'; end if;
end $$;
grant execute on function public.update_profile_role(uuid,public.app_role,text,boolean) to authenticated;
