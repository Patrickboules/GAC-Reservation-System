import { CheckCircle2 } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { Badge } from "@/components/ui/badge";
import { type BookingStatus } from "@/lib/bookings/conflict-check";
import { formatTimeLabel } from "@/lib/dates";

export interface PendingBooking {
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

/** This room's pending requests today, as a waiting list separate from the
 * availability timeline — a pending request doesn't occupy the room yet, so
 * it shouldn't read as "booked" the way a confirmed reservation does. */
export function PendingRequests({ bookings }: { bookings: PendingBooking[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <p className="text-small font-semibold text-ink-700">Pending Requests</p>
        {bookings.length > 0 && (
          <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-800">
            {bookings.length}
          </Badge>
        )}
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-8 text-status-approved-fg" aria-hidden="true" />}
          title="No pending requests"
          className="px-4 py-6"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((booking, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex items-center gap-1.5 text-caption font-medium text-ink-500">
                <span aria-hidden="true" className="size-2 rounded-full bg-amber-500" />
                Pending
              </span>
              <span className="text-small font-semibold text-ink-900">
                {formatTimeLabel(booking.start_time)} → {formatTimeLabel(booking.end_time)}
              </span>
              <Badge
                variant="outline"
                className="whitespace-nowrap border-amber-200 bg-amber-100 text-amber-800"
              >
                Waiting for Approval
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
