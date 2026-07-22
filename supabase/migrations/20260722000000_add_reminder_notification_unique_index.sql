-- Enforces "at most one reminder notification per booking" at the DB level
-- (defense in depth alongside the pre-insert check in lib/notifications.ts).
create unique index notifications_reminder_booking_unique
  on notifications (booking_id)
  where type = 'reminder';
