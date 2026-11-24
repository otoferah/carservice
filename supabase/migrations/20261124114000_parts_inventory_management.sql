create table public.part_stock_entries (
 id uuid primary key default gen_random_uuid(),
 supplier_name text not null check (length(trim(supplier_name)) > 0),
 part_name text not null check (length(trim(part_name)) > 0),
 part_number text,
 quantity_received numeric(12,2) not null check (quantity_received > 0),
 quantity_available numeric(12,2) not null check (quantity_available >= 0 and quantity_available <= quantity_received),
 supplier_unit_price numeric(12,2) not null check (supplier_unit_price >= 0),
 supply_cost_total numeric(12,2) not null default 0 check (supply_cost_total >= 0),
 unit_landed_cost numeric(12,2) generated always as
   (supplier_unit_price + (supply_cost_total / quantity_received)) stored,
 purchase_date date not null default current_date,
 notes text,
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index part_stock_entries_available_idx on public.part_stock_entries(part_name, purchase_date desc) where quantity_available > 0;
create index part_stock_entries_supplier_idx on public.part_stock_entries(supplier_name, purchase_date desc);
create table public.part_installations (
 id uuid primary key default gen_random_uuid(),
 stock_entry_id uuid not null references public.part_stock_entries(id),
 service_record_id uuid not null references public.service_records(id),
 supplier_name text not null,
 part_name text not null,
 quantity numeric(12,2) not null check (quantity > 0),
 supplier_unit_price numeric(12,2) not null check (supplier_unit_price >= 0),
 supply_cost_per_unit numeric(12,2) not null check (supply_cost_per_unit >= 0),
 unit_landed_cost numeric(12,2) not null check (unit_landed_cost >= 0),
 installed_by uuid references public.profiles(id),
 installed_at timestamptz not null default now()
);
create index part_installations_service_idx on public.part_installations(service_record_id, installed_at desc);
create index part_installations_stock_idx on public.part_installations(stock_entry_id);
alter table public.part_stock_entries enable row level security;
alter table public.part_installations enable row level security;
create policy "managers read part stock" on public.part_stock_entries for select to authenticated using (public.has_management_role());
create policy "managers add part stock" on public.part_stock_entries for insert to authenticated with check (public.has_management_role() and created_by = auth.uid());
create policy "managers update part stock" on public.part_stock_entries for update to authenticated using (public.has_management_role()) with check (public.has_management_role());
create policy "staff read installed parts" on public.part_installations for select to authenticated using (public.current_app_role() in ('admin','supervisor','usta'));
create policy "managers install stock parts" on public.part_installations for insert to authenticated with check (public.has_management_role() and installed_by = auth.uid());
grant select, insert, update on public.part_stock_entries to authenticated;
grant select, insert on public.part_installations to authenticated;
create or replace function public.install_part_from_stock(p_stock_entry_id uuid,p_service_record_id uuid,p_quantity numeric)
returns uuid language plpgsql set search_path = public as $$
declare stock_row public.part_stock_entries%rowtype; installation_id uuid;
begin
 if auth.uid() is null or not public.has_management_role() then raise exception 'Depodan parça çıkışı yalnızca yönetici veya supervisor tarafından yapılabilir.'; end if;
 if p_quantity is null or p_quantity <= 0 then raise exception 'Takılacak parça adedi sıfırdan büyük olmalıdır.'; end if;
 if not exists (select 1 from public.service_records where id=p_service_record_id and status <> 'cancelled') then raise exception 'Geçerli ve iptal edilmemiş bir servis kaydı seçin.'; end if;
 update public.part_stock_entries set quantity_available=quantity_available-p_quantity,updated_at=now()
 where id=p_stock_entry_id and quantity_available>=p_quantity returning * into stock_row;
 if not found then raise exception 'Yetersiz stok veya bulunamayan parça kaydı.'; end if;
 insert into public.part_installations(stock_entry_id,service_record_id,supplier_name,part_name,quantity,supplier_unit_price,supply_cost_per_unit,unit_landed_cost,installed_by)
 values(stock_row.id,p_service_record_id,stock_row.supplier_name,stock_row.part_name,p_quantity,stock_row.supplier_unit_price,stock_row.supply_cost_total/stock_row.quantity_received,stock_row.unit_landed_cost,auth.uid())
 returning id into installation_id;
 return installation_id;
end; $$;
grant execute on function public.install_part_from_stock(uuid,uuid,numeric) to authenticated;
