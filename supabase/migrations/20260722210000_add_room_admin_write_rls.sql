-- Admin-only write access to rooms (US-043 room management CRUD), mirroring
-- bookings_update_admin's pattern: RLS is the enforcement boundary, not the
-- admin-only server actions that call into it.

create policy rooms_insert_admin on rooms
  for insert
  to authenticated
  with check (public.is_admin());

create policy rooms_update_admin on rooms
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy rooms_delete_admin on rooms
  for delete
  to authenticated
  using (public.is_admin());

grant insert, update, delete on rooms to authenticated;
