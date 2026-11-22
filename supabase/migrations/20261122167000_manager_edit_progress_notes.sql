alter table public.service_updates
 add column if not exists edited_by uuid references public.profiles(id),
 add column if not exists edited_at timestamptz;

create or replace function public.update_service_update_note(
 p_service_record_id uuid,p_update_id uuid,p_note text
) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.has_management_role() then
  raise exception 'Servis geçmişi notlarını yalnızca yönetici veya supervisor düzenleyebilir.';
 end if;
 if nullif(trim(p_note),'') is null then raise exception 'Gelişme notu boş bırakılamaz.'; end if;
 update public.service_updates
 set note=trim(p_note),edited_by=auth.uid(),edited_at=clock_timestamp()
 where id=p_update_id and service_record_id=p_service_record_id;
 if not found then raise exception 'Servis geçmişi kaydı bulunamadı.'; end if;
end $$;
grant execute on function public.update_service_update_note(uuid,uuid,text) to authenticated;
