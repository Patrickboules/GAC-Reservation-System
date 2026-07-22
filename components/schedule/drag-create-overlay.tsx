import { cn } from "@/lib/utils";

interface DragCreateOverlayProps {
  top: number;
  height: number;
  label: string;
  /** Renders as an inline conflict warning instead of the default pending-range styling (US-036). */
  conflict?: boolean;
}

/**
 * Ghost block shown while dragging across empty grid cells to create a booking (US-036).
 * Shares one look between the desktop resource grid and the mobile day calendar.
 */
export function DragCreateOverlay({ top, height, label, conflict }: DragCreateOverlayProps) {
  return (
    <div
      aria-hidden="true"
      style={{ top, height }}
      className={cn(
        "pointer-events-none absolute inset-x-0.5 z-20 flex items-center justify-center overflow-hidden rounded-sm border-2 border-dashed px-1 text-center text-caption font-medium",
        conflict
          ? "border-status-rejected-fg bg-status-rejected-bg text-status-rejected-fg"
          : "border-sky-600 bg-sky-100/80 text-sky-700"
      )}
    >
      <span className="truncate">{label}</span>
    </div>
  );
}
