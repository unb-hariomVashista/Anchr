import db from "../db.server";
import { csvRecords, streamCsv } from "./csv.server";
import { createCampaign, parseCampaignInput } from "./campaigns.server";
import { MAX_IMPORT_ROWS } from "../../shared/bulk-limits.js";
import type { BatchResult, RowResult } from "./discount-bulk.server";
import { log, type ServiceContext } from "./shopify-client.server";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

async function finish(ctx: ServiceContext, mode: BatchResult["mode"], rows: RowResult[], action: string, verb: string) {
  const created = rows.filter((r) => r.ok).length;
  const failed = rows.length - created;
  if (mode === "run") {
    await log(ctx, {
      level: failed ? "WARN" : "INFO",
      module: "Campaign",
      action,
      message: `${verb} campaigns: ${created} succeeded, ${failed} failed`,
      entityType: "CAMPAIGN",
      metadata: { created, failed },
    });
  }
  return { mode, created, failed, rows } satisfies BatchResult;
}

/** Validates (and optionally creates) DRAFT campaigns from CSV text. */
export async function importCampaignsCsv(ctx: ServiceContext, text: string, dryRun: boolean): Promise<BatchResult> {
  const { records, headers } = csvRecords(text);
  const mode = dryRun ? "validate" : "run";
  const fail = (error: string): BatchResult => ({ mode, created: 0, failed: 0, rows: [], error });
  const missing = ["name", "startsAt"].filter((h) => !headers.includes(h));
  if (missing.length) return fail(`Missing required column(s): ${missing.join(", ")}.`);
  if (!records.length) return fail("The file has no data rows.");
  if (records.length > MAX_IMPORT_ROWS) return fail(`Import at most ${MAX_IMPORT_ROWS} rows at a time.`);

  const existing = await db.campaign.findMany({ where: { shop: ctx.shop }, select: { name: true } });
  const taken = new Set(existing.map((c) => c.name.toLowerCase()));

  const rows: RowResult[] = [];
  for (const { line, values: v } of records) {
    const label = v.name || `row ${line}`;
    const parsed = parseCampaignInput(v);
    const errors = [...parsed.errors];
    if (v.name && taken.has(v.name.toLowerCase())) errors.push(`Campaign name '${v.name}' already exists or is repeated in the file.`);
    if (errors.length || !parsed.data) {
      rows.push({ line, label, ok: false, error: errors.join(" ") });
      continue;
    }
    taken.add(v.name.toLowerCase());
    if (dryRun) {
      rows.push({ line, label, ok: true });
      continue;
    }
    try {
      await createCampaign(ctx, parsed.data);
      rows.push({ line, label, ok: true });
    } catch (err) {
      rows.push({ line, label, ok: false, error: (err as Error).message });
    }
  }
  return finish(ctx, mode, rows, "CAMPAIGNS_IMPORTED", "Imported");
}

export const CAMPAIGN_EXPORT_COLUMNS = ["name", "description", "startsAt", "endsAt", "id", "status", "discountCount"] as const;

export const CAMPAIGN_TEMPLATE_CSV =
  CAMPAIGN_EXPORT_COLUMNS.slice(0, 4).join(",") +
  '\n"Festive Offer Sale","Festive offers across key categories","2026-11-01","2026-11-15"\n';

export function exportCampaignsCsv(shop: string, filters: { q?: string; status?: string; ids?: string[] }) {
  const where = {
    shop,
    ...(filters.ids && filters.ids.length > 0 ? { id: { in: filters.ids } } : {}),
    ...(filters.status && !/^all/i.test(filters.status) ? { status: filters.status.toUpperCase() } : {}),
    ...(filters.q ? { name: { contains: filters.q } } : {}),
  };
  return streamCsv(
    CAMPAIGN_EXPORT_COLUMNS,
    async (cursor) => {
      const rows = await db.campaign.findMany({
        where,
        include: { _count: { select: { discounts: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 500,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      return { rows, cursor: rows.length ? rows[rows.length - 1].id : null };
    },
    (c) => [c.name, c.description, iso(c.startsAt), iso(c.endsAt), c.id, c.status, c._count.discounts],
  );
}
