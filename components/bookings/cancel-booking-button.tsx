"use client";

import * as React from "react";

import { cancelBooking } from "@/app/(app)/bookings/actions";
import { Button } from "@/components/kit/button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/components/kit/modal";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Cancel
      </Button>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Cancel this booking?</ModalTitle>
          <ModalDescription>
            This frees up the slot immediately and can&apos;t be undone.
          </ModalDescription>
        </ModalHeader>
        <form action={cancelBooking}>
          <input type="hidden" name="booking_id" value={bookingId} />
          <ModalFooter>
            <ModalClose render={<Button variant="secondary">Keep booking</Button>} />
            <Button type="submit" variant="danger">
              Cancel booking
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
