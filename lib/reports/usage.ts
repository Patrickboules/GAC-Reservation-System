import { timeToMinutes } from "@/lib/dates";
import type { BookingStatus } from "@/lib/bookings/conflict-check";

export interface UsageReportBooking {
  room_id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

export interface RoomUtilization {
  roomId: string;
  roomName: string;
  hours: number;
  utilizationPct: number;
}

/** Approved-hours-per-room ÷ (schedule-hour span × days in range), per room, sorted busiest first. */
export function computeRoomUtilization(
  bookings: UsageReportBooking[],
  rooms: { id: string; name: string }[],
  dayCount: number,
  scheduleHours: number
): RoomUtilization[] {
  const hoursByRoom = new Map<string, number>();
  for (const booking of bookings) {
    if (booking.status !== "approved") continue;
    const hours = (timeToMinutes(booking.end_time) - timeToMinutes(booking.start_time)) / 60;
    hoursByRoom.set(booking.room_id, (hoursByRoom.get(booking.room_id) ?? 0) + hours);
  }

  const totalRoomHours = dayCount * scheduleHours;

  return rooms
    .map((room) => {
      const hours = hoursByRoom.get(room.id) ?? 0;
      return {
        roomId: room.id,
        roomName: room.name,
        hours,
        utilizationPct: totalRoomHours > 0 ? Math.round((hours / totalRoomHours) * 100) : 0,
      };
    })
    .sort((a, b) => b.utilizationPct - a.utilizationPct);
}

export interface MostActiveMember {
  userId: string;
  name: string;
  requestCount: number;
}

/** Total booking requests (any status) per requester, busiest first. */
export function computeMostActiveMembers(
  bookings: UsageReportBooking[],
  displayNameById: Map<string, string>,
  limit = 5
): MostActiveMember[] {
  const countByUser = new Map<string, number>();
  for (const booking of bookings) {
    countByUser.set(booking.user_id, (countByUser.get(booking.user_id) ?? 0) + 1);
  }

  return [...countByUser.entries()]
    .map(([userId, requestCount]) => ({
      userId,
      name: displayNameById.get(userId) ?? "Unknown member",
      requestCount,
    }))
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, limit);
}

export const HEATMAP_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface PeakHoursRow {
  hour: number;
  counts: number[];
}

/**
 * Approved-booking counts per (weekday, hour) cell, for hours in [startHour, endHour).
 * A booking spanning multiple hours increments every hour cell it overlaps.
 */
export function computePeakHoursHeatmap(
  bookings: UsageReportBooking[],
  startHour: number,
  endHour: number
): PeakHoursRow[] {
  const rows: PeakHoursRow[] = Array.from({ length: endHour - startHour }, (_, i) => ({
    hour: startHour + i,
    counts: Array(7).fill(0) as number[],
  }));

  for (const booking of bookings) {
    if (booking.status !== "approved") continue;
    const weekday = new Date(`${booking.date}T00:00:00`).getDay();
    const startMinutes = timeToMinutes(booking.start_time);
    const endMinutes = timeToMinutes(booking.end_time);

    for (const row of rows) {
      const cellStart = row.hour * 60;
      const cellEnd = cellStart + 60;
      if (startMinutes < cellEnd && endMinutes > cellStart) {
        row.counts[weekday] += 1;
      }
    }
  }

  return rows;
}
