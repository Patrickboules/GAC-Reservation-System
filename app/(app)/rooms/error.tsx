"use client";

import { RouteError } from "@/components/kit/route-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Couldn't load rooms"
      className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-4"
    />
  );
}
