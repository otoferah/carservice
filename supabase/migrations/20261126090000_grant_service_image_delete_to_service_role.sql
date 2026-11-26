-- Allow the trusted server-side service role to delete service image metadata.
-- Access remains server-only; admin/supervisor authorization is enforced in the DELETE API route.
grant delete on table public.service_images to service_role;
