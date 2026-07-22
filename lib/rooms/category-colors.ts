/** The 8 calendar category palette keys (matches rooms.category_color's
 * check constraint in supabase/migrations/20260722200000_add_room_code_category_color.sql —
 * keep in sync since Postgres won't validate this TS list against the DB). */
export const ROOM_CATEGORY_COLORS = [
  "coral",
  "amber",
  "teal",
  "violet",
  "rose",
  "lime",
  "sky",
  "slate",
] as const;

export type RoomCategoryColor = (typeof ROOM_CATEGORY_COLORS)[number];

export const ROOM_CATEGORY_COLOR_LABELS: Record<RoomCategoryColor, string> = {
  coral: "Coral",
  amber: "Amber",
  teal: "Teal",
  violet: "Violet",
  rose: "Rose",
  lime: "Lime",
  sky: "Sky",
  slate: "Slate",
};

export const ROOM_CATEGORY_COLOR_SWATCH_CLASSES: Record<RoomCategoryColor, string> = {
  coral: "bg-red-400",
  amber: "bg-amber-400",
  teal: "bg-teal-400",
  violet: "bg-violet-400",
  rose: "bg-rose-400",
  lime: "bg-lime-400",
  sky: "bg-sky-500",
  slate: "bg-slate-400",
};

export function isRoomCategoryColor(value: string): value is RoomCategoryColor {
  return (ROOM_CATEGORY_COLORS as readonly string[]).includes(value);
}
