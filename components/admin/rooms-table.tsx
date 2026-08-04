"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { deleteRoomAction } from "@/app/(app)/admin/rooms/actions";
import { CategoryColorSwatch } from "@/components/admin/category-color-picker";
import { RoomFormSheet } from "@/components/admin/room-form-sheet";
import { Button } from "@/components/kit/button";
import { DropdownMenuItem } from "@/components/kit/dropdown-menu";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/kit/modal";
import { Table, type TableColumn, type TableSort } from "@/components/kit/table";
import { useToast } from "@/components/kit/toast";
import { formatRoomLocation } from "@/lib/rooms";

export interface AdminRoomRow {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
  roomType: string | null;
  amenities: string[];
  categoryColor: string | null;
}

export function RoomsTable({ rooms }: { rooms: AdminRoomRow[] }) {
  const router = useRouter();
  const toast = useToast();

  const [sort, setSort] = React.useState<TableSort>({ key: "name", direction: "asc" });
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingRoom, setEditingRoom] = React.useState<AdminRoomRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminRoomRow | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const knownAmenities = React.useMemo(() => {
    const set = new Set<string>();
    for (const room of rooms) for (const amenity of room.amenities) set.add(amenity);
    return [...set].sort();
  }, [rooms]);

  const sorted = React.useMemo(() => {
    const copy = [...rooms];
    copy.sort((a, b) => {
      let result = 0;
      if (sort.key === "roomType") result = (a.roomType ?? "").localeCompare(b.roomType ?? "");
      else if (sort.key === "location") {
        result = (formatRoomLocation(a.building, a.floor) ?? "").localeCompare(
          formatRoomLocation(b.building, b.floor) ?? ""
        );
      } else result = a.name.localeCompare(b.name);
      return sort.direction === "asc" ? result : -result;
    });
    return copy;
  }, [rooms, sort]);

  function openCreate() {
    setEditingRoom(null);
    setFormOpen(true);
  }

  function openEdit(room: AdminRoomRow) {
    setEditingRoom(room);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteRoomAction(deleteTarget.id);
      if (result.ok) {
        toast.success({ title: "Room deleted" });
        setDeleteTarget(null);
        router.refresh();
      } else {
        setDeleteError(result.error ?? "Something went wrong.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: TableColumn<AdminRoomRow>[] = [
    {
      key: "name",
      header: "Room",
      sortable: true,
      render: (row) => <span className="font-medium text-ink-900">{row.name}</span>,
    },
    {
      key: "roomType",
      header: "Type",
      sortable: true,
      render: (row) => row.roomType ?? "—",
    },
    {
      key: "color",
      header: "Color",
      render: (row) => <CategoryColorSwatch color={row.categoryColor} />,
    },
    {
      key: "location",
      header: "Location",
      sortable: true,
      render: (row) => formatRoomLocation(row.building, row.floor) ?? "—",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" className="size-4" />
          Add room
        </Button>
      </div>

      <Table
        columns={columns}
        data={sorted}
        getRowId={(row) => row.id}
        sort={sort}
        onSortChange={setSort}
        rowActions={(row) => (
          <>
            <DropdownMenuItem onClick={() => openEdit(row)}>Edit</DropdownMenuItem>
            <DropdownMenuItem
              variant="danger"
              onClick={() => {
                setDeleteError(null);
                setDeleteTarget(row);
              }}
            >
              Delete
            </DropdownMenuItem>
          </>
        )}
        emptyTitle="No rooms yet"
        emptyDescription="Add a room so members can request it."
        emptyAction={
          <Button onClick={openCreate} size="sm">
            Add room
          </Button>
        }
      />

      <RoomFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        room={editingRoom}
        knownAmenities={knownAmenities}
        onSaved={() => router.refresh()}
      />

      <Modal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete {deleteTarget?.name}?</ModalTitle>
            <ModalDescription>This can&apos;t be undone.</ModalDescription>
          </ModalHeader>
          {deleteError && (
            <p role="alert" className="text-small font-medium text-status-rejected-fg">
              {deleteError}
            </p>
          )}
          <ModalFooter>
            <ModalClose render={<Button variant="secondary">Keep room</Button>} />
            <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
              Delete room
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
