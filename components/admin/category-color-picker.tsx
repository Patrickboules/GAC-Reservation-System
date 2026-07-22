"use client";

import { Check } from "lucide-react";

import {
  ROOM_CATEGORY_COLORS,
  ROOM_CATEGORY_COLOR_LABELS,
  ROOM_CATEGORY_COLOR_SWATCH_CLASSES,
  isRoomCategoryColor,
  type RoomCategoryColor,
} from "@/lib/rooms/category-colors";
import { cn } from "@/lib/utils";

interface CategoryColorPickerProps {
  value: RoomCategoryColor | null;
  onChange: (color: RoomCategoryColor) => void;
}

export function CategoryColorPicker({ value, onChange }: CategoryColorPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-700">Category color</span>
      <div role="radiogroup" aria-label="Category color" className="flex flex-wrap gap-2">
        {ROOM_CATEGORY_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={value === color}
            aria-label={ROOM_CATEGORY_COLOR_LABELS[color]}
            onClick={() => onChange(color)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full outline-none transition-transform",
              "focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2",
              ROOM_CATEGORY_COLOR_SWATCH_CLASSES[color],
              value === color ? "ring-2 ring-ink-900 ring-offset-2" : "hover:scale-105"
            )}
          >
            {value === color && <Check aria-hidden="true" className="size-4 text-white" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CategoryColorSwatch({ color }: { color: string | null }) {
  if (!color || !isRoomCategoryColor(color)) {
    return <span className="text-ink-500">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn("size-2.5 shrink-0 rounded-full", ROOM_CATEGORY_COLOR_SWATCH_CLASSES[color])}
      />
      {ROOM_CATEGORY_COLOR_LABELS[color]}
    </span>
  );
}
