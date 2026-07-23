"use client";

import { ChevronDown, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/kit/dropdown-menu";
import {
  CAPACITY_BUCKETS,
  computeRoomFacets,
  EMPTY_ROOM_FILTERS,
  type RoomFilterState,
  type ScheduleRoom,
} from "@/lib/rooms-filters";
import { cn } from "@/lib/utils";

interface FacetOption {
  value: string;
  label: string;
}

interface FacetGroupProps {
  label: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
}

function FacetGroup({ label, options, selected, onToggle }: FacetGroupProps) {
  if (options.length === 0) return null;

  return (
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
  );
}

interface RoomFilterBarProps {
  rooms: ScheduleRoom[];
  filters: RoomFilterState;
  onFiltersChange: (next: RoomFilterState) => void;
}

/**
 * Single "Filters" dropdown (US-032) narrowing visible rooms by building,
 * floor, room type, capacity, and amenities, grouped into one popover instead
 * of a separate chip per facet. Options are computed from the real room
 * dataset, so a facet with no data (e.g. no room_type set) simply doesn't
 * render its section.
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

  const activeCount =
    filters.building.length +
    filters.floor.length +
    filters.room_type.length +
    filters.capacity.length +
    filters.amenities.length;
  const hasSelection = activeCount > 0;

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              data-slot="room-filter-trigger"
              data-selected={hasSelection || undefined}
              className={cn(
                "group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[0.8125rem] font-medium text-ink-700 outline-none transition-colors",
                "hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-300",
                "data-[selected]:border-sky-600 data-[selected]:bg-sky-600 data-[selected]:text-white data-[selected]:hover:bg-sky-600"
              )}
            >
              Filters
              {hasSelection && (
                <span
                  className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-100 px-1 text-[0.6875rem] font-semibold text-sky-700",
                    "group-data-[selected]:bg-white/20 group-data-[selected]:text-white"
                  )}
                >
                  {activeCount}
                </span>
              )}
              <ChevronDown aria-hidden="true" className="size-3.5" />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="max-h-96 w-64 overflow-y-auto">
          <FacetGroup
            label="Building"
            options={facets.building.map((value) => ({ value, label: value }))}
            selected={filters.building}
            onToggle={(value, checked) => toggle("building", value, checked)}
          />
          <FacetGroup
            label="Floor"
            options={facets.floor.map((value) => ({ value, label: value }))}
            selected={filters.floor}
            onToggle={(value, checked) => toggle("floor", value, checked)}
          />
          <FacetGroup
            label="Room type"
            options={facets.room_type.map((value) => ({ value, label: value }))}
            selected={filters.room_type}
            onToggle={(value, checked) => toggle("room_type", value, checked)}
          />
          <FacetGroup
            label="Capacity"
            options={CAPACITY_BUCKETS.map((bucket) => ({ value: bucket.id, label: bucket.label }))}
            selected={filters.capacity}
            onToggle={(value, checked) => toggle("capacity", value, checked)}
          />
          <FacetGroup
            label="Amenities"
            options={facets.amenities.map((value) => ({ value, label: value }))}
            selected={filters.amenities}
            onToggle={(value, checked) => toggle("amenities", value, checked)}
          />
          {hasSelection && (
            <>
              <DropdownMenuSeparator />
              <button
                type="button"
                onClick={() => onFiltersChange(EMPTY_ROOM_FILTERS)}
                className="flex w-full cursor-default items-center gap-1.5 rounded-sm px-2 py-1.5 text-small text-ink-500 outline-none select-none hover:bg-sky-50 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <X className="size-3.5" aria-hidden="true" />
                Clear filters
              </button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
