-- Vehicles may only be delivered after reaching the ready stage.
create or replace function public.guard_service_status()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='delivered' and old.status is distinct from 'delivered' then
  if not public.has_management_role() then
   raise exception 'Yalnızca yönetici veya supervisor aracı teslim edebilir.';
  end if;
  if old.status<>'ready' then
   raise exception 'Araç teslim edilmeden önce servis aşaması Araç hazır olmalıdır.';
  end if;
  new.delivered_by:=auth.uid();
  new.delivered_at:=now();
 end if;
 if old.status='delivered' and new.status<>'delivered' and not public.has_management_role() then
  raise exception 'Teslim edilmiş araç yeniden açılacaksa yönetici veya supervisor onayı gerekir.';
 end if;
 new.updated_at:=now();
 return new;
end $$;
