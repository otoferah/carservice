-- Public plate lookups must include delivered service records too.
-- Normalize plates by removing all non-alphanumeric characters so spacing/punctuation
-- differences do not prevent a match. QR-token lookups keep their existing behavior.

create or replace function public.get_public_vehicle_tracking(
  p_token uuid default null,
  p_plate text default null
)
returns table(
  plate text,
  brand text,
  model text,
  status public.service_status,
  quote_date date,
  updated_at timestamptz,
  latest_note text,
  latest_note_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.plate,
    v.brand,
    v.model,
    sr.status,
    sr.quote_date,
    sr.updated_at,
    case when p_token is not null then su.note else null end,
    case when p_token is not null then su.created_at else null end
  from public.service_records sr
  join public.vehicles v on v.id = sr.vehicle_id
  left join lateral (
    select u.note, u.created_at
    from public.service_updates u
    where u.service_record_id = sr.id
    order by u.created_at desc, u.id desc
    limit 1
  ) su on true
  where
    (p_token is not null and sr.tracking_token = p_token)
    or (
      p_token is null
      and p_plate is not null
      and upper(regexp_replace(v.plate, '[^A-Za-z0-9]', '', 'g')) =
          upper(regexp_replace(p_plate, '[^A-Za-z0-9]', '', 'g'))
    )
  order by sr.created_at desc
  limit 1;
$$;

grant execute on function public.get_public_vehicle_tracking(uuid, text) to anon, authenticated;
