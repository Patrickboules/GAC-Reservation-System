import { LoadingState } from "@/components/kit/loading-state";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-display text-h2 text-ink-900">Approval queue</h1>
        <p className="text-small text-ink-500">Pending room/hall requests.</p>
      </div>
      <LoadingState variant="rows" count={6} />
    </div>
  );
}
