import { formatHourLabel } from "@/lib/schedule/hours";
import { HEATMAP_WEEKDAY_LABELS, type PeakHoursRow } from "@/lib/reports/usage";

interface PeakHoursHeatmapProps {
  rows: PeakHoursRow[];
}

const SKY_600_RGB = "36, 101, 216";

export function PeakHoursHeatmap({ rows }: PeakHoursHeatmapProps) {
  const maxCount = Math.max(1, ...rows.flatMap((row) => row.counts));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1">
        <thead>
          <tr>
            <th scope="col" className="w-12" />
            {HEATMAP_WEEKDAY_LABELS.map((label) => (
              <th key={label} scope="col" className="pb-1 text-caption font-medium text-ink-500">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hour}>
              <th
                scope="row"
                className="pr-2 text-right font-mono text-caption tabular-nums font-normal text-ink-500"
              >
                {formatHourLabel(row.hour)}
              </th>
              {row.counts.map((count, weekday) => (
                <td key={weekday} className="p-0">
                  <div
                    role="img"
                    aria-label={`${HEATMAP_WEEKDAY_LABELS[weekday]} ${formatHourLabel(row.hour)}: ${count} approved booking${count === 1 ? "" : "s"}`}
                    className="flex h-7 w-full min-w-7 items-center justify-center rounded-sm font-mono text-[0.6875rem] tabular-nums text-ink-900"
                    style={{
                      backgroundColor:
                        count === 0 ? "var(--color-sand-100)" : `rgba(${SKY_600_RGB}, ${count / maxCount})`,
                      color: count / maxCount > 0.6 ? "white" : undefined,
                    }}
                  >
                    {count > 0 ? count : ""}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
