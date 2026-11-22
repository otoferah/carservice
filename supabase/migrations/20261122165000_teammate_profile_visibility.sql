-- Allow assigned service teammates to see one another's profile labels.
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
