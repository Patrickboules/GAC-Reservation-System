import { LoadingState } from "@/components/kit/loading-state";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">My bookings</h1>
        <p className="text-sm text-muted-foreground">Requests you&apos;ve submitted.</p>
      </div>
      <LoadingState variant="rows" count={4} />
    </div>
  );
}
