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

/** Soft gradient header background for a room card, keyed off the same
 * palette as ROOM_CATEGORY_COLOR_SWATCH_CLASSES. */
export const ROOM_CATEGORY_COLOR_HEADER_CLASSES: Record<RoomCategoryColor, string> = {
  coral: "bg-gradient-to-br from-red-400/25 to-red-400/5",
  amber: "bg-gradient-to-br from-amber-400/25 to-amber-400/5",
  teal: "bg-gradient-to-br from-teal-400/25 to-teal-400/5",
  violet: "bg-gradient-to-br from-violet-400/25 to-violet-400/5",
  rose: "bg-gradient-to-br from-rose-400/25 to-rose-400/5",
  lime: "bg-gradient-to-br from-lime-400/25 to-lime-400/5",
  sky: "bg-gradient-to-br from-sky-500/25 to-sky-500/5",
  slate: "bg-gradient-to-br from-slate-400/25 to-slate-400/5",
};

/** Icon tint to pair with ROOM_CATEGORY_COLOR_HEADER_CLASSES. */
export const ROOM_CATEGORY_COLOR_ICON_CLASSES: Record<RoomCategoryColor, string> = {
  coral: "text-red-400",
  amber: "text-amber-400",
  teal: "text-teal-400",
  violet: "text-violet-400",
  rose: "text-rose-400",
  lime: "text-lime-500",
  sky: "text-sky-500",
  slate: "text-slate-400",
};

export function isRoomCategoryColor(value: string): value is RoomCategoryColor {
  return (ROOM_CATEGORY_COLORS as readonly string[]).includes(value);
}
