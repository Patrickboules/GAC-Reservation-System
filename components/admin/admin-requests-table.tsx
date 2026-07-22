"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";

import {
  approveBookingAction,
  bulkApproveBookingsAction,
  bulkRejectBookingsAction,
  rejectBookingAction,
  type BookingActionResult,
} from "@/app/(app)/admin/actions";
import { Button } from "@/components/kit/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/kit/modal";
import { Table, type TableColumn, type TableSort } from "@/components/kit/table";
import { Textarea } from "@/components/kit/textarea";
import { useToast } from "@/components/kit/toast";
import { formatDateLabel, formatTimeLabel } from "@/lib/dates";

export interface AdminRequestRow {
  id: string;
  roomId: string;
  roomName: string;
  requesterName: string;
  date: string;
  startTime: string;
  endTime: string;
  service: string;
  notes: string | null;
}

interface RejectTarget {
  ids: string[];
  mode: "single" | "bulk";
}

function summarizeResults(
  results: BookingActionResult[],
  rowsById: Map<string, AdminRequestRow>
): { succeeded: number; failed: { roomName: string; error: string }[] } {
  const failed: { roomName: string; error: string }[] = [];
  let succeeded = 0;
  for (const result of results) {
    if (result.ok) {
      succeeded += 1;
    } else {
      failed.push({
        roomName: rowsById.get(result.id)?.roomName ?? "Unknown room",
        error: result.error ?? "Something went wrong.",
      });
    }
  }
  return { succeeded, failed };
}

