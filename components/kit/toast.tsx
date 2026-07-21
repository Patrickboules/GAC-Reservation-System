"use client"

import * as React from "react"
import { Toast } from "@base-ui/react/toast"
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

type ToastVariant = "success" | "info" | "warning" | "error"

const TOAST_VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof Info; accentClass: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    accentClass: "border-l-status-approved-fg",
    iconClass: "text-status-approved-fg",
  },
  info: {
    icon: Info,
    accentClass: "border-l-sky-600",
    iconClass: "text-sky-600",
  },
  warning: {
    icon: AlertTriangle,
    accentClass: "border-l-status-pending-fg",
    iconClass: "text-status-pending-fg",
  },
  error: {
    icon: XCircle,
    accentClass: "border-l-status-rejected-fg",
    iconClass: "text-status-rejected-fg",
  },
}

const DEFAULT_TOAST_TIMEOUT_MS = 4000

/** Provides toast context and renders the viewport. Mount once near the app root. */
function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider timeout={DEFAULT_TOAST_TIMEOUT_MS}>
      {children}
      <Toast.Portal>
        <Toast.Viewport
          data-slot="toast-viewport"
          className="fixed inset-x-4 top-4 z-100 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:top-4 sm:right-4 sm:w-[380px]"
        >
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => <ToastItem key={toast.id} toast={toast} />)
}

function ToastItem({
  toast,
}: {
  toast: React.ComponentProps<typeof Toast.Root>["toast"]
}) {
  const variant = (toast.type as ToastVariant | undefined) ?? "info"
  const { icon: Icon, accentClass, iconClass } = TOAST_VARIANT_STYLES[variant]

  return (
    <Toast.Root
      toast={toast}
      data-slot="toast"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-md border-l-4 bg-surface p-4 shadow-md",
        "transition-all duration-200 ease-out",
        "data-[starting-style]:-translate-y-2 data-[starting-style]:opacity-0",
        "data-[ending-style]:translate-x-2 data-[ending-style]:opacity-0",
        "motion-reduce:data-[starting-style]:translate-y-0 motion-reduce:data-[ending-style]:translate-x-0",
        accentClass
      )}
    >
      <Icon aria-hidden="true" className={cn("size-5 shrink-0", iconClass)} />
      <div className="flex-1 space-y-0.5">
        <Toast.Title
          data-slot="toast-title"
          className="text-body font-medium text-ink-900"
        />
        <Toast.Description
          data-slot="toast-description"
          className="text-small text-ink-500"
        />
        <Toast.Action
          data-slot="toast-action"
          className="text-small font-medium text-sky-600 underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-sky-300"
        />
      </div>
      <Toast.Close
        aria-label="Dismiss"
        data-slot="toast-close"
        className="shrink-0 rounded-md p-1 text-ink-500 outline-none transition-colors hover:bg-sky-50 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        <X aria-hidden="true" className="size-4" />
      </Toast.Close>
    </Toast.Root>
  )
}

interface ShowToastOptions {
  title?: string
  description?: string
  action?: { label: string; onClick: () => void }
}

/** Trigger toasts from any client component nested under ToastProvider. */
function useToast() {
  const { add } = Toast.useToastManager()

  return React.useMemo(() => {
    function show(variant: ToastVariant, options: ShowToastOptions) {
      return add({
        type: variant,
        title: options.title,
        description: options.description,
        actionProps: options.action
          ? {
              children: options.action.label,
              onClick: options.action.onClick,
            }
          : undefined,
      })
    }

    return {
      success: (options: ShowToastOptions) => show("success", options),
      info: (options: ShowToastOptions) => show("info", options),
      warning: (options: ShowToastOptions) => show("warning", options),
      error: (options: ShowToastOptions) => show("error", options),
    }
  }, [add])
}

export { ToastProvider, useToast }
export type { ToastVariant, ShowToastOptions }
