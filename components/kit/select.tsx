"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { AlertCircle, Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

interface SelectOption<Value extends string> {
  value: Value
  label: React.ReactNode
  disabled?: boolean
}

interface SelectProps<Value extends string> {
  id?: string
  label?: React.ReactNode
  helperText?: React.ReactNode
  errorText?: React.ReactNode
  placeholder?: string
  options: readonly SelectOption<Value>[]
  value?: Value | null
  defaultValue?: Value | null
  onValueChange?: (value: Value) => void
  disabled?: boolean
  required?: boolean
  name?: string
  className?: string
  wrapperClassName?: string
}

function Select<Value extends string>({
  id,
  label,
  helperText,
  errorText,
  placeholder = "Select…",
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  name,
  className,
  wrapperClassName,
}: SelectProps<Value>) {
  const generatedId = React.useId()
  const triggerId = id ?? generatedId
  const helperId = `${triggerId}-helper`
  const errorId = `${triggerId}-error`
  const invalid = !!errorText
  const describedBy = invalid ? errorId : helperText ? helperId : undefined

  return (
    <div data-slot="select-field" className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label htmlFor={triggerId} className="text-sm font-medium text-ink-700">
          {label}
          {required && (
            <span aria-hidden="true" className="text-status-rejected-fg">
              {" "}
              *
            </span>
          )}
        </label>
      )}
      <SelectPrimitive.Root
        name={name}
        items={options}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => {
          if (next != null) onValueChange?.(next)
        }}
        disabled={disabled}
        required={required}
      >
        <SelectPrimitive.Trigger
          id={triggerId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          data-invalid={invalid || undefined}
          className={cn(
            "group flex h-10 w-full items-center justify-between gap-2 rounded-md border border-line bg-white px-3 text-sm text-ink-900 outline-none transition-colors",
            "focus-visible:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-300",
            "disabled:pointer-events-none disabled:opacity-50 disabled:bg-sand-50",
            invalid &&
              "border-status-rejected-fg focus-visible:border-status-rejected-fg focus-visible:ring-status-rejected-fg/30",
            className
          )}
        >
          <SelectPrimitive.Value
            placeholder={placeholder}
            className="truncate group-data-[placeholder]:text-ink-500"
          />
          <span className="flex shrink-0 items-center gap-1.5">
            {invalid && (
              <AlertCircle aria-hidden="true" className="size-4 text-status-rejected-fg" />
            )}
            <SelectPrimitive.Icon>
              <ChevronDown aria-hidden="true" className="size-4 text-ink-500" />
            </SelectPrimitive.Icon>
          </span>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Positioner sideOffset={4} className="z-50 outline-none">
            <SelectPrimitive.Popup className="max-h-64 overflow-y-auto rounded-md border border-line bg-white p-1 shadow-md outline-none">
              <SelectPrimitive.List>
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-sm text-ink-900 outline-none select-none",
                      "data-[highlighted]:bg-sky-50",
                      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    )}
                  >
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator>
                      <Check aria-hidden="true" className="size-4 text-sky-600" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
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

export { Select }
export type { SelectProps, SelectOption }
