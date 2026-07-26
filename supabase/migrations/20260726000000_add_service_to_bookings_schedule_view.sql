-- The schedule needs to show each booking's activity/purpose (service) as its
-- primary label. service is a fixed, non-identifying dropdown constant (see
-- lib/bookings/services.ts) — not a member identity and not a free-text note —
-- so exposing it for scheduling is consistent with the "room/time/status only,
-- never identity or notes" boundary the base view was built around.
-- Appending service at the end keeps create-or-replace valid (existing columns
-- unchanged in name, type, and order).
create or replace view public.bookings_schedule
  with (security_invoker = false)
as
select id, room_id, date, start_time, end_time, status, service
from public.bookings
where status in ('pending', 'approved');

grant select on public.bookings_schedule to authenticated;
