-- Groups the N independent booking rows created by a single collective
-- (multi-subroom) submission into one atomically-managed "reservation": every
-- row created together shares a group_id, and application code (not a DB
-- constraint) is responsible for always writing status/date/time/service/notes
-- identically across every row sharing a group_id, and for transitioning them
-- together. A standalone single-room booking is simply a group of one — the
-- volatile default gives every existing/new row its own unique group_id
-- unless a caller explicitly shares one value across a batch insert.
alter table public.bookings
  add column group_id uuid not null default gen_random_uuid();

create index bookings_group_id_idx on public.bookings (group_id);
