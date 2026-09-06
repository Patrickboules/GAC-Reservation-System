import { LoadingState } from "@/components/kit/loading-state";
import { Skeleton } from "@/components/kit/skeleton";

const UTILIZATION_ROWS = 5;
const HEATMAP_COLUMNS = 7;
const HEATMAP_ROWS = 4;
// Staggered per-row so the bars don't look like a uniform striped block.
const BAR_WIDTHS_PCT = [85, 60, 92, 45, 70];

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 p-4">
      <div>
        <h1 className="text-display font-display text-ink-900">Usage reports</h1>
        <p className="text-body text-ink-500">
          Room demand and activity for the selected date range.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 font-display text-ink-900">Room utilization</h2>
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm">
          {Array.from({ length: UTILIZATION_ROWS }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-28 shrink-0" />
              <Skeleton
                className="h-3 flex-1 rounded-full"
                style={{ width: `${BAR_WIDTHS_PCT[i % BAR_WIDTHS_PCT.length]}%` }}
              />
              <Skeleton className="h-4 w-8 shrink-0" />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 font-display text-ink-900">Most active members</h2>
        <LoadingState variant="rows" count={5} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 font-display text-ink-900">Peak hours</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            {Array.from({ length: HEATMAP_ROWS }).map((_, row) => (
              <div key={row} className="flex gap-1">
                {Array.from({ length: HEATMAP_COLUMNS }).map((_, col) => (
                  <Skeleton key={col} className="h-7 w-7 shrink-0 rounded-sm" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
