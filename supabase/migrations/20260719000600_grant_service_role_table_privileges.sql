-- service_role bypasses RLS (rolbypassrls) but, like `authenticated` in the
-- US-007 grant migration, still needs explicit table-level privileges:
-- Postgres's default ACL for objects created by the `postgres` role only
-- grants Dxtm (no select/insert/update/delete) to service_role. Without
-- this, any server-side use of the service-role client (admin scripts,
-- background jobs) fails with "permission denied for table" despite RLS
-- allowing it.
grant select, insert, update, delete on rooms to service_role;
grant select, insert, update, delete on bookings to service_role;
grant select, insert, update, delete on profiles to service_role;
