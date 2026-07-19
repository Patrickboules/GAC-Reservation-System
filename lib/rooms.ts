export function formatRoomField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "Not specified";
  if (typeof value === "string" && value.trim() === "") return "Not specified";
  return String(value);
}

export function formatAmenities(amenities: string[] | null | undefined): string {
  if (!amenities || amenities.length === 0) return "Not specified";
  return amenities.join(", ");
}
