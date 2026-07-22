"use client";

import * as React from "react";

import {
  createRoomAction,
  updateRoomAction,
  type RoomInput,
} from "@/app/(app)/admin/rooms/actions";
import { CategoryColorPicker } from "@/components/admin/category-color-picker";
import type { AdminRoomRow } from "@/components/admin/rooms-table";
import { Button } from "@/components/kit/button";
import { FilterChip } from "@/components/kit/filter-chip";
import { Input } from "@/components/kit/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/kit/modal";
import { Textarea } from "@/components/kit/textarea";
import { useToast } from "@/components/kit/toast";
import type { RoomCategoryColor } from "@/lib/rooms/category-colors";

interface RoomFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode */
  room: AdminRoomRow | null;
  knownAmenities: string[];
  onSaved: () => void;
}

function emptyForm(): RoomInput {
  return {
    name: "",
    code: "",
    capacity: null,
    amenities: [],
    location: "",
    rules: "",
    categoryColor: null,
  };
}

function formFromRoom(room: AdminRoomRow): RoomInput {
  return {
    name: room.name,
    code: room.code ?? "",
    capacity: room.capacity,
    amenities: room.amenities,
    location: room.location ?? "",
    rules: room.rules ?? "",
    categoryColor: room.categoryColor,
  };
}

/** Add/edit room sheet (US-043) — form-in-a-sheet pattern established by
 * components/bookings/booking-sheet.tsx (US-017), built on the kit Modal. */
export function RoomFormSheet({
  open,
  onOpenChange,
  room,
  knownAmenities,
  onSaved,
}: RoomFormSheetProps) {
  const toast = useToast();
  const [form, setForm] = React.useState<RoomInput>(() => (room ? formFromRoom(room) : emptyForm()));
  const [amenityDraft, setAmenityDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(room ? formFromRoom(room) : emptyForm());
      setAmenityDraft("");
      setError(null);
    }
  }, [open, room]);

  function addAmenity(value: string) {
    const trimmed = value.trim();
    if (!trimmed || form.amenities.includes(trimmed)) return;
    setForm((prev) => ({ ...prev, amenities: [...prev.amenities, trimmed] }));
  }

  function removeAmenity(value: string) {
    setForm((prev) => ({ ...prev, amenities: prev.amenities.filter((a) => a !== value) }));
  }

  const suggestions = knownAmenities.filter((a) => !form.amenities.includes(a));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const result = room ? await updateRoomAction(room.id, form) : await createRoomAction(form);
      if (result.ok) {
        toast.success({ title: room ? "Room updated" : "Room added" });
        onOpenChange(false);
        onSaved();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ModalHeader>
            <ModalTitle>{room ? "Edit room" : "Add room"}</ModalTitle>
            <ModalDescription>
              {room ? "Update this room's details." : "Add a new room members can request."}
            </ModalDescription>
          </ModalHeader>

          <Input
            label="Name"
            required
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Code"
              placeholder="e.g. A101"
              value={form.code ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            />
            <Input
              label="Capacity"
              type="number"
              min={0}
              value={form.capacity ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  capacity: event.target.value === "" ? null : Number(event.target.value),
                }))
              }
            />
          </div>

          <Input
            label="Location"
            value={form.location ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Amenities</span>
            <div className="flex flex-wrap gap-1.5">
              {form.amenities.length === 0 ? (
                <span className="text-caption text-ink-500">None yet</span>
              ) : (
                form.amenities.map((amenity) => (
                  <FilterChip
                    key={amenity}
                    selected
                    removable
                    onRemove={() => removeAmenity(amenity)}
                  >
                    {amenity}
                  </FilterChip>
                ))
              )}
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((amenity) => (
                  <FilterChip key={amenity} onSelectedChange={() => addAmenity(amenity)}>
                    + {amenity}
                  </FilterChip>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add an amenity"
                value={amenityDraft}
                onChange={(event) => setAmenityDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addAmenity(amenityDraft);
                    setAmenityDraft("");
                  }
                }}
                wrapperClassName="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  addAmenity(amenityDraft);
                  setAmenityDraft("");
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <Textarea
            label="Rules"
            value={form.rules ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, rules: event.target.value }))}
          />

          <CategoryColorPicker
            value={(form.categoryColor as RoomCategoryColor | null) ?? null}
            onChange={(color) => setForm((prev) => ({ ...prev, categoryColor: color }))}
          />

          {error && (
            <p role="alert" className="text-small font-medium text-status-rejected-fg">
              {error}
            </p>
          )}

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {room ? "Save changes" : "Add room"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
