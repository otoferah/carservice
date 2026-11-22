create extension if not exists pgcrypto;
create type public.app_role as enum ('admin','supervisor','usta','customer');
create type public.service_status as enum ('quote','waiting','repairing','testing','ready','delivered','cancelled');

create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null, role public.app_role not null default 'usta',
 is_active boolean not null default true, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.customers(
 id uuid primary key default gen_random_uuid(), full_name text not null, phone text, email text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.vehicles(
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id),
 plate text not null unique, brand text not null, model text not null, vehicle_year integer,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index vehicles_plate_idx on public.vehicles(upper(regexp_replace(plate,'\\s+','','g')));
create table public.service_records(
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.vehicles(id),
 quote_date date not null default current_date, status public.service_status not null default 'quote',
 quote_total numeric(12,2) not null default 0 check(quote_total>=0), quote_provider text,
 customer_signature_path text, tracking_token uuid not null unique default gen_random_uuid(),
 qr_created_at timestamptz not null default now(), opened_by uuid references public.profiles(id),
 delivered_by uuid references public.profiles(id), delivered_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index service_records_vehicle_idx on public.service_records(vehicle_id,created_at desc);
create index service_records_status_idx on public.service_records(status);
create table public.service_parts(
 id uuid primary key default gen_random_uuid(),
 service_record_id uuid not null references public.service_records(id) on delete cascade,
 part_name text not null, quantity numeric(10,2) not null default 1 check(quantity>0),
 unit_price numeric(12,2) not null default 0 check(unit_price>=0),
 line_total numeric(12,2) generated always as(quantity*unit_price) stored,
 sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table public.service_team(
 id uuid primary key default gen_random_uuid(),
 service_record_id uuid not null references public.service_records(id) on delete cascade,
 profile_id uuid not null references public.profiles(id), assignment_role public.app_role not null,
 assigned_by uuid references public.profiles(id), created_at timestamptz not null default now(),
 unique(service_record_id,profile_id)
);
create table public.service_updates(
 id uuid primary key default gen_random_uuid(),
 service_record_id uuid not null references public.service_records(id) on delete cascade,
 status public.service_status not null, note text not null,
 created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create index service_updates_record_idx on public.service_updates(service_record_id,created_at desc);
create table public.service_images(
 id uuid primary key default gen_random_uuid(),
 service_record_id uuid not null references public.service_records(id) on delete cascade,
 storage_path text not null, caption text, uploaded_by uuid references public.profiles(id),
 created_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and is_active=true $$;
create or replace function public.has_management_role()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_app_role() in ('admin','supervisor'),false) $$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_app_role()='admin',false) $$;

create or replace function public.get_public_vehicle_tracking(p_token uuid default null,p_plate text default null)
returns table(plate text,brand text,model text,status public.service_status,quote_date date,
 updated_at timestamptz,latest_note text,latest_note_at timestamptz)
language sql stable security definer set search_path=public
as $$
 select v.plate,v.brand,v.model,sr.status,sr.quote_date,sr.updated_at,su.note,su.created_at
 from public.service_records sr join public.vehicles v on v.id=sr.vehicle_id
 left join lateral(select s.note,s.created_at from public.service_updates s
  where s.service_record_id=sr.id order by s.created_at desc limit 1) su on true
 where (p_token is not null and sr.tracking_token=p_token)
 or (p_token is null and p_plate is not null
  and upper(regexp_replace(v.plate,'\\s+','','g'))=upper(regexp_replace(p_plate,'\\s+','','g')))
 order by sr.created_at desc limit 1
$$;

create or replace function public.guard_service_status()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='delivered' then
  if not public.has_management_role() then raise exception 'Yalnızca yönetici veya supervisor aracı teslim edebilir.'; end if;
  new.delivered_by:=auth.uid(); new.delivered_at:=now();
 end if;
 new.updated_at:=now(); return new;
end $$;
create trigger service_delivery_guard before update on public.service_records
for each row execute function public.guard_service_status();

create or replace function public.log_service_status()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status is distinct from old.status then
  insert into public.service_updates(service_record_id,status,note,created_by)
  values(new.id,new.status,'Durum güncellendi: '||new.status::text,auth.uid());
 end if;
 return new;
end $$;
create trigger service_status_history after update of status on public.service_records
for each row execute function public.log_service_status();

create or replace function public.create_service_record(
 p_customer_name text,p_phone text,p_email text,p_plate text,p_brand text,p_model text,
 p_quote_date date,p_quote_provider text,p_parts jsonb,p_team uuid[],
 p_photo_paths text[] default '{}',p_signature_path text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare c uuid; v uuid; r uuid; total numeric(12,2); part jsonb; member_id uuid;
begin
 if auth.uid() is null or not public.has_management_role() then raise exception 'Yalnızca yönetici veya supervisor kayıt oluşturabilir.'; end if;
 if nullif(trim(p_customer_name),'') is null or nullif(trim(p_plate),'') is null
  or nullif(trim(p_brand),'') is null or nullif(trim(p_model),'') is null then
  raise exception 'Müşteri, plaka, marka ve model zorunludur.';
 end if;
 insert into public.customers(full_name,phone,email)
 values(trim(p_customer_name),nullif(trim(p_phone),''),nullif(trim(p_email),'')) returning id into c;
 insert into public.vehicles(customer_id,plate,brand,model)
 values(c,upper(trim(p_plate)),trim(p_brand),trim(p_model))
 on conflict(plate) do update set customer_id=excluded.customer_id,brand=excluded.brand,
  model=excluded.model,updated_at=now() returning id into v;
 select coalesce(sum((x->>'quantity')::numeric*(x->>'unit_price')::numeric),0)
 into total from jsonb_array_elements(coalesce(p_parts,'[]'::jsonb)) x;
 insert into public.service_records(vehicle_id,quote_date,status,quote_total,quote_provider,
  customer_signature_path,opened_by)
 values(v,coalesce(p_quote_date,current_date),'waiting',total,p_quote_provider,
  p_signature_path,auth.uid()) returning id into r;
 for part in select * from jsonb_array_elements(coalesce(p_parts,'[]'::jsonb)) loop
  if nullif(trim(part->>'part_name'),'') is not null then
   insert into public.service_parts(service_record_id,part_name,quantity,unit_price,sort_order)
   values(r,trim(part->>'part_name'),coalesce((part->>'quantity')::numeric,1),
    coalesce((part->>'unit_price')::numeric,0),coalesce((part->>'sort_order')::int,0));
  end if;
 end loop;
 foreach member_id in array coalesce(p_team,'{}'::uuid[]) loop
  insert into public.service_team(service_record_id,profile_id,assignment_role,assigned_by)
  select r,id,role,auth.uid() from public.profiles
  where id=member_id and is_active and role in('usta','supervisor','admin')
  on conflict(service_record_id,profile_id) do nothing;
 end loop;
 insert into public.service_updates(service_record_id,status,note,created_by)
 values(r,'waiting','Teklif oluşturuldu; araç servise alındı.',auth.uid());
 foreach part in array coalesce(p_photo_paths,'{}'::text[]) loop
  insert into public.service_images(service_record_id,storage_path,uploaded_by) values(r,part,auth.uid());
 end loop;
 return r;
end $$;

create or replace function public.update_profile_role(
 p_user_id uuid,p_role public.app_role,p_full_name text default null,p_active boolean default true
) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Yalnızca yönetici kullanıcı ve rol yönetebilir.'; end if;
 update public.profiles set role=p_role,full_name=coalesce(p_full_name,full_name),
  is_active=p_active,updated_at=now() where id=p_user_id;
 if not found then raise exception 'Kullanıcı profili bulunamadı.'; end if;
end $$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.service_records enable row level security;
alter table public.service_parts enable row level security;
alter table public.service_team enable row level security;
alter table public.service_updates enable row level security;
alter table public.service_images enable row level security;

create policy "profiles read staff" on public.profiles for select to authenticated
 using(public.current_app_role() in('admin','supervisor') or id=auth.uid());
create policy "profiles admin manage" on public.profiles for all to authenticated
 using(public.is_admin()) with check(public.is_admin());
create policy "customers staff read" on public.customers for select to authenticated
 using(public.current_app_role() in('admin','supervisor','usta'));
create policy "customers managers write" on public.customers for all to authenticated
 using(public.has_management_role()) with check(public.has_management_role());
create policy "vehicles staff read" on public.vehicles for select to authenticated
 using(public.current_app_role() in('admin','supervisor','usta'));
create policy "vehicles managers write" on public.vehicles for all to authenticated
 using(public.has_management_role()) with check(public.has_management_role());
create policy "records staff read" on public.service_records for select to authenticated
 using(public.current_app_role() in('admin','supervisor','usta'));
create policy "records manager insert" on public.service_records for insert to authenticated
 with check(public.has_management_role());
create policy "records manager update" on public.service_records for update to authenticated
 using(public.has_management_role()) with check(public.has_management_role());
create policy "parts staff read" on public.service_parts for select to authenticated
 using(public.current_app_role() in('admin','supervisor','usta'));
create policy "parts manager write" on public.service_parts for all to authenticated
 using(public.has_management_role()) with check(public.has_management_role());
create policy "team staff read" on public.service_team for select to authenticated
 using(public.current_app_role() in('admin','supervisor','usta'));
create policy "team managers manage" on public.service_team for all to authenticated
 using(public.has_management_role()) with check(public.has_management_role());
create policy "updates staff read" on public.service_updates for select to authenticated
 using(public.current_app_role() in('admin','supervisor','usta'));
create policy "updates assigned staff insert" on public.service_updates for insert to authenticated
 with check((created_by=auth.uid() and exists(select 1 from public.service_team st
  where st.service_record_id=service_updates.service_record_id and st.profile_id=auth.uid()))
  or public.has_management_role());
create policy "images staff read" on public.service_images for select to authenticated
 using(public.current_app_role() in('admin','supervisor','usta'));
create policy "images staff upload" on public.service_images for insert to authenticated
 with check(uploaded_by=auth.uid() and public.current_app_role() in('admin','supervisor','usta'));

grant usage on schema public to authenticated,anon;
grant select on public.profiles,public.customers,public.vehicles,public.service_records,
 public.service_parts,public.service_team,public.service_updates,public.service_images to authenticated;
grant insert,update,delete on public.profiles,public.customers,public.vehicles,
 public.service_records,public.service_parts,public.service_team,public.service_updates,public.service_images to authenticated;
grant execute on function public.get_public_vehicle_tracking(uuid,text) to anon,authenticated;
grant execute on function public.create_service_record(text,text,text,text,text,text,date,text,jsonb,uuid[],text[],text) to authenticated;
grant execute on function public.update_profile_role(uuid,public.app_role,text,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('service-media','service-media',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;
create policy "service media staff read" on storage.objects for select to authenticated
 using(bucket_id='service-media' and public.current_app_role() in('admin','supervisor','usta'));
create policy "service media staff upload" on storage.objects for insert to authenticated
 with check(bucket_id='service-media' and public.current_app_role() in('admin','supervisor','usta'));
