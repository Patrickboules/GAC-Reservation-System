-- Narrow bookings_no_overlap (20260823000000) to approved-only bookings.
--
-- Product decision: two pending requests for the same slot are allowed to
-- coexist — members see a warning, not a hard block — since only one can
-- ever be approved and the admin decides which. Only an already-approved
-- booking should make a slot truly unavailable, so that's the only status
-- the exclusion constraint (and the app-level BLOCKING_STATUSES check in
-- lib/bookings/conflict-check.ts) still enforces.
--
-- The original constraint already forbade any pending/approved overlap, so
-- no approved-approved overlap can currently exist in the table. The guard
-- below is defensive only, in case this runs on a database where the
-- previous migration was never applied.
do $$
declare
  overlap_count integer;
begin
  select count(*) into overlap_count
  from public.bookings b1
  join public.bookings b2
    on b1.room_id = b2.room_id
    and b1.id < b2.id
    and b1.status = 'approved'
    and b2.status = 'approved'
    and tsrange(b1.date + b1.start_time, b1.date + b1.end_time)
        && tsrange(b2.date + b2.start_time, b2.date + b2.end_time);

  if overlap_count > 0 then
    raise exception
      'Cannot narrow bookings_no_overlap: % pre-existing overlapping approved booking pair(s) found. Resolve them before re-running this migration.',
      overlap_count;
  end if;
end $$;

alter table public.bookings
  drop constraint if exists bookings_no_overlap;

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    room_id with =,
    tsrange(date + start_time, date + end_time) with &&
  )
  where (status = 'approved');
