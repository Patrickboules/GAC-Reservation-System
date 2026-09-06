import { LoadingState } from "@/components/kit/loading-state";
import { Skeleton } from "@/components/kit/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 p-4">
      <div>
        <h1 className="text-display font-display text-ink-900">Dashboard</h1>
        <p className="text-body text-ink-500">Overview of today&rsquo;s schedule and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-2 h-8 w-1/2" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-h3 font-display text-ink-900">Recent activity</h2>
        <LoadingState variant="rows" count={5} />
      </div>
    </div>
  );
}
