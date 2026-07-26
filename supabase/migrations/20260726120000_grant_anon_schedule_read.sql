-- Public schedule: unauthenticated (anon) visitors must be able to render the
-- schedule and room list without signing in (see
-- tasks/prd-google-auth-public-schedule.md, US-003). This reverses the earlier
-- "entire app requires auth" rule for the schedule surface ONLY.
--
-- What anon gets:
--   * SELECT on the column-limited bookings_schedule view (room/time/status/
--     service only — never user_id, notes, or reject_reason).
--   * SELECT on rooms (the room list the schedule is drawn against).
--
-- What anon must NOT get: base bookings, profiles, favorite_rooms, or
-- notifications. Member identity, notes, and reject reasons stay unreadable to
-- anon. We deliberately grant nothing on those tables here.

-- bookings_schedule is a security_invoker = false view, so it reads the base
-- table with the view owner's privileges; anon only needs the table-level
-- SELECT privilege on the view itself to query it.
grant select on public.bookings_schedule to anon;

-- rooms has RLS enabled, so anon needs both an explicit SELECT policy and the
-- table-level privilege before any query is permitted.
create policy rooms_select_anon on rooms
  for select
  to anon
  using (true);

grant select on rooms to anon;
