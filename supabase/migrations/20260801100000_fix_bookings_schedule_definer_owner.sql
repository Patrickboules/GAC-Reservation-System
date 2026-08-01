-- The public schedule rendered empty for every visitor. bookings_schedule
-- returns rows to service_role (which bypasses RLS) but an empty set — not a
-- permission error — to anon and authenticated.
--
-- Either way the row was being filtered by bookings' RLS, whose policies
-- (bookings_select_own, bookings_select_admin) are scoped `to authenticated` and
-- match nothing for anon. Two things can put the view in that position, and
-- without direct catalog access we could not tell which applied here, so this
-- migration closes both:
--
--   1. security_invoker was true, so the view read as the caller.
--   2. The view read as its owner, but that owner was not bookings' owner.
--      A definer view only bypasses the base table's RLS when its owner is also
--      the table's owner — Postgres exempts a table owner from that table's own
--      RLS unless FORCE ROW LEVEL SECURITY is set, which bookings does not set.
--
-- Hence both the explicit security_invoker = false and pinning the view's owner
-- to whoever owns bookings, looked up rather than assumed by role name.
--
-- This widens nothing. The view still exposes only room/time/status/service for
-- pending and approved rows, and base bookings keeps its own grants and policies,
-- so user_id, notes, and reject_reason stay unreadable.

create or replace view public.bookings_schedule
  with (security_invoker = false)
as
select id, room_id, date, start_time, end_time, status, service
from public.bookings
where status in ('pending', 'approved');

do $$
declare
  bookings_owner text;
begin
  select pg_get_userbyid(c.relowner)
    into bookings_owner
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'bookings';

  execute format('alter view public.bookings_schedule owner to %I', bookings_owner);
end
$$;

grant select on public.bookings_schedule to anon, authenticated;