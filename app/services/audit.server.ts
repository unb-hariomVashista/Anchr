import type { Prisma } from "@prisma/client";
import db from "../db.server";
import { logEvent } from "../logger.server";

export const PAGE_SIZE = 50;
const DAY = 24 * 60 * 60 * 1000;
const LOG_RETENTION_DAYS = 90;
const AUDIT_RETENTION_DAYS = 365;

export interface LogFilters {
  level?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  q?: string;
  from?: string;
  to?: string;
  ids?: string[];
}

export function filtersFromParams(params: URLSearchParams): LogFilters {
  const get = (k: string) => {
    const v = params.get(k)?.trim();
    return v && v !== "ALL" ? v : undefined;
  };
  const idsParam = params.get("ids")?.trim();
  return {
    level: get("level"),
    module: get("module"),
    entityType: get("entityType"),
    entityId: get("entityId"),
    q: get("q"),
    from: get("from"),
    to: get("to"),
    ids: idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
  };
}

function where(shop: string, f: LogFilters): Prisma.AuditLogWhereInput {
  const range: Prisma.DateTimeFilter = {};
  if (f.from && !isNaN(Date.parse(f.from))) range.gte = new Date(f.from);
  if (f.to && !isNaN(Date.parse(f.to))) range.lte = new Date(new Date(f.to).getTime() + DAY - 1);

  return {
    shop,
    ...(f.ids && f.ids.length > 0 ? { id: { in: f.ids } } : {}),
    ...(f.level ? { level: f.level } : {}),
    ...(f.module ? { module: f.module } : {}),
    ...(f.entityType ? { entityType: f.entityType } : {}),
    ...(f.entityId ? { entityId: f.entityId } : {}),
    ...(Object.keys(range).length ? { timestamp: range } : {}),
    ...(f.q
      ? { OR: [{ message: { contains: f.q } }, { action: { contains: f.q } }] }
      : {}),
  };
}

/** Cursor pagination on (timestamp desc, id desc). `cursor` is the id of the last row seen. */
export async function queryLogs(shop: string, filters: LogFilters, cursor?: string | null) {
  const rows = await db.auditLog.findMany({
    where: where(shop, filters),
    orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return { logs: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Guard against spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

const CSV_COLUMNS = [
  "timestamp",
  "level",
  "module",
  "action",
  "message",
  "actorId",
  "entityType",
  "entityId",
  "requestId",
  "before",
  "after",
  "metadata",
] as const;

/** Streams matching rows as CSV in batches so large exports do not load into memory. */
export function exportLogsCsv(shop: string, filters: LogFilters): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cursor: string | null = null;
  let headerSent = false;
  const w = where(shop, filters);

  return new ReadableStream({
    async pull(controller) {
      if (!headerSent) {
        controller.enqueue(encoder.encode(CSV_COLUMNS.join(",") + "\n"));
        headerSent = true;
      }
      const rows = await db.auditLog.findMany({
        where: w,
        orderBy: [{ timestamp: "desc" }, { id: "desc" }],
        take: 500,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!rows.length) return controller.close();
      cursor = rows[rows.length - 1].id;
      controller.enqueue(
        encoder.encode(rows.map((r) => CSV_COLUMNS.map((c) => csvCell(r[c])).join(",")).join("\n") + "\n"),
      );
    },
  });
}

/**
 * Deletes expired rows: DEBUG/INFO engine logs after 90 days, audit-trail entries
 * (those linked to an entity) after 1 year, WARN/ERROR after 1 year.
 */
export async function purgeExpiredLogs() {
  const logCutoff = new Date(Date.now() - LOG_RETENTION_DAYS * DAY);
  const auditCutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * DAY);

  const [logs, audit] = await Promise.all([
    db.auditLog.deleteMany({
      where: { timestamp: { lt: logCutoff }, level: { in: ["DEBUG", "INFO"] }, entityType: null },
    }),
    db.auditLog.deleteMany({ where: { timestamp: { lt: auditCutoff } } }),
  ]);
  return { deleted: logs.count + audit.count };
}

let lastPurge = 0;

/** Runs the purge at most once a day per server process; called from the logs route loader. */
export async function purgeIfDue(shop: string) {
  if (Date.now() - lastPurge < DAY) return;
  lastPurge = Date.now();
  const { deleted } = await purgeExpiredLogs();
  if (deleted > 0) {
    await logEvent({
      shop,
      level: "INFO",
      module: "Scheduler",
      action: "LOG_PURGE",
      message: `Purged ${deleted} expired log entries`,
      entityType: "SYSTEM",
    });
  }
}
