-- Adds structured building/floor/room_type facets to rooms so the schedule's
-- room filter bar (US-032) can filter/group beyond the existing free-text
-- `location` field. Additive and nullable; existing rows are best-effort
-- backfilled by splitting the existing "<building>, <floor>" location text.
alter table rooms
  add column building text,
  add column floor text,
  add column room_type text;

update rooms
set
  building = nullif(trim(split_part(location, ',', 1)), ''),
  floor = nullif(trim(split_part(location, ',', 2)), '')
where location is not null
  and building is null;
