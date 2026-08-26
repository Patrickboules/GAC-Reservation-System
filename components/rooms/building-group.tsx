import { Building2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface BuildingGroupProps {
  building: string;
  roomCount: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps one building's room cards in a visually contained "tray": a tinted,
 * recessed frame with the building header at top. The tint/border/inset-shadow
 * live on a separate absolutely-positioned layer behind the header/cards
 * (not on the outer element) because CSS mask-image masks an element's full
 * rendered output, content included — masking the outer element directly
 * would fade out whichever cards happen to sit in the lower half along with
 * the background. See design-previews/rooms-building-grouping.html for the
 * before/after this was designed against.
 */
function BuildingGroup({ building, roomCount, children, className }: BuildingGroupProps) {
  return (
    <div className={cn("relative p-5", className)}>
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-[22px] border-t border-x border-line"
        style={{
          background: "linear-gradient(to bottom, var(--color-line) 0%, #eef2f7 45%, var(--color-canvas) 100%)",
          boxShadow:
            "inset 0 1px 4px 0 rgb(27 36 48 / 0.06), inset 0 1px 0 0 rgb(255 255 255 / 0.5)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 92%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 92%)",
        }}
      />
      <div className="relative z-10 mb-4 flex items-center gap-2 border-b border-line pb-3">
        <Building2 aria-hidden="true" className="size-4 shrink-0 text-ink-500" />
        <h2 lang="ar" dir="rtl" className="font-display text-h3 text-ink-900">
          {building}
        </h2>
        <span className="text-caption font-medium text-ink-500">
          {roomCount} {roomCount === 1 ? "room" : "rooms"}
        </span>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export { BuildingGroup };
