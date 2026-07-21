"use client"

import * as React from "react"
import { AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

interface TextareaProps extends Omit<React.ComponentProps<"textarea">, "id"> {
  id?: string
  label?: React.ReactNode
  helperText?: React.ReactNode
  errorText?: React.ReactNode
  wrapperClassName?: string
}

function Textarea({
  id,
  label,
  helperText,
  errorText,
  required,
  disabled,
  className,
  wrapperClassName,
  rows = 3,
  ...props
}: TextareaProps) {
  const generatedId = React.useId()
  const textareaId = id ?? generatedId
  const helperId = `${textareaId}-helper`
  const errorId = `${textareaId}-error`
  const invalid = !!errorText
  const describedBy = invalid ? errorId : helperText ? helperId : undefined

  return (
    <div data-slot="textarea-field" className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-ink-700">
          {label}
          {required && (
            <span aria-hidden="true" className="text-status-rejected-fg">
              {" "}
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <textarea
          id={textareaId}
          data-slot="textarea"
          rows={rows}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          data-invalid={invalid || undefined}
          className={cn(
            "flex w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-500",
            "focus-visible:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-300",
            "disabled:pointer-events-none disabled:opacity-50 disabled:bg-sand-50",
            invalid &&
              "border-status-rejected-fg pr-9 focus-visible:border-status-rejected-fg focus-visible:ring-status-rejected-fg/30",
            className
          )}
          {...props}
        />
        {invalid && (
          <AlertCircle
            aria-hidden="true"
            className="pointer-events-none absolute top-2.5 right-3 size-4 text-status-rejected-fg"
          />
        )}
      </div>
      {helperText && !invalid && (
        <p id={helperId} className="text-caption text-ink-500">
          {helperText}
        </p>
      )}
      {invalid && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-caption font-medium text-status-rejected-fg"
        >
          {errorText}
        </p>
      )}
    </div>
  )
}

export { Textarea }
export type { TextareaProps }
