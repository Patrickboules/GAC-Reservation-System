import { EmptyState } from "@/components/kit/empty-state";
import type { RoomUtilization } from "@/lib/reports/usage";

interface RoomUtilizationChartProps {
  data: RoomUtilization[];
}

export function RoomUtilizationChart({ data }: RoomUtilizationChartProps) {
  if (data.length === 0) {
    return <EmptyState title="No rooms yet" description="Add a room to see utilization here." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((room) => (
        <div key={room.roomId} className="flex items-center gap-3">
          <p
            lang="ar"
            dir="rtl"
            className="w-28 shrink-0 truncate text-small text-ink-700"
            title={room.roomName}
          >
            {room.roomName}
          </p>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-sand-100">
            <div
              className="h-full rounded-full bg-sky-600"
              style={{ width: `${Math.min(room.utilizationPct, 100)}%` }}
            />
          </div>
          <p className="w-12 shrink-0 text-right font-mono text-small tabular-nums text-ink-900">
            {room.utilizationPct}%
          </p>
        </div>
      ))}
    </div>
  );
}
