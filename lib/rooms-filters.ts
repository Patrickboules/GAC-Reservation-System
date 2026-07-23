/** Rooms shape needed to filter/group the schedule's room columns and selector (US-032). */
export interface ScheduleRoom {
  id: string;
  name: string;
  capacity: number | null;
  amenities: string[];
  building: string | null;
  floor: string | null;
  room_type: string | null;
  /** Calendar palette key (lib/rooms/category-colors.ts), null if unset. */
  category_color: string | null;
}

interface CapacityBucket {
  id: string;
  label: string;
  min: number;
  max: number | null;
}

/** App-level capacity ranges the filter bar offers, since raw capacity is a number, not a facet. */
export const CAPACITY_BUCKETS: readonly CapacityBucket[] = [
  { id: "small", label: "Up to 25", min: 0, max: 25 },
  { id: "medium", label: "26–50", min: 26, max: 50 },
  { id: "large", label: "51–100", min: 51, max: 100 },
  { id: "xlarge", label: "100+", min: 101, max: null },
];

export interface RoomFilterState {
  building: string[];
  floor: string[];
  room_type: string[];
  capacity: string[];
  amenities: string[];
}

export const EMPTY_ROOM_FILTERS: RoomFilterState = {
  building: [],
  floor: [],
  room_type: [],
  capacity: [],
  amenities: [],
};

export function hasActiveRoomFilters(filters: RoomFilterState): boolean {
  return (
    filters.building.length > 0 ||
    filters.floor.length > 0 ||
    filters.room_type.length > 0 ||
    filters.capacity.length > 0 ||
    filters.amenities.length > 0
  );
}

function distinctSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => !!value))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export interface RoomFacets {
  building: string[];
  floor: string[];
  room_type: string[];
  amenities: string[];
}

/** Computes the available filter values from the actual room dataset, so options never go stale or invent categories the data doesn't have. */
export function computeRoomFacets(rooms: ScheduleRoom[]): RoomFacets {
  return {
    building: distinctSorted(rooms.map((room) => room.building)),
    floor: distinctSorted(rooms.map((room) => room.floor)),
    room_type: distinctSorted(rooms.map((room) => room.room_type)),
    amenities: distinctSorted(rooms.flatMap((room) => room.amenities)),
  };
}

function capacityMatchesBucket(capacity: number | null, bucketId: string): boolean {
  if (capacity === null) return false;
  const bucket = CAPACITY_BUCKETS.find((candidate) => candidate.id === bucketId);
  if (!bucket) return false;
  return capacity >= bucket.min && (bucket.max === null || capacity <= bucket.max);
}

/** Selecting multiple values within one facet is OR'd (e.g. Building A or B); amenities require all selected to be present (a room must support every checked amenity). */
export function roomMatchesFilters(room: ScheduleRoom, filters: RoomFilterState): boolean {
  if (filters.building.length > 0 && (!room.building || !filters.building.includes(room.building))) {
    return false;
  }
  if (filters.floor.length > 0 && (!room.floor || !filters.floor.includes(room.floor))) {
    return false;
  }
  if (filters.room_type.length > 0 && (!room.room_type || !filters.room_type.includes(room.room_type))) {
    return false;
  }
  if (filters.capacity.length > 0 && !filters.capacity.some((bucketId) => capacityMatchesBucket(room.capacity, bucketId))) {
    return false;
  }
  if (filters.amenities.length > 0 && !filters.amenities.every((amenity) => room.amenities.includes(amenity))) {
    return false;
  }
  return true;
}

/** Stable-sorts rooms into contiguous building groups (rooms without a building sort last) for the desktop grid's optional sticky group headers. */
export function groupRoomsByBuilding(rooms: ScheduleRoom[]): ScheduleRoom[] {
  return [...rooms].sort((a, b) => {
    if (a.building === b.building) return 0;
    if (a.building === null) return 1;
    if (b.building === null) return -1;
    return a.building.localeCompare(b.building);
  });
}

/** Floats pinned rooms (US-034/favorite_rooms) to the front, stable-sorting everything else in place. */
export function sortRoomsByFavorite(rooms: ScheduleRoom[], favoriteRoomIds: ReadonlySet<string>): ScheduleRoom[] {
  const favorites = rooms.filter((room) => favoriteRoomIds.has(room.id));
  const rest = rooms.filter((room) => !favoriteRoomIds.has(room.id));
  return [...favorites, ...rest];
}

export interface RoomBuildingGroup {
  building: string | null;
  count: number;
}

/** Collapses consecutive same-building rooms (assumes rooms are already grouped, e.g. via groupRoomsByBuilding) into spans for column-spanning group headers. */
export function buildingGroupSpans(rooms: ScheduleRoom[]): RoomBuildingGroup[] {
  const groups: RoomBuildingGroup[] = [];
  for (const room of rooms) {
    const last = groups[groups.length - 1];
    if (last && last.building === room.building) {
      last.count += 1;
    } else {
      groups.push({ building: room.building, count: 1 });
    }
  }
  return groups;
}
