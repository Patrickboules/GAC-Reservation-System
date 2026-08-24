import { LoadingState } from "@/components/kit/loading-state";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <LoadingState variant="cards" count={1} />
    </div>
  );
}
