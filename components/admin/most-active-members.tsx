import { Card } from "@/components/kit/card";
import { EmptyState } from "@/components/kit/empty-state";
import type { MostActiveMember } from "@/lib/reports/usage";

interface MostActiveMembersProps {
  data: MostActiveMember[];
}

export function MostActiveMembers({ data }: MostActiveMembersProps) {
  if (data.length === 0) {
    return (
      <EmptyState title="No requests yet" description="Booking requests in this range will show up here." />
    );
  }

  return (
    <Card as="ol" className="flex flex-col divide-y divide-line p-0">
      {data.map((member, index) => (
        <li key={member.userId} className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-caption tabular-nums text-ink-500">{index + 1}</span>
            <span className="text-small text-ink-900">{member.name}</span>
          </div>
          <span className="font-mono text-small tabular-nums text-ink-700">
            {member.requestCount} {member.requestCount === 1 ? "request" : "requests"}
          </span>
        </li>
      ))}
    </Card>
  );
}
