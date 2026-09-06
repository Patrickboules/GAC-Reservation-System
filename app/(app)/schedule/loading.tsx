import { Skeleton } from "@/components/kit/skeleton";

const DAY_PILL_COUNT = 7;
const HOUR_MARK_COUNT = 8;
const ROOM_ROWS = 5;
// Staggered per-row so the grid doesn't look like a uniform striped block.
const EVENT_OFFSETS_PCT = [12, 45, 8, 60, 30];

export default function Loading() {
  return (
    <div className="flex min-h-full w-full flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Room, time, and service — approved reservations only.
        </p>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-4">
        {/* Filter bar */}
        <Skeleton className="h-9 w-24 rounded-md" />

        {/* Day strip */}
        <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto py-1">
          {Array.from({ length: DAY_PILL_COUNT }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-14 shrink-0 rounded-lg" />
          ))}
        </div>

        {/* Timeline grid */}
        <div className="flex w-full min-w-0 flex-col gap-2 rounded-lg border border-line bg-surface p-2">
          <div className="flex items-center gap-2 border-b border-line pb-2">
            <Skeleton className="h-4 w-24 shrink-0" />
            <div className="flex flex-1 gap-4">
              {Array.from({ length: HOUR_MARK_COUNT }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </div>
          {Array.from({ length: ROOM_ROWS }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 py-2">
              <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
              <div className="relative h-8 flex-1">
                <Skeleton
                  className="absolute inset-y-0 h-8 w-1/4 rounded-md"
                  style={{ left: `${EVENT_OFFSETS_PCT[i % EVENT_OFFSETS_PCT.length]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
