"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Single responsive dialog primitive: renders as a centered modal (>=768px)
 * and a bottom sheet with a drag handle below that. Used for confirm, form,
 * and detail dialogs alike (see prd_plans/UI-Redesign-Spec.md 3.2).
 */
function Modal(props: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root data-slot="modal" {...props} />
}

function ModalTrigger(props: React.ComponentProps<typeof Dialog.Trigger>) {
  return <Dialog.Trigger data-slot="modal-trigger" {...props} />
}

function ModalClose(props: React.ComponentProps<typeof Dialog.Close>) {
  return <Dialog.Close data-slot="modal-close" {...props} />
}

interface ModalContentProps extends React.ComponentProps<typeof Dialog.Popup> {
  /** Renders a top-right close button. Defaults to true. */
  showClose?: boolean
}

function ModalContent({
  className,
  children,
  showClose = true,
  ...props
}: ModalContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop
        data-slot="modal-backdrop"
        className={cn(
          "fixed inset-0 z-50 bg-[rgba(16,32,64,.32)] transition-opacity duration-[220ms] ease-out",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
        )}
      />
      <Dialog.Popup
        data-slot="modal-content"
        className={cn(
          // mobile: bottom sheet, slides up from the bottom edge
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-lg border-t border-line bg-surface p-4 shadow-lg outline-none",
          "transition-all duration-[220ms] ease-out",
          "data-[starting-style]:translate-y-full data-[starting-style]:opacity-0",
          "data-[ending-style]:translate-y-full data-[ending-style]:opacity-0",
          // prefers-reduced-motion: drop the slide, keep only the fade
          "motion-reduce:data-[starting-style]:translate-y-0 motion-reduce:data-[ending-style]:translate-y-0",
          // desktop: centered modal, scales in from the middle instead of sliding
          "md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:bottom-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border md:border-line",
          "md:data-[starting-style]:translate-x-[-50%] md:data-[starting-style]:translate-y-[-50%] md:data-[starting-style]:scale-95",
          "md:data-[ending-style]:translate-x-[-50%] md:data-[ending-style]:translate-y-[-50%] md:data-[ending-style]:scale-95",
          className
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          data-slot="modal-drag-handle"
          className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-line md:hidden"
        />
        {children}
        {showClose && (
          <Dialog.Close
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-ink-500 outline-none transition-colors hover:bg-sky-50 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <X aria-hidden="true" className="size-4" />
          </Dialog.Close>
        )}
      </Dialog.Popup>
    </Dialog.Portal>
  )
}

function ModalHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-header"
      className={cn("flex flex-col gap-1 pr-8 pb-4", className)}
      {...props}
    />
  )
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function ModalTitle({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      data-slot="modal-title"
      className={cn("font-display text-h3 text-ink-900", className)}
      {...props}
    />
  )
}

function ModalDescription({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      data-slot="modal-description"
      className={cn("text-small text-ink-500", className)}
      {...props}
    />
  )
}

export {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ModalClose,
}
export type { ModalContentProps }
