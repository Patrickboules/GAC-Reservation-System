"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 font-medium text-sky-700 select-none",
  {
    variants: {
      size: {
        sm: "size-8 text-[0.6875rem]",
        md: "size-10 text-[0.8125rem]",
        lg: "size-12 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

interface AvatarProps extends VariantProps<typeof avatarVariants> {
  /** Full display name used to derive the initials fallback and alt text. */
  name: string
  src?: string | null
  className?: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function Avatar({ name, src, size, className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size, className }))}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={name}
          className="size-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center">
        {getInitials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

export { Avatar, avatarVariants }
export type { AvatarProps }
