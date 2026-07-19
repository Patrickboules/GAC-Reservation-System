-- Admins need to read every member's bookings and profiles to run the
-- approval queue (requester name, room, date/time, service). The existing
-- bookings/profiles select policies only let a user read their own rows;
-- add admin-only select policies alongside them (multiple permissive
-- policies for the same command are OR'd together).

create policy bookings_select_admin on bookings
  for select
  to authenticated
  using (public.is_admin());

create policy profiles_select_admin on profiles
  for select
  to authenticated
  using (public.is_admin());
