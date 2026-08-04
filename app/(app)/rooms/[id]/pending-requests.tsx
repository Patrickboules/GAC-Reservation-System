import { CheckCircle2 } from "lucide-react";

import { Card } from "@/components/kit/card";
import { EmptyState } from "@/components/kit/empty-state";
import { StatusBadge } from "@/components/kit/status-badge";
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
        {bookings.length > 0 && <StatusBadge status="pending" label={bookings.length} />}
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-6" aria-hidden="true" />}
          tone="approved"
          title="No pending requests"
          className="px-4 py-6"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((booking, i) => (
            <Card key={i} interactive className="flex flex-wrap items-center justify-between gap-3 p-3">
              <span className="flex items-center gap-1.5 text-caption font-medium text-status-pending-fg">
                <span aria-hidden="true" className="size-2 rounded-full bg-current" />
                Pending
              </span>
              <span className="text-small font-semibold text-ink-900">
                {formatTimeLabel(booking.start_time)} → {formatTimeLabel(booking.end_time)}
              </span>
              <StatusBadge status="pending" label="Waiting for Approval" className="whitespace-nowrap" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
