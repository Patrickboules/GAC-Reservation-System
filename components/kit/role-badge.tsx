import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

type MemberRole = "member" | "servant" | "scout" | "guide" | "admin"

const roleBadgeVariants = cva(
  "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-caption font-medium",
  {
    variants: {
      role: {
        member: "bg-role-member-bg text-role-member-fg",
        servant: "bg-role-servant-bg text-role-servant-fg",
        scout: "bg-role-scout-bg text-role-scout-fg",
        guide: "bg-role-guide-bg text-role-guide-fg",
        admin: "bg-role-admin-bg text-role-admin-fg",
      } satisfies Record<MemberRole, string>,
    },
  }
)

const ROLE_LABELS: Record<MemberRole, string> = {
  member: "Member",
  servant: "Servant",
  scout: "Scout",
  guide: "Guide",
  admin: "Admin",
}

interface RoleBadgeProps extends VariantProps<typeof roleBadgeVariants> {
  role: MemberRole
  className?: string
}

function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      data-slot="role-badge"
      className={cn(roleBadgeVariants({ role }), className)}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}

export { RoleBadge, roleBadgeVariants }
export type { RoleBadgeProps, MemberRole }
