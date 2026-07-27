"use client";

import * as React from "react";

import { cancelBooking, type CancelBookingState } from "@/app/(app)/bookings/actions";
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

const initialState: CancelBookingState = {};

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = React.useActionState(cancelBooking, initialState);

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
        {/* The action is invoked directly rather than relying on a native submit
            inside the dialog's portal, and any refusal is shown here instead of
            navigating away with an error in the query string. */}
        {state.error && (
          <p role="alert" className="text-small font-medium text-status-rejected-fg">
            {state.error}
          </p>
        )}
        <ModalFooter>
          <ModalClose render={<Button variant="secondary" type="button">Keep booking</Button>} />
          <Button
            type="button"
            variant="danger"
            loading={pending}
            disabled={pending}
            onClick={() => {
              const formData = new FormData();
              formData.set("booking_id", bookingId);
              React.startTransition(() => formAction(formData));
            }}
          >
            Cancel booking
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
