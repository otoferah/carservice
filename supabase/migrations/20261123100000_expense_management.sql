create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(),
 description text not null check (length(trim(description)) > 0),
 category text not null default 'Genel',
 amount numeric(12,2) not null check (amount > 0),
 expense_date date not null default current_date,
 notes text,
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses(expense_date desc, created_at desc);
alter table public.expenses enable row level security;
drop policy if exists "managers manage expenses" on public.expenses;
create policy "managers manage expenses" on public.expenses for all to authenticated
 using (public.current_app_role() in ('admin','supervisor'))
 with check (public.current_app_role() in ('admin','supervisor'));
grant select, insert, update, delete on public.expenses to authenticated;
grant usage on schema public to authenticated;
