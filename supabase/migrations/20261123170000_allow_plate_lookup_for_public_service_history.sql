-- Allow public service history lookup by either QR token or normalized plate.
create or replace function public.get_public_vehicle_tracking_history(
  p_token uuid default null,
  p_plate text default null
)
returns table(
  plate text,
  brand text,
  model text,
  current_status public.service_status,
  quote_date date,
  record_updated_at timestamptz,
  note text,
  note_status public.service_status,
  note_created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with selected as (
    select sr.id, sr.vehicle_id, sr.status, sr.quote_date, sr.updated_at, sr.created_at
    from public.service_records sr
    join public.vehicles v on v.id = sr.vehicle_id
    where
      (p_token is not null and sr.tracking_token = p_token)
      or (
        p_token is null
        and p_plate is not null
        and upper(regexp_replace(v.plate, '[^A-Za-z0-9]', '', 'g')) =
            upper(regexp_replace(p_plate, '[^A-Za-z0-9]', '', 'g'))
      )
    order by sr.created_at desc
    limit 1
  )
  select
    v.plate, v.brand, v.model, s.status, s.quote_date, s.updated_at,
    u.note, u.status, u.created_at
  from selected s
  join public.vehicles v on v.id = s.vehicle_id
  left join public.service_updates u on u.service_record_id = s.id
  order by u.created_at asc, u.id asc;
$$;

grant execute on function public.get_public_vehicle_tracking_history(uuid, text) to anon, authenticated;
