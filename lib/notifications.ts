import type { SupabaseClient } from "@supabase/supabase-js";

import { addDays, parseDateString, todayDateString } from "./dates";

export type NotificationType =
  | "reminder"
  | "approved"
  | "rejected"
  | "cancelled"
  | "admin_new_request";

export interface BookingSlotSummary {
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
}

function formatSlot(slot: BookingSlotSummary): string {
  return `${slot.roomName} on ${slot.date} from ${slot.startTime}–${slot.endTime}`;
}

export function formatApprovedMessage(slot: BookingSlotSummary): string {
  return `Your booking for ${formatSlot(slot)} was approved.`;
}

export function formatRejectedMessage(slot: BookingSlotSummary, reason: string | null): string {
  const suffix = reason ? ` Reason: ${reason}` : "";
  return `Your booking for ${formatSlot(slot)} was rejected.${suffix}`;
}

export function formatCancelledMessage(slot: BookingSlotSummary): string {
  return `Your booking for ${formatSlot(slot)} was cancelled.`;
}

export function formatAdminNewRequestMessage(slot: BookingSlotSummary, requesterName: string): string {
  return `${requesterName} requested ${formatSlot(slot)}.`;
}

export function formatReminderMessage(slot: BookingSlotSummary): string {
  return `Reminder: your booking for ${formatSlot(slot)} starts soon.`;
}

export interface NotificationListItem {
  id: string;
  type: NotificationType;
  message: string;
  bookingId: string | null;
  readAt: string | null;
  createdAt: string;
}

const RECENT_NOTIFICATIONS_LIMIT = 10;

/** Fetches the caller's most recent notifications plus their total unread
 * count, using the caller's own session client (RLS-scoped to their rows). */
export async function getRecentNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<{ notifications: NotificationListItem[]; unreadCount: number }> {
  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, message, booking_id, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_NOTIFICATIONS_LIMIT),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);

  const notifications: NotificationListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    message: row.message,
    bookingId: row.booking_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));

  return { notifications, unreadCount: count ?? 0 };
}

