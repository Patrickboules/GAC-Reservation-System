import { LoadingState } from "@/components/kit/loading-state";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-display text-h2 text-ink-900">Rooms</h1>
        <p className="text-small text-ink-500">
          Browse rooms, halls, and stages. Open one to see its availability and reserve it.
        </p>
      </div>
      <LoadingState variant="cards" count={8} />
    </div>
  );
}