export function AdminRequestsTable({ requests }: { requests: AdminRequestRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const rowsById = React.useMemo(() => new Map(requests.map((row) => [row.id, row])), [requests]);

  const [sort, setSort] = React.useState<TableSort>({ key: "date", direction: "asc" });
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [pendingRowId, setPendingRowId] = React.useState<string | null>(null);
  const [isBulkPending, setIsBulkPending] = React.useState(false);
  const [rejectTarget, setRejectTarget] = React.useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [isRejectSubmitting, setIsRejectSubmitting] = React.useState(false);
  const [failedRows, setFailedRows] = React.useState<{ roomName: string; error: string }[]>([]);

  const sorted = React.useMemo(() => {
    const copy = [...requests];
    copy.sort((a, b) => {
      let result = 0;
      if (sort.key === "room") result = a.roomName.localeCompare(b.roomName);
      else if (sort.key === "requester") result = a.requesterName.localeCompare(b.requesterName);
      else if (sort.key === "service") result = a.service.localeCompare(b.service);
      else {
        result = `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`);
      }
      return sort.direction === "asc" ? result : -result;
    });
    return copy;
  }, [requests, sort]);

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === requests.length ? new Set() : new Set(requests.map((row) => row.id))
    );
  }

  async function handleApprove(id: string) {
    setPendingRowId(id);
    try {
      const result = await approveBookingAction(id);
      if (result.ok) {
        toast.success({ title: "Booking approved" });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        toast.error({ title: "Couldn't approve booking", description: result.error });
      }
      router.refresh();
    } finally {
      setPendingRowId(null);
    }
  }

  function openRejectModal(target: RejectTarget) {
    setRejectReason("");
    setRejectTarget(target);
  }

  async function handleRejectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;

    setIsRejectSubmitting(true);
    try {
      if (rejectTarget.mode === "single") {
        const result = await rejectBookingAction(rejectTarget.ids[0], rejectReason);
        if (result.ok) {
          toast.success({ title: "Booking rejected" });
          setFailedRows([]);
        } else {
          toast.error({ title: "Couldn't reject booking", description: result.error });
          setFailedRows(summarizeResults([result], rowsById).failed);
        }
      } else {
        const results = await bulkRejectBookingsAction(rejectTarget.ids, rejectReason);
        const { succeeded, failed } = summarizeResults(results, rowsById);
        setFailedRows(failed);
        if (failed.length === 0) {
          toast.success({ title: `${succeeded} booking${succeeded === 1 ? "" : "s"} rejected` });
        } else {
          toast.warning({
            title: `${succeeded} rejected, ${failed.length} failed`,
            description: failed.map((row) => `${row.roomName}: ${row.error}`).join(" "),
          });
        }
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of rejectTarget.ids) next.delete(id);
        return next;
      });
      setRejectTarget(null);
      router.refresh();
    } finally {
      setIsRejectSubmitting(false);
    }
  }

  async function handleBulkApprove() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setIsBulkPending(true);
    try {
      const results = await bulkApproveBookingsAction(ids);
      const { succeeded, failed } = summarizeResults(results, rowsById);
      setFailedRows(failed);
      if (failed.length === 0) {
        toast.success({ title: `${succeeded} booking${succeeded === 1 ? "" : "s"} approved` });
      } else {
        toast.warning({
          title: `${succeeded} approved, ${failed.length} failed`,
          description: failed.map((row) => `${row.roomName}: ${row.error}`).join(" "),
        });
      }
      const failedIds = new Set(results.filter((r) => !r.ok).map((r) => r.id));
      setSelectedIds(new Set(ids.filter((id) => failedIds.has(id))));
      router.refresh();
    } finally {
      setIsBulkPending(false);
    }
  }

  const columns: TableColumn<AdminRequestRow>[] = [
    {
      key: "select",
      header: "",
      className: "w-10",
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`Select request for ${row.roomName}`}
          checked={selectedIds.has(row.id)}
          onChange={() => toggleRow(row.id)}
          className="size-4 rounded border-line accent-sky-600"
        />
      ),
    },
    {
      key: "room",
      header: "Room",
      sortable: true,
      render: (row) => (
        <Link
          href={`/schedule?room=${row.roomId}&date=${row.date}`}
          className="inline-flex items-center gap-1.5 font-medium text-ink-900 hover:text-sky-600 hover:underline"
        >
          <CalendarClock aria-hidden="true" className="size-3.5 text-ink-500" />
          {row.roomName}
        </Link>
      ),
    },
    {
      key: "requester",
      header: "Requester",
      sortable: true,
      render: (row) => row.requesterName,
    },
    {
      key: "date",
      header: "Date & time",
      sortable: true,
      className: "font-mono tabular-nums whitespace-nowrap",
      render: (row) =>
        `${formatDateLabel(row.date)} · ${formatTimeLabel(row.startTime)}–${formatTimeLabel(row.endTime)}`,
    },
    {
      key: "service",
      header: "Service",
      sortable: true,
      render: (row) => row.service,
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => (
        <span className="line-clamp-1 max-w-48 text-ink-500">{row.notes ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleApprove(row.id)}
            loading={pendingRowId === row.id}
            disabled={pendingRowId !== null && pendingRowId !== row.id}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => openRejectModal({ ids: [row.id], mode: "single" })}
            disabled={pendingRowId !== null}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const allSelected = requests.length > 0 && selectedIds.size === requests.length;

  return (
    <div className="flex flex-col gap-3">
      {requests.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-2.5">
          <label className="flex items-center gap-2 text-small text-ink-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="size-4 rounded border-line accent-sky-600"
            />
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : `Select all ${requests.length} pending`}
          </label>
          {selectedIds.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleBulkApprove}
                loading={isBulkPending}
                disabled={isBulkPending}
              >
                Approve selected
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => openRejectModal({ ids: [...selectedIds], mode: "bulk" })}
                disabled={isBulkPending}
              >
                Reject selected
              </Button>
            </div>
          )}
        </div>
      )}

      {failedRows.length > 0 && (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-lg border border-status-rejected-fg/30 bg-status-rejected-bg px-4 py-3 text-small text-status-rejected-fg"
        >
          <span className="font-medium">
            {failedRows.length} row{failedRows.length === 1 ? "" : "s"} failed:
          </span>
          <ul className="list-inside list-disc">
            {failedRows.map((row, i) => (
              <li key={i}>
                {row.roomName}: {row.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Table
        columns={columns}
        data={sorted}
        getRowId={(row) => row.id}
        sort={sort}
        onSortChange={setSort}
        emptyTitle="No pending requests"
        emptyDescription="New booking requests will show up here for approval."
      />

      <Modal
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <ModalContent>
          <form onSubmit={handleRejectSubmit}>
            <ModalHeader>
              <ModalTitle>
                {rejectTarget?.mode === "bulk"
                  ? `Reject ${rejectTarget.ids.length} requests?`
                  : "Reject this request?"}
              </ModalTitle>
              <ModalDescription>
                The requester will be notified with your reason.
              </ModalDescription>
            </ModalHeader>
            <Textarea
              label="Reason"
              required
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Why is this request being rejected?"
            />
            <ModalFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRejectTarget(null)}
                disabled={isRejectSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                loading={isRejectSubmitting}
                disabled={rejectReason.trim().length === 0}
              >
                {rejectTarget?.mode === "bulk" ? "Reject selected" : "Reject"}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
