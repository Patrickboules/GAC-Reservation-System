"use client"

import * as React from "react"
import { Menu } from "@base-ui/react/menu"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

function DropdownMenu(props: React.ComponentProps<typeof Menu.Root>) {
  return <Menu.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger(
  props: React.ComponentProps<typeof Menu.Trigger>
) {
  return <Menu.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

interface DropdownMenuContentProps
  extends React.ComponentProps<typeof Menu.Popup> {
  sideOffset?: number
  align?: React.ComponentProps<typeof Menu.Positioner>["align"]
}

function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: DropdownMenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner sideOffset={sideOffset} align={align}>
        <Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 min-w-[10rem] origin-[var(--transform-origin)] rounded-md border border-line bg-surface p-1 shadow-md outline-none",
            "transition-[transform,opacity] duration-100 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            className
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  )
}

interface DropdownMenuItemProps extends React.ComponentProps<typeof Menu.Item> {
  variant?: "default" | "danger"
}

function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: DropdownMenuItemProps) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-small text-ink-700 outline-none select-none",
        "data-[highlighted]:bg-sky-50 data-[highlighted]:text-ink-900",
        "focus-visible:ring-2 focus-visible:ring-sky-300",
        variant === "danger" &&
          "text-status-rejected-fg data-[highlighted]:bg-status-rejected-bg data-[highlighted]:text-status-rejected-fg",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Menu.CheckboxItem>) {
  return (
    <Menu.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-small text-ink-700 outline-none select-none",
        "data-[highlighted]:bg-sky-50 data-[highlighted]:text-ink-900",
        "focus-visible:ring-2 focus-visible:ring-sky-300",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <Menu.CheckboxItemIndicator className="absolute left-2 inline-flex size-3.5 items-center justify-center">
        <Check className="size-3.5" />
      </Menu.CheckboxItemIndicator>
      {children}
    </Menu.CheckboxItem>
  )
}

function DropdownMenuGroup(props: React.ComponentProps<typeof Menu.Group>) {
  return <Menu.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof Menu.GroupLabel>) {
  return (
    <Menu.GroupLabel
      data-slot="dropdown-menu-group-label"
      className={cn(
        "px-2 py-1.5 text-caption font-medium text-ink-500",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Separator>) {
  return (
    <Menu.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-line", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuSeparator,
}
export type { DropdownMenuContentProps, DropdownMenuItemProps }
