-- Public plate lookup must never reveal customer notes or the service timeline.
create or replace function public.get_public_vehicle_tracking(p_token uuid default null,p_plate text default null)
returns table(plate text,brand text,model text,status public.service_status,quote_date date,updated_at timestamptz,latest_note text,latest_note_at timestamptz)
language sql stable security definer set search_path=public as $$
 select v.plate,v.brand,v.model,sr.status,sr.quote_date,sr.updated_at,
  case when p_token is not null then su.note else null end,
  case when p_token is not null then su.created_at else null end
 from public.service_records sr
 join public.vehicles v on v.id=sr.vehicle_id
 left join lateral(select s.note,s.created_at from public.service_updates s where s.service_record_id=sr.id order by s.created_at desc,s.id desc limit 1) su on true
 where (p_token is not null and sr.tracking_token=p_token)
    or (p_token is null and p_plate is not null and sr.status not in ('delivered','cancelled')
       and upper(regexp_replace(v.plate,'\\s+','','g'))=upper(regexp_replace(p_plate,'\\s+','','g')))
 order by sr.created_at desc limit 1
$$;

-- A full progress history is accessible only via the unique QR tracking token, never by plate.
create or replace function public.get_public_vehicle_tracking_history(p_token uuid default null,p_plate text default null)
returns table(plate text,brand text,model text,current_status public.service_status,quote_date date,record_updated_at timestamptz,note text,note_status public.service_status,note_created_at timestamptz)
language sql stable security definer set search_path=public as $$
 with selected as (
  select sr.id,sr.vehicle_id,sr.status,sr.quote_date,sr.updated_at,sr.created_at
  from public.service_records sr
  where p_token is not null and sr.tracking_token=p_token
  order by sr.created_at desc limit 1
 )
 select v.plate,v.brand,v.model,s.status,s.quote_date,s.updated_at,u.note,u.status,u.created_at
 from selected s
 join public.vehicles v on v.id=s.vehicle_id
 left join public.service_updates u on u.service_record_id=s.id
 order by u.created_at asc,u.id asc
$$;

-- Remove default PUBLIC/anon access from internal privileged functions.
revoke all on function public.append_service_update(uuid,public.service_status,text) from public,anon;
revoke all on function public.create_service_record(text,text,text,text,text,text,date,text,jsonb,uuid[],text[],text) from public,anon;
revoke all on function public.current_app_role() from public,anon;
revoke all on function public.guard_service_status() from public,anon,authenticated;
revoke all on function public.has_management_role() from public,anon;
revoke all on function public.is_admin() from public,anon;
revoke all on function public.is_assigned_to_record(uuid) from public,anon;
revoke all on function public.log_service_status() from public,anon,authenticated;
revoke all on function public.update_profile_role(uuid,public.app_role,text,boolean) from public,anon;
revoke all on function public.update_service_record(uuid,text,text,text,text,text,text,date,text,jsonb,uuid[]) from public,anon;
revoke all on function public.update_service_update_note(uuid,uuid,text) from public,anon;

-- Keep internal RPCs available only to authenticated sessions; trigger functions need no direct API grant.
grant execute on function public.append_service_update(uuid,public.service_status,text) to authenticated;
grant execute on function public.create_service_record(text,text,text,text,text,text,date,text,jsonb,uuid[],text[],text) to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.has_management_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_assigned_to_record(uuid) to authenticated;
grant execute on function public.update_profile_role(uuid,public.app_role,text,boolean) to authenticated;
grant execute on function public.update_service_record(uuid,text,text,text,text,text,text,date,text,jsonb,uuid[]) to authenticated;
grant execute on function public.update_service_update_note(uuid,uuid,text) to authenticated;

-- The public status endpoint supports plate lookup; the history endpoint requires the per-record QR token.
revoke all on function public.get_public_vehicle_tracking(uuid,text) from public;
revoke all on function public.get_public_vehicle_tracking_history(uuid,text) from public;
grant execute on function public.get_public_vehicle_tracking(uuid,text) to anon,authenticated;
grant execute on function public.get_public_vehicle_tracking_history(uuid,text) to anon,authenticated;
