create table if not exists public.service_tasks (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  title text not null check (length(trim(title)) between 3 and 140),
  description text,
  status text not null default 'assigned' check (status in ('assigned','completed')),
  assigned_by uuid not null references public.profiles(id),
  completion_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists service_tasks_assignee_status_idx on public.service_tasks(assigned_to,status,created_at desc);
create index if not exists service_tasks_record_idx on public.service_tasks(service_record_id,created_at desc);
alter table public.service_tasks enable row level security;
revoke all on public.service_tasks from anon, authenticated;
grant select, insert on public.service_tasks to authenticated;
drop policy if exists "service tasks visible to managers or assignee" on public.service_tasks;
create policy "service tasks visible to managers or assignee" on public.service_tasks for select to authenticated
using (public.has_management_role() or assigned_to=(select auth.uid()));
drop policy if exists "managers assign service tasks" on public.service_tasks;
create policy "managers assign service tasks" on public.service_tasks for insert to authenticated
with check (public.has_management_role() and assigned_by=(select auth.uid()) and exists (
 select 1 from public.profiles p where p.id=assigned_to and p.role='usta' and p.is_active=true
));
create or replace function public.is_assigned_to_record(p_record_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
 select exists(select 1 from public.service_team st where st.service_record_id=p_record_id and st.profile_id=(select auth.uid()))
 or exists(select 1 from public.service_tasks t where t.service_record_id=p_record_id and t.assigned_to=(select auth.uid()))
$$;
revoke all on function public.is_assigned_to_record(uuid) from public;
grant execute on function public.is_assigned_to_record(uuid) to authenticated;
create or replace function public.complete_service_task(p_task_id uuid,p_completion_note text default null)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if auth.uid() is null then raise exception 'Oturum gerekli.'; end if;
 update public.service_tasks set status='completed',completion_note=nullif(left(trim(coalesce(p_completion_note,'')),2000),''),completed_at=now(),updated_at=now()
 where id=p_task_id and assigned_to=auth.uid() and status='assigned';
 if not found then raise exception 'Bu görev size atanmamış, zaten tamamlanmış veya artık aktif değil.'; end if;
end
$$;
revoke all on function public.complete_service_task(uuid,text) from public;
grant execute on function public.complete_service_task(uuid,text) to authenticated;
drop policy if exists "vehicles manager or assigned read" on public.vehicles;
drop policy if exists "vehicles staff read" on public.vehicles;
create policy "vehicles managers and technicians read" on public.vehicles for select to authenticated
using (public.has_management_role() or public.current_app_role()='usta');
drop policy if exists "records manager or assigned read" on public.service_records;
drop policy if exists "records staff read" on public.service_records;
create policy "records managers and technicians read" on public.service_records for select to authenticated
using (public.has_management_role() or public.current_app_role()='usta');
drop policy if exists "parts manager or assigned read" on public.service_parts;
drop policy if exists "parts staff read" on public.service_parts;
create policy "parts managers and technicians read" on public.service_parts for select to authenticated
using (public.has_management_role() or public.current_app_role()='usta');
drop policy if exists "updates manager or assigned read" on public.service_updates;
create policy "updates manager or assigned read" on public.service_updates for select to authenticated
using (public.has_management_role() or public.is_assigned_to_record(service_record_id));
drop policy if exists "images manager or assigned read" on public.service_images;
create policy "images manager or assigned read" on public.service_images for select to authenticated
using (public.has_management_role() or public.is_assigned_to_record(service_record_id));
drop policy if exists "images manager or assigned upload" on public.service_images;
create policy "images manager or assigned upload" on public.service_images for insert to authenticated
with check (uploaded_by=(select auth.uid()) and (public.has_management_role() or public.is_assigned_to_record(service_record_id)));
drop policy if exists "service media manager or assigned read" on storage.objects;
create policy "service media manager or assigned read" on storage.objects for select to authenticated
using (bucket_id='service-media' and (public.has_management_role() or exists(
 select 1 from public.service_team st where st.profile_id=(select auth.uid()) and objects.name like st.service_record_id::text || '/%'
) or exists(
 select 1 from public.service_tasks t where t.assigned_to=(select auth.uid()) and objects.name like t.service_record_id::text || '/%'
)));
drop policy if exists "service media manager or assigned upload" on storage.objects;
create policy "service media manager or assigned upload" on storage.objects for insert to authenticated
with check (bucket_id='service-media' and (public.has_management_role() or exists(
 select 1 from public.service_team st where st.profile_id=(select auth.uid()) and objects.name like st.service_record_id::text || '/%'
) or exists(
 select 1 from public.service_tasks t where t.assigned_to=(select auth.uid()) and objects.name like t.service_record_id::text || '/%'
)));
