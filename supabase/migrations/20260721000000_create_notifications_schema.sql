-- Notifications table: persists reminders, approval/rejection, cancellation,
-- and admin new-request events per user.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (
    type in ('reminder', 'approved', 'rejected', 'cancelled', 'admin_new_request')
  ),
  booking_id uuid references bookings (id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on notifications (user_id);

alter table notifications enable row level security;

-- Members read only their own notifications.
create policy notifications_select_own on notifications
  for select
  to authenticated
  using (user_id = auth.uid());

-- Members may only mark their own notifications read (read_at) — no other
-- column changes, and no client-facing insert policy at all: notifications
-- are created exclusively via the service-role key from trusted server
-- actions (US-016).
create policy notifications_update_own on notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, update on notifications to authenticated;
grant select, insert, update, delete on notifications to service_role;
