"use client";

import { X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuTrigger,
} from "@/components/kit/dropdown-menu";
import {
  CAPACITY_BUCKETS,
  computeRoomFacets,
  EMPTY_ROOM_FILTERS,
  hasActiveRoomFilters,
  type RoomFilterState,
  type ScheduleRoom,
} from "@/lib/rooms-filters";
import { cn } from "@/lib/utils";

interface FacetOption {
  value: string;
  label: string;
}

interface FacetDropdownProps {
  label: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
}

function FacetDropdown({ label, options, selected, onToggle }: FacetDropdownProps) {
  if (options.length === 0) return null;
  const hasSelection = selected.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            data-slot="room-filter-chip"
            data-selected={hasSelection || undefined}
            className={cn(
              "group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[0.8125rem] font-medium text-ink-700 outline-none transition-colors",
              "hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-300",
              "data-[selected]:border-sky-600 data-[selected]:bg-sky-600 data-[selected]:text-white data-[selected]:hover:bg-sky-600"
            )}
          >
            {label}
            {hasSelection && (
              <span
                className={cn(
                  "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-100 px-1 text-[0.6875rem] font-semibold text-sky-700",
                  "group-data-[selected]:bg-white/20 group-data-[selected]:text-white"
                )}
              >
                {selected.length}
              </span>
            )}
          </button>
        }
      />
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>{label}</DropdownMenuGroupLabel>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => onToggle(option.value, checked)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RoomFilterBarProps {
  rooms: ScheduleRoom[];
  filters: RoomFilterState;
  onFiltersChange: (next: RoomFilterState) => void;
}

/**
 * Multi-select filter chips (US-032) narrowing visible rooms by building,
 * floor, room type, capacity, and amenities. Options are computed from the
 * real room dataset, so a facet with no data (e.g. no room_type set) simply
 * doesn't render its chip.
 */
export function RoomFilterBar({ rooms, filters, onFiltersChange }: RoomFilterBarProps) {
  const facets = computeRoomFacets(rooms);

  function toggle(key: keyof RoomFilterState, value: string, checked: boolean) {
    const current = filters[key];
    const next = checked ? [...current, value] : current.filter((v) => v !== value);
    onFiltersChange({ ...filters, [key]: next });
  }

  const nothingToFilter =
    facets.building.length === 0 &&
    facets.floor.length === 0 &&
    facets.room_type.length === 0 &&
    facets.amenities.length === 0;

  if (nothingToFilter) return null;

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <FacetDropdown
        label="Building"
        options={facets.building.map((value) => ({ value, label: value }))}
        selected={filters.building}
        onToggle={(value, checked) => toggle("building", value, checked)}
      />
      <FacetDropdown
        label="Floor"
        options={facets.floor.map((value) => ({ value, label: value }))}
        selected={filters.floor}
        onToggle={(value, checked) => toggle("floor", value, checked)}
      />
      <FacetDropdown
        label="Room type"
        options={facets.room_type.map((value) => ({ value, label: value }))}
        selected={filters.room_type}
        onToggle={(value, checked) => toggle("room_type", value, checked)}
      />
      <FacetDropdown
        label="Capacity"
        options={CAPACITY_BUCKETS.map((bucket) => ({ value: bucket.id, label: bucket.label }))}
        selected={filters.capacity}
        onToggle={(value, checked) => toggle("capacity", value, checked)}
      />
      <FacetDropdown
        label="Amenities"
        options={facets.amenities.map((value) => ({ value, label: value }))}
        selected={filters.amenities}
        onToggle={(value, checked) => toggle("amenities", value, checked)}
      />
      {hasActiveRoomFilters(filters) && (
        <button
          type="button"
          onClick={() => onFiltersChange(EMPTY_ROOM_FILTERS)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[0.8125rem] font-medium text-ink-500 outline-none hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <X className="size-3.5" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
