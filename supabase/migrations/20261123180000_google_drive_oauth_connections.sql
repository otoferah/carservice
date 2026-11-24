create table if not exists public.google_drive_connections (
  id smallint primary key default 1 check (id = 1),
  access_token text,
  refresh_token text not null,
  token_type text,
  scope text,
  expires_at timestamptz,
  drive_folder_id text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_drive_connections enable row level security;

revoke all on table public.google_drive_connections from public, anon, authenticated;
grant all on table public.google_drive_connections to service_role;

comment on table public.google_drive_connections is
  'Private server-only Google Drive OAuth credentials for the single Ferah Otomotiv Drive connection. No client policies are defined.';