interface NotifyBookingParams {
  bookingId: string;
  userId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export async function getRoomName(admin: SupabaseClient, roomId: string): Promise<string> {
  const { data } = await admin.from("rooms").select("name").eq("id", roomId).single();
  return data?.name ?? "the room";
}

async function insertNotification(
  admin: SupabaseClient,
  row: { user_id: string; type: NotificationType; booking_id: string | null; message: string }
): Promise<void> {
  const { error } = await admin.from("notifications").insert(row);
  if (error) {
    console.error(`Failed to insert ${row.type} notification for booking ${row.booking_id}`, error);
  }
}

/** Inserts an 'approved' notification for the booking's requester. Fire-and-forget: logs on failure rather than throwing, so a notification hiccup never blocks the underlying approve action. */
export async function notifyBookingApproved(
  admin: SupabaseClient,
  params: NotifyBookingParams
): Promise<void> {
  const roomName = await getRoomName(admin, params.roomId);
  const message = formatApprovedMessage({
    roomName,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
  });
  await insertNotification(admin, {
    user_id: params.userId,
    type: "approved",
    booking_id: params.bookingId,
    message,
  });
}

/** Inserts a 'rejected' notification (including the reject reason) for the booking's requester. */
export async function notifyBookingRejected(
  admin: SupabaseClient,
  params: NotifyBookingParams & { reason: string | null }
): Promise<void> {
  const roomName = await getRoomName(admin, params.roomId);
  const message = formatRejectedMessage(
    { roomName, date: params.date, startTime: params.startTime, endTime: params.endTime },
    params.reason
  );
  await insertNotification(admin, {
    user_id: params.userId,
    type: "rejected",
    booking_id: params.bookingId,
    message,
  });
}

/** Inserts a 'cancelled' notification for the booking's requester. */
export async function notifyBookingCancelled(
  admin: SupabaseClient,
  params: NotifyBookingParams
): Promise<void> {
  const roomName = await getRoomName(admin, params.roomId);
  const message = formatCancelledMessage({
    roomName,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
  });
  await insertNotification(admin, {
    user_id: params.userId,
    type: "cancelled",
    booking_id: params.bookingId,
    message,
  });
}

/** Inserts an 'admin_new_request' notification for every profile with role='admin'. */
export async function notifyAdminsNewRequest(
  admin: SupabaseClient,
  params: {
    bookingId: string;
    requesterId: string;
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
  }
): Promise<void> {
  const [{ data: room }, { data: requester }, { data: admins }] = await Promise.all([
    admin.from("rooms").select("name").eq("id", params.roomId).single(),
    admin.from("profiles").select("display_name").eq("id", params.requesterId).single(),
    admin.from("profiles").select("id").eq("role", "admin"),
  ]);

  if (!admins || admins.length === 0) return;

  const message = formatAdminNewRequestMessage(
    {
      roomName: room?.name ?? "the room",
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
    },
    requester?.display_name ?? "A member"
  );

  const { error } = await admin.from("notifications").insert(
    admins.map((a) => ({
      user_id: a.id,
      type: "admin_new_request" as const,
      booking_id: params.bookingId,
      message,
    }))
  );
  if (error) {
    console.error(`Failed to insert admin_new_request notifications for booking ${params.bookingId}`, error);
  }
}

const REMINDER_LEAD_HOURS = 24;
const POSTGRES_UNIQUE_VIOLATION = "23505";

interface ApprovedBookingRow {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

function startsWithinReminderWindow(date: string, startTime: string, now: Date): boolean {
  const [hour, minute, second] = startTime.split(":").map(Number);
  const start = parseDateString(date);
  start.setHours(hour, minute, second ?? 0, 0);
  const diffMs = start.getTime() - now.getTime();
  return diffMs > 0 && diffMs <= REMINDER_LEAD_HOURS * 60 * 60 * 1000;
}

/** On-demand check (no scheduling infrastructure, per PRD): finds the given
 * user's approved bookings starting within the next 24h that don't yet have a
 * reminder notification, and inserts one each. Safe to call on every
 * notifications-panel/dashboard fetch — a booking is only ever reminded once,
 * enforced here and by a partial unique index on (booking_id) where
 * type = 'reminder'. */
export async function ensureReminderNotifications(admin: SupabaseClient, userId: string): Promise<void> {
  const today = todayDateString();
  const tomorrow = addDays(today, 1);

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, room_id, date, start_time, end_time")
    .eq("user_id", userId)
    .eq("status", "approved")
    .gte("date", today)
    .lte("date", tomorrow);

  const now = new Date();
  const upcoming = ((bookings ?? []) as ApprovedBookingRow[]).filter((b) =>
    startsWithinReminderWindow(b.date, b.start_time, now)
  );
  if (upcoming.length === 0) return;

  const { data: existing } = await admin
    .from("notifications")
    .select("booking_id")
    .eq("type", "reminder")
    .in(
      "booking_id",
      upcoming.map((b) => b.id)
    );

  const alreadyReminded = new Set(((existing ?? []) as { booking_id: string }[]).map((n) => n.booking_id));
  const toRemind = upcoming.filter((b) => !alreadyReminded.has(b.id));
  if (toRemind.length === 0) return;

  const rows = await Promise.all(
    toRemind.map(async (b) => {
      const roomName = await getRoomName(admin, b.room_id);
      return {
        user_id: userId,
        type: "reminder" as const,
        booking_id: b.id,
        message: formatReminderMessage({
          roomName,
          date: b.date,
          startTime: b.start_time,
          endTime: b.end_time,
        }),
      };
    })
  );

  const { error } = await admin.from("notifications").insert(rows);
  if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) {
    console.error(`Failed to insert reminder notifications for user ${userId}`, error);
  }
}
