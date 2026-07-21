import type { SupabaseClient } from "@supabase/supabase-js";

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

async function getRoomName(admin: SupabaseClient, roomId: string): Promise<string> {
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
