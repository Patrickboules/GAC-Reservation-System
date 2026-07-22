import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/app/(app)/admin/actions";
import { toCsv } from "@/lib/reports/csv";
import { formatDateLabel, formatTimeLabel } from "@/lib/dates";

interface ExportBookingRow {
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  service: string;
  user_id: string;
  rooms: { name: string } | { name: string }[] | null;
}

function singular<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET(request: NextRequest) {
  const supabase = await requireAdmin();

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const { data: rows } = await supabase
    .from("bookings")
    .select("date, start_time, end_time, status, service, user_id, rooms(name)")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  const bookings = (rows ?? []) as unknown as ExportBookingRow[];

  const userIds = [...new Set(bookings.map((row) => row.user_id))];
  const { data: profileRows } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const displayNameById = new Map(
    (profileRows ?? []).map((profile) => [profile.id, profile.display_name ?? "Unknown member"])
  );

  const csv = toCsv([
    ["Room", "Date", "Start", "End", "Status", "Service", "Requester"],
    ...bookings.map((row) => [
      singular(row.rooms)?.name ?? "Unknown room",
      formatDateLabel(row.date),
      formatTimeLabel(row.start_time),
      formatTimeLabel(row.end_time),
      row.status,
      row.service,
      displayNameById.get(row.user_id) ?? "Unknown member",
    ]),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="usage-report_${from}_to_${to}.csv"`,
    },
  });
}
