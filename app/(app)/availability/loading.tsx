import { Skeleton } from "@/components/kit/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Check availability</h1>
        <p className="text-sm text-muted-foreground">
          Search a date and time range to see which rooms are free.
        </p>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
