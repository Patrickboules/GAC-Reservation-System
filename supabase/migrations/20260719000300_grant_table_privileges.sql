-- RLS policies restrict rows, but Postgres also requires base table-level
-- privileges before a role can run a statement at all. The earlier RLS
-- migration enabled RLS and added policies but never granted the
-- `authenticated` role privileges on the tables themselves, so every
-- policy-permitted query still failed with "permission denied for table".
grant select on rooms to authenticated;
grant select, update on profiles to authenticated;
grant select, insert, update on bookings to authenticated;
