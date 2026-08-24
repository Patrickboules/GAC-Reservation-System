"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useToast } from "@/components/kit/toast";

const SUCCESS_MESSAGES: Record<string, string> = {
  submitted: "Request submitted — pending approval.",
  updated: "Booking updated.",
  cancelled: "Booking cancelled.",
};

/**
 * Server Actions that redirect on success (requestBooking, updateBooking,
 * cancelBooking — see app/(app)/bookings/actions.ts) can't call useToast()
 * themselves: redirect() throws before the client's awaited action call ever
 * resolves, so there's no client-side moment left to fire a toast from. This
 * reads the one-shot query param the redirect target carries instead, fires
 * the matching toast on mount, then strips the param so refreshing/back-nav
 * doesn't replay it.
 */
export function BookingToastFeedback() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const key = (["submitted", "updated", "cancelled"] as const).find(
      (param) => searchParams.get(param) === "1"
    );
    if (!key) return;

    toast.success({ title: SUCCESS_MESSAGES[key] });

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(key);
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // Only re-run when the params actually change; toast/router identities are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
