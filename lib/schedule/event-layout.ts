export interface TimedEvent {
  id: string;
  start_time: string;
  end_time: string;
}

export interface LaidOutEvent<T extends TimedEvent> {
  event: T;
  /** 0-based column among events that overlap this one in time. */
  columnIndex: number;
  /** Total overlapping columns in this event's cluster. */
  columnCount: number;
}

/**
 * Lays out a set of same-room/same-day events into side-by-side columns
 * wherever their time ranges overlap (US-031). Sequential/non-overlapping
 * events each get columnCount 1; a run of mutually-overlapping events shares
 * one columnCount so their blocks evenly split the available width.
 */
export function layoutOverlappingEvents<T extends TimedEvent>(events: T[]): LaidOutEvent<T>[] {
  const sorted = [...events].sort(
    (a, b) => a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time)
  );

  const results: LaidOutEvent<T>[] = [];
  let cluster: { event: T; columnIndex: number }[] = [];
  let columnEnds: string[] = [];
  let clusterEnd = "";

  function flushCluster() {
    if (cluster.length === 0) return;
    const columnCount = Math.max(...cluster.map((c) => c.columnIndex)) + 1;
    for (const c of cluster) {
      results.push({ event: c.event, columnIndex: c.columnIndex, columnCount });
    }
    cluster = [];
    columnEnds = [];
    clusterEnd = "";
  }

  for (const event of sorted) {
    if (cluster.length > 0 && event.start_time >= clusterEnd) {
      flushCluster();
    }

    let columnIndex = columnEnds.findIndex((end) => end <= event.start_time);
    if (columnIndex === -1) {
      columnIndex = columnEnds.length;
      columnEnds.push(event.end_time);
    } else {
      columnEnds[columnIndex] = event.end_time;
    }

    cluster.push({ event, columnIndex });
    clusterEnd = clusterEnd === "" || event.end_time > clusterEnd ? event.end_time : clusterEnd;
  }
  flushCluster();

  return results;
}
