-- Guard role changes so the system cannot lose its final active administrator.
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
