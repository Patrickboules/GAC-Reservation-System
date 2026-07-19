-- The bookings RLS policy (bookings_select_own) only lets a member read
-- their own rows, but the schedule view must show every member's pending
-- and approved slots (room/time/status only — never identity or notes).
-- Rather than widen bookings' own SELECT policy, expose a column-limited
-- view. Views run with the owner's privileges by default (security_invoker
-- = false), so this bypasses the base table's RLS for the columns it
-- selects while still excluding user_id, service, notes, and reject_reason.
create view public.bookings_schedule
  with (security_invoker = false)
as
select id, room_id, date, start_time, end_time, status
from public.bookings
where status in ('pending', 'approved');

grant select on public.bookings_schedule to authenticated;
