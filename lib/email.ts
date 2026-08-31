import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

import { formatDateLabel, formatTimeLabel } from "@/lib/dates";
import { getRoomName } from "@/lib/notifications";

export type BookingEmailStatus = "pending" | "approved" | "rejected" | "cancelled";

const STATUS_LABEL: Record<BookingEmailStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// Matches the app's own status color tokens (app/globals.css's
// --color-status-*-fg) so the email palette agrees with the in-app one.
const STATUS_COLOR: Record<BookingEmailStatus, string> = {
  pending: "#9a5f05",
  approved: "#0c7f56",
  rejected: "#b91c1c",
  cancelled: "#636f7c",
};

/** User-facing intro line — this email goes to the requester themselves, not an admin. */
const STATUS_INTRO: Record<BookingEmailStatus, string> = {
  pending: "Your booking request has been received and is now awaiting approval.",
  approved: "Good news — your booking has been approved.",
  rejected: "Your booking has been rejected.",
  cancelled: "Your booking request has been cancelled.",
};

/** Subject prefix per status — paired with "— <Room>, <Date>" for quick
 * recognition in an inbox, rather than a UUID the requester has no use for. */
const STATUS_SUBJECT_PREFIX: Record<BookingEmailStatus, string> = {
  pending: "Your Booking Request Has Been Received",
  approved: "Your Booking Has Been Approved",
  rejected: "Your Booking Has Been Rejected",
  cancelled: "Your Booking Has Been Cancelled",
};

interface BookingStatusEmailParams {
  bookingId: string;
  status: BookingEmailStatus;
  requesterId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Only meaningful for status "rejected"; omitted from the email when null/undefined. */
  rejectReason?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getRequesterInfo(
  admin: SupabaseClient,
  userId: string
): Promise<{ name: string; email: string | null }> {
  const [{ data: profile }, { data: userData }] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", userId).single(),
    admin.auth.admin.getUserById(userId),
  ]);

  const email = userData?.user?.email ?? null;
  return { name: profile?.display_name ?? email ?? "Unknown member", email };
}

function renderEmailHtml(params: {
  status: BookingEmailStatus;
  requesterName: string;
  requesterEmail: string | null;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  rejectReason?: string | null;
}): string {
  const statusLabel = STATUS_LABEL[params.status];
  const statusColor = STATUS_COLOR[params.status];

  const rows: Array<[string, string]> = [
    [
      "Requester",
      `${escapeHtml(params.requesterName)}${
        params.requesterEmail ? ` (${escapeHtml(params.requesterEmail)})` : ""
      }`,
    ],
    ["Room", escapeHtml(params.roomName)],
    ["Date", escapeHtml(formatDateLabel(params.date))],
    ["Time", `${formatTimeLabel(params.startTime)}–${formatTimeLabel(params.endTime)}`],
    ["Status", statusLabel],
  ];
  if (params.status === "rejected" && params.rejectReason) {
    rows.push(["Reason", escapeHtml(params.rejectReason)]);
  }

  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 0;color:#64707d;font-size:13px;width:150px;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:6px 0;color:#1b2430;font-size:13px;vertical-align:top;">${value}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f6f9fe;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9fe;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6ebf1;">
            <tr>
              <td style="background-color:${statusColor};padding:16px 24px;">
                <span style="color:#ffffff;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;">
                  Reservation ${statusLabel}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 16px;color:#1b2430;font-size:14px;line-height:1.5;">
                  ${escapeHtml(STATUS_INTRO[params.status])}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rowsHtml}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Sends the "reservation status changed" email to the booking's own requester
 * (their address is looked up via admin.auth.admin.getUserById — profiles has
 * no email column) — a confirmation/decision notice to the end user, not an
 * admin alert. Mirrors lib/notifications.ts's fire-and-forget pattern: every
 * failure path (missing API key, no email on file, a Resend API error, an
 * unexpected exception) is caught and logged here, never thrown, so a broken
 * email integration can never block or roll back the booking status change
 * that triggered it.
 */
export async function sendBookingStatusEmail(
  admin: SupabaseClient,
  params: BookingStatusEmailParams
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("sendBookingStatusEmail: RESEND_API_KEY is not set, skipping email");
      return;
    }

    const [roomName, requester] = await Promise.all([
      getRoomName(admin, params.roomId),
      getRequesterInfo(admin, params.requesterId),
    ]);

    const to = requester.email;
    if (!to) {
      console.warn(
        `sendBookingStatusEmail: no email on file for requester ${params.requesterId}, skipping email for booking ${params.bookingId}`
      );
      return;
    }

    const subject = `${STATUS_SUBJECT_PREFIX[params.status]} — ${roomName}, ${formatDateLabel(params.date)}`;
    const html = renderEmailHtml({
      status: params.status,
      requesterName: requester.name,
      requesterEmail: requester.email,
      roomName,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      rejectReason: params.rejectReason,
    });

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "GAC Reservations <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`sendBookingStatusEmail: Resend API error for booking ${params.bookingId}`, error);
    }
  } catch (err) {
    console.error(`sendBookingStatusEmail: failed to send email for booking ${params.bookingId}`, err);
  }
}
