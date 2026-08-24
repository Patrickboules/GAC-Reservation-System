"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/kit/error-state";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  className?: string;
}

/**
 * Drop-in body for a route segment's error.tsx (Next.js requires that file be
 * a Client Component). Wires the existing ErrorState kit component to Next's
 * reset() so "Retry" re-renders the segment instead of introducing a new
 * error-display pattern.
 */
export function RouteError({
  error,
  reset,
  title,
  className = "mx-auto flex min-h-full w-full max-w-2xl flex-col p-4",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={className}>
      <ErrorState title={title} description={error.message} onRetry={reset} />
    </div>
  );
}
