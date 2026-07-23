import { cn } from "@/lib/utils";

interface DragCreateOverlayProps {
  /** Horizontal position (0-100), via percentForTime (US-001). */
  left: number;
  /** Horizontal width (0-100), via percentForTime (US-001). */
  width: number;
  label: string;
  /** Renders as an inline conflict warning instead of the default pending-range styling (US-036). */
  conflict?: boolean;
}

/**
 * Ghost block shown while dragging across empty space in a room's row to create a
 * booking (US-036), positioned along the time axis like EventBlock (US-003).
 */
export function DragCreateOverlay({ left, width, label, conflict }: DragCreateOverlayProps) {
  return (
    <div
      aria-hidden="true"
      style={{ left: `${left}%`, width: `${width}%` }}
      className={cn(
        "pointer-events-none absolute inset-y-0.5 z-20 flex items-center justify-center overflow-hidden rounded-sm border-2 border-dashed px-1 text-center text-caption font-medium",
        conflict
          ? "border-status-rejected-fg bg-status-rejected-bg text-status-rejected-fg"
          : "border-sky-600 bg-sky-100/80 text-sky-700"
      )}
    >
      <span className="truncate">{label}</span>
    </div>
  );
}
