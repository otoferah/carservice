-- Preserve the customer attached to each individual service visit.
-- QR tracking remains a per-service UUID; registration plates are not unique identifiers for customer data.
alter table public.service_records add column if not exists customer_id uuid references public.customers(id);
update public.service_records sr set customer_id=v.customer_id from public.vehicles v where v.id=sr.vehicle_id and sr.customer_id is null;
alter table public.service_records alter column customer_id set not null;
create index if not exists service_records_customer_idx on public.service_records(customer_id,created_at desc);

-- A plate lookup is intentionally less privileged than a per-service QR link.
-- Never expose updates, quotations, customer identity, or vehicle history from a guessable plate.
create or replace function public.get_public_vehicle_tracking(p_token uuid default null,p_plate text default null)
returns table(plate text,brand text,model text,status public.service_status,quote_date date,updated_at timestamptz,latest_note text,latest_note_at timestamptz)
language sql stable security definer set search_path=public as $$
 select v.plate,v.brand,v.model,sr.status,sr.quote_date,sr.updated_at,
  case when p_token is not null then su.note else null end,
  case when p_token is not null then su.created_at else null end
 from public.service_records sr join public.vehicles v on v.id=sr.vehicle_id
 left join lateral(select u.note,u.created_at from public.service_updates u where u.service_record_id=sr.id order by u.created_at desc,u.id desc limit 1) su on true
 where (p_token is not null and sr.tracking_token=p_token)
  or (p_token is null and p_plate is not null and sr.status not in ('delivered','cancelled')
   and upper(regexp_replace(v.plate,'\\s+','','g'))=upper(regexp_replace(p_plate,'\\s+','','g')))
 order by sr.created_at desc limit 1
$$;

-- Restrict full progress timeline to the unique QR token. A plate is easy to guess.
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
 from selected s join public.vehicles v on v.id=s.vehicle_id
 left join public.service_updates u on u.service_record_id=s.id
 order by u.created_at asc,u.id asc
$$;
grant execute on function public.get_public_vehicle_tracking(uuid,text) to anon,authenticated;
grant execute on function public.get_public_vehicle_tracking_history(uuid,text) to anon,authenticated;

-- Do not allow a work-order note to move the vehicle out of ready/delivered or skip delivery checks.
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
 values(p_service_record_id,p_status,coalesce(nullif(trim(p_note),''),'Servis gelişmesi kaydedildi.'),auth.uid(),clock_timestamp())
 returning id into new_id;
 return new_id;
end $$;
grant execute on function public.append_service_update(uuid,public.service_status,text) to authenticated;
