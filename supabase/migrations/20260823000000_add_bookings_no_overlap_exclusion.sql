-- Close the double-booking race condition: application-level conflict
-- checking (lib/bookings/conflict-check.ts) is check-then-act across separate
-- round-trips (SELECT booking -> SELECT conflicts -> UPDATE/INSERT), so two
-- concurrent requests/approvals for the same room can both pass the conflict
-- check before either write lands, producing two simultaneously
-- pending/approved bookings that overlap in time. This constraint makes that
-- impossible at the database layer regardless of what the application does.
--
-- btree_gist supplies a GiST-compatible equality operator class for room_id
-- (uuid) — GiST has no built-in support for plain equality on scalar types.
-- The time range is built from `date + start_time` / `date + end_time`,
-- which Postgres promotes to `timestamp` automatically (both immutable
-- operations, safe to use in an index expression).
create extension if not exists btree_gist;

-- Guard the constraint add: if pending/approved bookings already overlap
-- (only possible if they were created before this migration, since the app's
-- own conflict check should have blocked them), adding the constraint below
-- would fail with an opaque "conflicting key value" error during index
-- build. Fail loudly with a clear count instead, so whoever runs this
-- migration knows to resolve the conflicting rows (cancel/reject one side of
-- each pair) before re-running it.
do $$
declare
  overlap_count integer;
begin
  select count(*) into overlap_count
  from public.bookings b1
  join public.bookings b2
    on b1.room_id = b2.room_id
    and b1.id < b2.id
    and b1.status in ('pending', 'approved')
    and b2.status in ('pending', 'approved')
    and tsrange(b1.date + b1.start_time, b1.date + b1.end_time)
        && tsrange(b2.date + b2.start_time, b2.date + b2.end_time);

  if overlap_count > 0 then
    raise exception
      'Cannot add bookings_no_overlap: % pre-existing overlapping pending/approved booking pair(s) found. Resolve them (cancel/reject one side of each pair) before re-running this migration.',
      overlap_count;
  end if;
end $$;

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    room_id with =,
    tsrange(date + start_time, date + end_time) with &&
  )
  where (status in ('pending', 'approved'));
