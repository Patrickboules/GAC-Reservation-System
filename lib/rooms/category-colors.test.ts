import { describe, expect, it } from "vitest";
import {
  ROOM_CATEGORY_COLORS,
  ROOM_CATEGORY_COLOR_LABELS,
  ROOM_CATEGORY_COLOR_SWATCH_CLASSES,
  ROOM_CATEGORY_COLOR_HEADER_CLASSES,
  ROOM_CATEGORY_COLOR_ICON_CLASSES,
  isRoomCategoryColor,
} from "./category-colors";

describe("isRoomCategoryColor", () => {
  it.each(ROOM_CATEGORY_COLORS)("accepts %s as a valid category color", (color) => {
    expect(isRoomCategoryColor(color)).toBe(true);
  });

  it("rejects a color outside the fixed palette", () => {
    expect(isRoomCategoryColor("magenta")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isRoomCategoryColor("")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isRoomCategoryColor("Coral")).toBe(false);
  });
});

describe("category color lookup tables", () => {
  it.each(ROOM_CATEGORY_COLORS)("has a label for %s", (color) => {
    expect(ROOM_CATEGORY_COLOR_LABELS[color]).toBeTruthy();
  });

  it.each(ROOM_CATEGORY_COLORS)("has a swatch class for %s", (color) => {
    expect(ROOM_CATEGORY_COLOR_SWATCH_CLASSES[color]).toBeTruthy();
  });

  it.each(ROOM_CATEGORY_COLORS)("has a header class for %s", (color) => {
    expect(ROOM_CATEGORY_COLOR_HEADER_CLASSES[color]).toBeTruthy();
  });

  it.each(ROOM_CATEGORY_COLORS)("has an icon class for %s", (color) => {
    expect(ROOM_CATEGORY_COLOR_ICON_CLASSES[color]).toBeTruthy();
  });
});
