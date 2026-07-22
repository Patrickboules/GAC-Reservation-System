"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/kit/button";
import { DatePicker } from "@/components/kit/date-picker";

interface ReportsFilterFormProps {
  from: string;
  to: string;
}

export function ReportsFilterForm({ from, to }: ReportsFilterFormProps) {
  const router = useRouter();
  const [draftFrom, setDraftFrom] = React.useState(from);
  const [draftTo, setDraftTo] = React.useState(to);

  const applyRange = (nextFrom: string, nextTo: string) => {
    const params = new URLSearchParams({ from: nextFrom, to: nextTo });
    router.push(`/admin/reports?${params.toString()}`);
  };

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        applyRange(draftFrom, draftTo);
      }}
    >
      <DatePicker
        mode="popover"
        label="From"
        value={draftFrom}
        onValueChange={(value) => setDraftFrom(value > draftTo ? draftTo : value)}
        isDateDisabled={(dateStr) => dateStr > draftTo}
      />
      <DatePicker
        mode="popover"
        label="To"
        value={draftTo}
        onValueChange={(value) => setDraftTo(value < draftFrom ? draftFrom : value)}
        isDateDisabled={(dateStr) => dateStr < draftFrom}
      />
      <Button type="submit" size="md">
        Apply
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="md"
        render={
          <a href={`/admin/reports/export?from=${from}&to=${to}`} download>
            <Download aria-hidden="true" />
            Export CSV
          </a>
        }
      />
    </form>
  );
}
