/**
 * Minimal in-memory stand-in for the subset of the supabase-js query builder
 * exercised by this app's Server Actions: .from(table).select/update/insert/delete
 * chained with .eq/.in/.is/.order and a terminal .single()/.maybeSingle() or
 * direct await, plus the `{ count: "exact", head: true }` select variant.
 *
 * Not a general Postgres simulator — filters are plain equality/membership
 * checks against an in-memory row array. Built for testing app-level branching
 * (auth guards, conflict re-checks, status transitions), not RLS or constraints.
 */
import type { PostgrestError } from "@supabase/supabase-js";

export type FakeRow = Record<string, unknown>;

export type FakeError = Pick<PostgrestError, "message"> & Partial<PostgrestError>;

interface Filter {
  type: "eq" | "in" | "is";
  col: string;
  val: unknown;
}

function matchesFilters(row: FakeRow, filters: Filter[]): boolean {
  return filters.every((f) => {
    if (f.type === "eq") return row[f.col] === f.val;
    if (f.type === "in") return (f.val as unknown[]).includes(row[f.col]);
    // is: used for null checks in this codebase (e.g. .is("read_at", null))
    return row[f.col] === f.val;
  });
}

type QueryResult = { data: unknown; error: FakeError | null; count?: number | null };

class FakeQuery implements PromiseLike<QueryResult> {
  private filters: Filter[] = [];
  private singleMode: "single" | "maybeSingle" | null = null;

  constructor(
    private table: FakeTable,
    private op: "select" | "update" | "insert" | "delete",
    private opts?: { count?: "exact"; head?: boolean },
    private payload?: FakeRow | FakeRow[]
  ) {}

  eq(col: string, val: unknown): this {
    this.filters.push({ type: "eq", col, val });
    return this;
  }

  in(col: string, vals: unknown[]): this {
    this.filters.push({ type: "in", col, val: vals });
    return this;
  }

  is(col: string, val: unknown): this {
    this.filters.push({ type: "is", col, val });
    return this;
  }

  order(): this {
    return this;
  }

  /** Only meaningful chained after insert() (`.insert(row).select("id")`); select()
   * on its own is the entry point built by FakeTable.select() instead. */
  select(): this {
    return this;
  }

  single(): this {
    this.singleMode = "single";
    return this;
  }

  maybeSingle(): this {
    this.singleMode = "maybeSingle";
    return this;
  }

  private execute(): QueryResult {
    const writeError = this.op === "select" ? undefined : this.table.consumeWriteError();

    if (this.op === "select") {
      const matched = this.table.rows.filter((r) => matchesFilters(r, this.filters));
      if (this.opts?.head) {
        return { data: null, error: null, count: matched.length };
      }
      if (this.singleMode === "single") {
        return matched[0]
          ? { data: matched[0], error: null }
          : { data: null, error: { message: "No rows found", code: "PGRST116" } };
      }
      if (this.singleMode === "maybeSingle") {
        return { data: matched[0] ?? null, error: null };
      }
      return { data: matched, error: null, count: matched.length };
    }

    if (this.op === "insert") {
      if (writeError) return { data: null, error: writeError };
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const inserted = rows.map((r, i) => ({
        id: `generated-${this.table.rows.length + i}`,
        ...r,
      }));
      this.table.rows.push(...inserted);
      return { data: this.singleMode === "single" ? inserted[0] : inserted, error: null };
    }

    if (this.op === "update") {
      if (writeError) return { data: null, error: writeError };
      const matched = this.table.rows.filter((r) => matchesFilters(r, this.filters));
      matched.forEach((r) => Object.assign(r, this.payload));
      return { data: matched, error: null };
    }

    // delete
    if (writeError) return { data: null, error: writeError };
    const remaining = this.table.rows.filter((r) => !matchesFilters(r, this.filters));
    this.table.rows = remaining;
    return { data: null, error: null };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export class FakeTable {
  rows: FakeRow[];
  private writeError?: FakeError;

  constructor(rows: FakeRow[] = []) {
    this.rows = rows;
  }

  /** The next insert/update/delete on this table resolves with this error
   * instead of mutating — for exercising 23P01-style race/constraint paths. */
  failNextWriteWith(error: FakeError) {
    this.writeError = error;
  }

  consumeWriteError(): FakeError | undefined {
    const err = this.writeError;
    this.writeError = undefined;
    return err;
  }

  select(_columns?: string, opts?: { count?: "exact"; head?: boolean }) {
    return new FakeQuery(this, "select", opts);
  }

  update(patch: FakeRow) {
    return new FakeQuery(this, "update", undefined, patch);
  }

  insert(row: FakeRow | FakeRow[]) {
    return new FakeQuery(this, "insert", undefined, row);
  }

  delete() {
    return new FakeQuery(this, "delete");
  }
}

interface FakeUser {
  id: string;
}

export interface FakeSupabaseOptions {
  user?: FakeUser | null;
  tables?: Record<string, FakeRow[]>;
  oauth?: { url?: string; error?: FakeError };
}

export class FakeSupabaseClient {
  private tables: Record<string, FakeTable> = {};
  private user: FakeUser | null;
  private oauth: FakeSupabaseOptions["oauth"];

  constructor(opts: FakeSupabaseOptions = {}) {
    this.user = opts.user ?? null;
    this.oauth = opts.oauth;
    for (const [name, rows] of Object.entries(opts.tables ?? {})) {
      this.tables[name] = new FakeTable(rows);
    }
  }

  auth = {
    getUser: async () => ({ data: { user: this.user }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithOAuth: async () => {
      if (this.oauth?.error) return { data: { url: null }, error: this.oauth.error };
      return { data: { url: this.oauth?.url ?? "https://accounts.google.com/o/oauth2/auth" }, error: null };
    },
  };

  from(table: string): FakeTable {
    if (!this.tables[table]) this.tables[table] = new FakeTable([]);
    return this.tables[table];
  }

  /** Direct access to a table's row array for assertions/seeding beyond the constructor. */
  table(name: string): FakeTable {
    return this.from(name);
  }
}
