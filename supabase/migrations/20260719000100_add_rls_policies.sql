-- Row-Level Security policies for rooms, bookings, and profiles.
-- RLS is the real enforcement boundary; the service-role key (which bypasses
-- RLS entirely) must stay server-only and is not relied on here.

alter table rooms enable row level security;
alter table bookings enable row level security;
alter table profiles enable row level security;

-- Security-definer helper so bookings/profiles policies can check the
-- caller's admin status without recursing into profiles' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- rooms: any authenticated user may read; no member insert/update/delete
-- (only the service-role key, which bypasses RLS, manages rooms in v1).
create policy rooms_select_authenticated on rooms
  for select
  to authenticated
  using (true);

-- bookings: members see/update only their own rows.
create policy bookings_select_own on bookings
  for select
  to authenticated
  using (user_id = auth.uid());

create policy bookings_insert_own_pending on bookings
  for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- Members may update their own rows but can never set status to
-- approved/rejected themselves.
create policy bookings_update_own on bookings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status not in ('approved', 'rejected'));

-- Only admins may transition a booking to approved/rejected (or otherwise
-- update any booking row).
create policy bookings_update_admin on bookings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- profiles: a user may read/update only their own row.
create policy profiles_select_own on profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_update_own on profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- role is not self-service editable: block any change to role unless made
-- by the service-role key (used for trusted server-side admin promotion).
create or replace function public.prevent_profile_role_self_update()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'role is not self-service editable';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_self_update
  before update on profiles
  for each row
  execute function public.prevent_profile_role_self_update();
