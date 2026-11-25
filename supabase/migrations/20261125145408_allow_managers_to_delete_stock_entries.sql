-- Allow managers to permanently delete stock purchase batches.
-- The part_installations foreign key intentionally prevents deletion of a batch
-- that has already been used in a service record, preserving service history.
create policy "managers delete part stock"
on public.part_stock_entries
for delete
to authenticated
using (public.has_management_role());

grant delete on public.part_stock_entries to authenticated;
