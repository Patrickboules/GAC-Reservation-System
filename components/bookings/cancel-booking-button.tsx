"use client";

import { cancelBooking } from "@/app/bookings/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm">Cancel</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            This frees up the slot immediately and can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={cancelBooking}>
          <input type="hidden" name="booking_id" value={bookingId} />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction type="submit" variant="destructive">
              Cancel booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
