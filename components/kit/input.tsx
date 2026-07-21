"use client"

import * as React from "react"
import { AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

interface InputProps extends Omit<React.ComponentProps<"input">, "id"> {
  id?: string
  label?: React.ReactNode
  helperText?: React.ReactNode
  errorText?: React.ReactNode
  wrapperClassName?: string
}

function Input({
  id,
  label,
  helperText,
  errorText,
  required,
  disabled,
  className,
  wrapperClassName,
  ...props
}: InputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const helperId = `${inputId}-helper`
  const errorId = `${inputId}-error`
  const invalid = !!errorText
  const describedBy = invalid ? errorId : helperText ? helperId : undefined

  return (
    <div data-slot="input-field" className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
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
        <input
          id={inputId}
          data-slot="input"
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          data-invalid={invalid || undefined}
          className={cn(
            "flex h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-500",
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
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-status-rejected-fg"
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

export { Input }
export type { InputProps }
