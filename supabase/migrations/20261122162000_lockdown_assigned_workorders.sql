-- Restrict technicians to assigned work orders. SECURITY DEFINER helper avoids recursive RLS.
create or replace function public.is_assigned_to_record(p_record_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.service_team st where st.service_record_id=p_record_id and st.profile_id=auth.uid()) $$;
revoke all on function public.is_assigned_to_record(uuid) from public;
grant execute on function public.is_assigned_to_record(uuid) to authenticated;

drop policy if exists "customers staff read" on public.customers;
drop policy if exists "customers manager or assigned read" on public.customers;
create policy "customers manager or assigned read" on public.customers for select to authenticated
using(public.has_management_role() or exists(
 select 1 from public.vehicles v join public.service_records sr on sr.vehicle_id=v.id
 where v.customer_id=customers.id and public.is_assigned_to_record(sr.id)
));
drop policy if exists "vehicles staff read" on public.vehicles;
drop policy if exists "vehicles manager or assigned read" on public.vehicles;
create policy "vehicles manager or assigned read" on public.vehicles for select to authenticated
using(public.has_management_role() or exists(
 select 1 from public.service_records sr where sr.vehicle_id=vehicles.id and public.is_assigned_to_record(sr.id)
));
drop policy if exists "records staff read" on public.service_records;
drop policy if exists "records manager or assigned read" on public.service_records;
create policy "records manager or assigned read" on public.service_records for select to authenticated
using(public.has_management_role() or public.is_assigned_to_record(id));
drop policy if exists "parts staff read" on public.service_parts;
drop policy if exists "parts manager or assigned read" on public.service_parts;
create policy "parts manager or assigned read" on public.service_parts for select to authenticated
using(public.has_management_role() or public.is_assigned_to_record(service_record_id));
drop policy if exists "team staff read" on public.service_team;
drop policy if exists "team manager or same team read" on public.service_team;
create policy "team manager or same team read" on public.service_team for select to authenticated
using(public.has_management_role() or public.is_assigned_to_record(service_record_id));
drop policy if exists "updates staff read" on public.service_updates;
drop policy if exists "updates manager or assigned read" on public.service_updates;
create policy "updates manager or assigned read" on public.service_updates for select to authenticated
using(public.has_management_role() or public.is_assigned_to_record(service_record_id));
drop policy if exists "images staff read" on public.service_images;
drop policy if exists "images manager or assigned read" on public.service_images;
create policy "images manager or assigned read" on public.service_images for select to authenticated
using(public.has_management_role() or public.is_assigned_to_record(service_record_id));
drop policy if exists "images staff upload" on public.service_images;
drop policy if exists "images manager or assigned upload" on public.service_images;
create policy "images manager or assigned upload" on public.service_images for insert to authenticated
with check(uploaded_by=auth.uid() and (public.has_management_role() or public.is_assigned_to_record(service_record_id)));
