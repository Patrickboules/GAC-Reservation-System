export function formatRoomField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "Not specified";
  if (typeof value === "string" && value.trim() === "") return "Not specified";
  return String(value);
}

/** Builds a display location from the structured building/floor facets. The
 * free-text `location` column was dropped when supabase/rooms.json became the
 * source of truth for rooms (migration 20260801000000), so the two facets are
 * now the only place that information lives. */
export function formatRoomLocation(
  building: string | null | undefined,
  floor: string | null | undefined
): string | null {
  const parts = [building, floor].filter(
    (part): part is string => typeof part === "string" && part.trim() !== ""
  );
  return parts.length > 0 ? parts.join(" — ") : null;
}

export function formatAmenities(amenities: string[] | null | undefined): string {
  if (!amenities || amenities.length === 0) return "Not specified";
  return amenities.join(", ");
}

export interface RoomBuildingSection<T> {
  building: string;
  rooms: T[];
}

/** Buckets rooms by their building field for the rooms directory, in first-seen
 * order, so any building present in the data automatically gets its own
 * section — no hardcoded building list to keep in sync. Rooms with no building
 * set fall into a single "Other" section at the end. */
export function toBuildingSections<T extends { building: string | null }>(
  rooms: T[]
): RoomBuildingSection<T>[] {
  const order: string[] = [];
  const buckets = new Map<string, T[]>();

  for (const room of rooms) {
    const key = room.building?.trim() || "Other";
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
      order.push(key);
    }
    bucket.push(room);
  }

  return order.map((building) => ({ building, rooms: buckets.get(building)! }));
}
