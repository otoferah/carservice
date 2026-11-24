alter table public.service_images
  add column if not exists google_drive_file_id text,
  add column if not exists google_drive_web_view_link text,
  add column if not exists google_drive_synced_at timestamptz,
  add column if not exists google_drive_sync_error text;

comment on column public.service_images.google_drive_file_id is
  'Google Drive copy of the original service image; the Supabase Storage object remains the source of truth.';
