import { randomInt } from "node:crypto";
import db from "../db.server";
import { csvRecords, streamCsv } from "./csv.server";
import { createDiscount, parseDiscountInput, type DiscountInput } from "./discounts.server";
import { pushIfCampaignLive } from "./campaigns.server";
import { log, ShopifyUserError, type ServiceContext } from "./shopify-client.server";

import { MAX_GENERATE, MAX_IMPORT_ROWS } from "../../shared/bulk-limits.js";

export { MAX_GENERATE, MAX_IMPORT_ROWS };

// No 0/O/1/I so codes survive being read aloud or printed.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCodePart(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Generates `count` unique codes, avoiding anything in `taken`. Throws if it cannot find enough. */
export function generateCodes(count: number, prefix: string, length: number, taken: Set<string> = new Set()) {
  const codes: string[] = [];
  const seen = new Set(taken);
  let attempts = 0;
  while (codes.length < count) {
    if (++attempts > count * 20 + 100) throw new Error("Could not generate enough unique codes. Use a longer code.");
    const code = prefix ? `${prefix}-${randomCodePart(length)}` : randomCodePart(length);
    if (seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

export interface RowResult {
  line: number;
  label: string;
  ok: boolean;
  error?: string;
}

export interface BatchResult {
  mode: "validate" | "run";
  created: number;
  failed: number;
  rows: RowResult[];
  error?: string;
}

const truthy = (v: string) => ["true", "yes", "1", "y"].includes(v.trim().toLowerCase());
const falsy = (v: string) => ["false", "no", "0", "n"].includes(v.trim().toLowerCase());
const boolStr = (v: string | undefined, dflt: boolean) =>
  !v ? String(dflt) : truthy(v) ? "true" : falsy(v) ? "false" : "invalid";

async function ownedCampaignId(shop: string, id: string | null | undefined) {
  if (!id) return { id: null as string | null };
  const c = await db.campaign.findFirst({ where: { id, shop }, select: { id: true } });
  return c ? { id: c.id } : { error: "Campaign not found." };
}

/** Bulk-generates CODE discounts that share one configuration. */
export async function generateDiscounts(
  ctx: ServiceContext,
  form: Record<string, FormDataEntryValue | null | undefined>,
): Promise<BatchResult> {
  const fail = (error: string): BatchResult => ({ mode: "run", created: 0, failed: 0, rows: [], error });
  const str = (k: string) => form[k]?.toString().trim() || "";

  const count = Number(str("count"));
  const length = Number(str("codeLength") || 8);
  const prefix = str("prefix").toUpperCase();
  if (!Number.isInteger(count) || count < 1 || count > MAX_GENERATE) {
    return fail(`Quantity must be between 1 and ${MAX_GENERATE}.`);
  }
  if (!Number.isInteger(length) || length < 4 || length > 12) return fail("Random part length must be between 4 and 12.");
  if (prefix && !/^[A-Z0-9_-]{1,12}$/.test(prefix)) return fail("Prefix: up to 12 letters, numbers, dash or underscore.");

  // Validate the shared config once, using a placeholder code.
  const sample = parseDiscountInput({ ...form, method: "CODE", code: "VALIDATE" });
  if (!sample.data) return fail(sample.errors.join(" "));

  const campaign = await ownedCampaignId(ctx.shop, str("campaignId"));
  if (campaign.error) return fail(campaign.error);

  const existing = await db.discount.findMany({ where: { shop: ctx.shop, code: { not: null } }, select: { code: true } });
  const codes = generateCodes(count, prefix, length, new Set(existing.map((e) => e.code!)));
  const push = str("saveAsDraft") !== "true";

  const rows: RowResult[] = [];
  for (const [i, code] of codes.entries()) {
    const input: DiscountInput = {
      ...sample.data,
      title: `${sample.data.title} #${i + 1}`,
      code,
      campaignId: campaign.id,
    };
    try {
      const d = await createDiscount(ctx, input, { push });
      if (campaign.id) await pushIfCampaignLive(ctx, campaign.id, d.id);
      rows.push({ line: i + 1, label: code, ok: d.status !== "ERROR", error: d.lastSyncError ?? undefined });
    } catch (err) {
      rows.push({ line: i + 1, label: code, ok: false, error: (err as Error).message });
    }
  }
  return summarise(ctx, "run", rows, "DISCOUNTS_BULK_GENERATED", "Bulk-generated");
}

const IMPORT_FIELDS = [
  "title", "method", "code", "valueType", "value", "targetType", "targetIds", "floorType", "floorValue",
  "minQuantity", "minSubtotal", "usageLimit", "oncePerCustomer", "combineProduct", "combineOrder",
  "combineShipping", "startsAt", "endsAt", "campaign",
] as const;

/** Validates (and optionally creates) discounts from CSV text. Valid rows import even if others fail. */
export async function importDiscountsCsv(ctx: ServiceContext, text: string, dryRun: boolean): Promise<BatchResult> {
  const { records, headers } = csvRecords(text);
  const mode = dryRun ? "validate" : "run";
  const fail = (error: string): BatchResult => ({ mode, created: 0, failed: 0, rows: [], error });
  const missing = ["title", "valueType", "value"].filter((h) => !headers.includes(h));
  if (missing.length) return fail(`Missing required column(s): ${missing.join(", ")}.`);
  if (!records.length) return fail("The file has no data rows.");
  if (records.length > MAX_IMPORT_ROWS) return fail(`Import at most ${MAX_IMPORT_ROWS} rows at a time.`);

  const [existing, campaigns] = await Promise.all([
    db.discount.findMany({ where: { shop: ctx.shop, code: { not: null } }, select: { code: true } }),
    db.campaign.findMany({ where: { shop: ctx.shop }, select: { id: true, name: true } }),
  ]);
  const taken = new Set(existing.map((e) => e.code!));
  const byName = new Map(campaigns.map((c) => [c.name.toLowerCase(), c.id]));

  const rows: RowResult[] = [];
  for (const { line, values: v } of records) {
    const code = (v.code || "").toUpperCase();
    const label = code || v.title || `row ${line}`;
    const errors: string[] = [];

    const method = (v.method || (code ? "CODE" : "AUTOMATIC")).toUpperCase();
    if (method !== "CODE" && method !== "AUTOMATIC") errors.push("Method must be CODE or AUTOMATIC.");
    const ids = (v.targetIds || "").split(";").map((s) => s.trim()).filter(Boolean);
    for (const k of ["oncePerCustomer", "combineProduct", "combineOrder", "combineShipping"] as const) {
      if (boolStr(v[k], k === "combineShipping") === "invalid") errors.push(`${k} must be true or false.`);
    }

    const parsed = parseDiscountInput({
      ...Object.fromEntries(IMPORT_FIELDS.map((f) => [f, v[f]])),
      method,
      code,
      targetIds: JSON.stringify(ids),
      floorType: v.floorType ? v.floorType.toUpperCase() : "NONE",
      valueType: (v.valueType || "").toUpperCase(),
      targetType: (v.targetType || "ALL").toUpperCase(),
      oncePerCustomer: boolStr(v.oncePerCustomer, false),
      combineProduct: boolStr(v.combineProduct, false),
      combineOrder: boolStr(v.combineOrder, false),
      combineShipping: boolStr(v.combineShipping, true),
    });
    errors.push(...parsed.errors);

    let campaignId: string | null = null;
    if (v.campaign) {
      campaignId = byName.get(v.campaign.toLowerCase()) ?? null;
      if (!campaignId) errors.push(`Campaign '${v.campaign}' not found.`);
    }
    if (method === "CODE" && code && taken.has(code)) {
      errors.push(`Code ${code} already exists or is repeated in the file.`);
    }

    if (errors.length || !parsed.data) {
      rows.push({ line, label, ok: false, error: [...new Set(errors)].join(" ") });
      continue;
    }
    if (code && method === "CODE") taken.add(code);
    if (dryRun) {
      rows.push({ line, label, ok: true });
      continue;
    }
    try {
      const d = await createDiscount(ctx, { ...parsed.data, campaignId }, { push: !campaignId });
      if (campaignId) await pushIfCampaignLive(ctx, campaignId, d.id);
      rows.push({ line, label, ok: d.status !== "ERROR", error: d.lastSyncError ?? undefined });
    } catch (err) {
      rows.push({
        line,
        label,
        ok: false,
        error: err instanceof ShopifyUserError ? err.message : (err as Error).message,
      });
    }
  }
  return summarise(ctx, mode, rows, "DISCOUNTS_IMPORTED", "Imported");
}

async function summarise(
  ctx: ServiceContext,
  mode: BatchResult["mode"],
  rows: RowResult[],
  action: string,
  verb: string,
): Promise<BatchResult> {
  const created = rows.filter((r) => r.ok).length;
  const failed = rows.length - created;
  if (mode === "run") {
    await log(ctx, {
      level: failed ? "WARN" : "INFO",
      module: "AdminUI",
      action,
      message: `${verb} discounts: ${created} succeeded, ${failed} failed`,
      entityType: "DISCOUNT",
      metadata: { created, failed },
    });
  }
  return { mode, created, failed, rows };
}

export const DISCOUNT_EXPORT_COLUMNS = [
  "title", "method", "code", "valueType", "value", "targetType", "targetIds", "floorType", "floorValue",
  "minQuantity", "minSubtotal", "usageLimit", "oncePerCustomer", "combineProduct", "combineOrder",
  "combineShipping", "startsAt", "endsAt", "campaign", "id", "status", "shopifyDiscountId",
] as const;

export const DISCOUNT_TEMPLATE_CSV =
  DISCOUNT_EXPORT_COLUMNS.slice(0, 19).join(",") +
  '\n"Festive 30% off","CODE","FESTIVE30","PERCENTAGE","30","ALL","","AMOUNT","299","1","0","500","false","false","false","true","2026-11-01","2026-11-15",""\n';

export function exportDiscountsCsv(shop: string, filters: { q?: string; status?: string; type?: string; ids?: string[] }) {
  const where = {
    shop,
    ...(filters.ids && filters.ids.length > 0 ? { id: { in: filters.ids } } : {}),
    ...(filters.status && !/^all/i.test(filters.status) ? { status: filters.status.toUpperCase() } : {}),
    ...(filters.type === "Percentage"
      ? { valueType: "PERCENTAGE" }
      : filters.type === "Fixed Amount"
        ? { valueType: "FIXED_AMOUNT" }
        : {}),
    ...(filters.q ? { OR: [{ title: { contains: filters.q } }, { code: { contains: filters.q } }] } : {}),
  };
  return streamCsv(
    DISCOUNT_EXPORT_COLUMNS,
    async (cursor) => {
      const rows = await db.discount.findMany({
        where,
        include: { campaign: { select: { name: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 500,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      return { rows, cursor: rows.length ? rows[rows.length - 1].id : null };
    },
    (d) => {
      const c = d.combinesWith ? JSON.parse(d.combinesWith) : { product: false, order: false, shipping: true };
      return [
        d.title, d.method, d.code, d.valueType, d.value, d.targetType,
        d.targetIds ? (JSON.parse(d.targetIds) as string[]).join(";") : "",
        d.floorType, d.floorValue, d.minQuantity, d.minSubtotal, d.usageLimit, d.oncePerCustomer,
        !!c.product, !!c.order, !!c.shipping, d.startsAt, d.endsAt, d.campaign?.name, d.id, d.status, d.shopifyDiscountId,
      ];
    },
  );
}
