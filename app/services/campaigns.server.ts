import type { Campaign } from "@prisma/client";
import db from "../db.server";
import { log, type ServiceContext } from "./shopify-client.server";
import { deleteDiscount, endDiscount, pushDiscount, setDiscountPaused } from "./discounts.server";

export interface CampaignInput {
  name: string;
  description?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
}

export function parseCampaignInput(
  raw: Record<string, FormDataEntryValue | null | undefined>,
): { data?: CampaignInput; errors: string[] } {
  const str = (k: string) => raw[k]?.toString().trim() || "";
  const errors: string[] = [];
  const startsAt = str("startsAt") ? new Date(str("startsAt")) : null;
  const endsAt = str("endsAt") ? new Date(str("endsAt")) : null;

  if (!str("name")) errors.push("Campaign name is required.");
  if (!startsAt || isNaN(startsAt.getTime())) errors.push("A valid start date is required.");
  if (endsAt && isNaN(endsAt.getTime())) errors.push("Invalid end date.");
  if (startsAt && endsAt && endsAt <= startsAt) errors.push("End date must be after the start date.");
  if (errors.length) return { errors };
  return {
    errors,
    data: { name: str("name"), description: str("description") || null, startsAt: startsAt!, endsAt },
  };
}

/** Status a live campaign should have at `now`, based only on its dates. */
export function dateStatus(c: Pick<Campaign, "startsAt" | "endsAt">, now = new Date()) {
  if (c.endsAt && c.endsAt <= now) return "ENDED";
  return c.startsAt > now ? "SCHEDULED" : "ACTIVE";
}

const TIMED = ["SCHEDULED", "ACTIVE"];

/**
 * Applies time-based transitions (SCHEDULED -> ACTIVE -> ENDED) to a shop's campaigns.
 * Shopify itself starts and ends the discounts by their dates; this keeps our records in step.
 */
export async function syncCampaignStatuses(ctx: ServiceContext) {
  const live = await db.campaign.findMany({ where: { shop: ctx.shop, status: { in: TIMED } } });
  for (const c of live) {
    const next = dateStatus(c);
    if (next === c.status) continue;
    await db.campaign.update({ where: { id: c.id }, data: { status: next } });
    if (next === "ENDED") {
      await db.discount.updateMany({
        where: { campaignId: c.id, status: "ACTIVE" },
        data: { status: "ENDED" },
      });
    }
    await log(ctx, {
      level: "INFO",
      module: "Scheduler",
      action: "CAMPAIGN_STATUS_CHANGED",
      message: `Campaign '${c.name}' moved ${c.status} -> ${next}`,
      entityType: "CAMPAIGN",
      entityId: c.id,
      before: { status: c.status },
      after: { status: next },
    });
  }
}

const auditCampaign = (
  ctx: ServiceContext,
  c: Campaign,
  action: string,
  message: string,
  before?: unknown,
  level: "INFO" | "WARN" | "ERROR" = "INFO",
) =>
  log(ctx, {
    level,
    module: "Campaign",
    action,
    message,
    entityType: "CAMPAIGN",
    entityId: c.id,
    before,
    after: { name: c.name, status: c.status, startsAt: c.startsAt, endsAt: c.endsAt },
  });

export async function createCampaign(ctx: ServiceContext, input: CampaignInput) {
  const c = await db.campaign.create({
    data: { shop: ctx.shop, ...input, status: "DRAFT", createdBy: ctx.actorId ?? null },
  });
  await auditCampaign(ctx, c, "CAMPAIGN_CREATED", `Created campaign '${c.name}'`);
  return c;
}

async function getCampaign(ctx: ServiceContext, id: string) {
  return db.campaign.findFirstOrThrow({ where: { id, shop: ctx.shop }, include: { discounts: true } });
}

/** Runs `fn` over every member discount, collecting failures instead of stopping. */
async function fanOut(
  discounts: { id: string; title: string }[],
  fn: (id: string) => Promise<unknown>,
) {
  const failures: { id: string; title: string; error: string }[] = [];
  for (const d of discounts) {
    try {
      await fn(d.id);
    } catch (err) {
      failures.push({ id: d.id, title: d.title, error: (err as Error).message });
    }
  }
  return failures;
}

async function finish(
  ctx: ServiceContext,
  c: Campaign,
  failures: { title: string; error: string }[],
  okStatus: string,
  action: string,
  message: string,
  before: unknown,
) {
  const status = failures.length ? "NEEDS_ATTENTION" : okStatus;
  const updated = await db.campaign.update({ where: { id: c.id }, data: { status } });
  await auditCampaign(
    ctx,
    updated,
    failures.length ? `${action}_PARTIAL_FAILURE` : action,
    failures.length
      ? `${message} with ${failures.length} failure(s): ${failures.map((f) => `${f.title}: ${f.error}`).join(" | ")}`
      : message,
    before,
    failures.length ? "ERROR" : "INFO",
  );
  return { campaign: updated, failures };
}

/** Pushes every member discount to Shopify using the campaign dates. Safe to retry. */
export async function activateCampaign(ctx: ServiceContext, id: string) {
  const c = await getCampaign(ctx, id);
  if (!c.discounts.length) {
    return { campaign: c, failures: [{ id: "", title: c.name, error: "Add at least one discount first." }] };
  }
  const window = { startsAt: c.startsAt, endsAt: c.endsAt };
  const failures = await fanOut(c.discounts, (d) => pushDiscount(ctx, d, window));
  return finish(ctx, c, failures, dateStatus(c), "CAMPAIGN_ACTIVATED", `Activated campaign '${c.name}'`, { status: c.status });
}

export async function pauseCampaign(ctx: ServiceContext, id: string) {
  const c = await getCampaign(ctx, id);
  const live = c.discounts.filter((d) => d.status === "ACTIVE" || d.status === "ERROR");
  const failures = await fanOut(live, (d) => setDiscountPaused(ctx, d, true));
  return finish(ctx, c, failures, "PAUSED", "CAMPAIGN_PAUSED", `Paused campaign '${c.name}'`, { status: c.status });
}

export async function resumeCampaign(ctx: ServiceContext, id: string) {
  const c = await getCampaign(ctx, id);
  const paused = c.discounts.filter((d) => d.status === "PAUSED" || d.status === "ERROR");
  const failures = await fanOut(paused, (d) => setDiscountPaused(ctx, d, false));
  return finish(ctx, c, failures, dateStatus(c), "CAMPAIGN_RESUMED", `Resumed campaign '${c.name}'`, { status: c.status });
}

export async function endCampaign(ctx: ServiceContext, id: string) {
  const c = await getCampaign(ctx, id);
  const failures = await fanOut(c.discounts, (d) => endDiscount(ctx, d));
  const cancelled = c.status === "DRAFT" || c.status === "SCHEDULED";
  if (!failures.length) {
    await db.campaign.update({ where: { id }, data: { ...(cancelled ? {} : { endsAt: new Date() }) } });
  }
  return finish(
    ctx,
    c,
    failures,
    cancelled ? "CANCELLED" : "ENDED",
    cancelled ? "CAMPAIGN_CANCELLED" : "CAMPAIGN_ENDED",
    `${cancelled ? "Cancelled" : "Ended"} campaign '${c.name}'`,
    { status: c.status },
  );
}

/** Changes dates; live members are re-pushed so Shopify uses the new window. */
export async function updateCampaign(ctx: ServiceContext, id: string, input: CampaignInput) {
  const c = await getCampaign(ctx, id);
  const updated = await db.campaign.update({ where: { id }, data: input });
  await auditCampaign(ctx, updated, "CAMPAIGN_UPDATED", `Updated campaign '${updated.name}'`, {
    name: c.name,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
  });
  if (c.status === "DRAFT" || c.status === "CANCELLED" || c.status === "ENDED") {
    await db.discount.updateMany({ where: { campaignId: id }, data: { startsAt: input.startsAt, endsAt: input.endsAt ?? null } });
    return { campaign: updated, failures: [] };
  }
  const window = { startsAt: input.startsAt, endsAt: input.endsAt ?? null };
  const wasPaused = c.status === "PAUSED";
  const failures = await fanOut(
    c.discounts.filter((d) => d.shopifyDiscountId),
    async (d) => {
      await pushDiscount(ctx, d, window);
      if (wasPaused) await setDiscountPaused(ctx, d, true);
    },
  );
  return finish(ctx, updated, failures, wasPaused ? "PAUSED" : dateStatus(updated), "CAMPAIGN_DATES_SYNCED", `Synced dates for '${updated.name}'`, undefined);
}

export async function duplicateCampaign(ctx: ServiceContext, id: string) {
  const c = await getCampaign(ctx, id);
  const copy = await db.campaign.create({
    data: {
      shop: ctx.shop,
      name: `${c.name} (copy)`,
      description: c.description,
      startsAt: new Date(),
      endsAt: null,
      status: "DRAFT",
      createdBy: ctx.actorId ?? null,
    },
  });
  for (const d of c.discounts) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    await db.discount.create({
      data: {
        shop: ctx.shop,
        campaignId: copy.id,
        title: d.title,
        method: d.method,
        code: d.code ? `${d.code}-${suffix}` : null,
        valueType: d.valueType,
        value: d.value,
        targetType: d.targetType,
        targetIds: d.targetIds,
        floorType: d.floorType,
        floorValue: d.floorValue,
        minQuantity: d.minQuantity,
        minSubtotal: d.minSubtotal,
        combinesWith: d.combinesWith,
        status: "DRAFT",
        createdBy: ctx.actorId ?? null,
      },
    });
  }
  await auditCampaign(ctx, copy, "CAMPAIGN_DUPLICATED", `Duplicated '${c.name}' as '${copy.name}'`);
  return copy;
}

export async function deleteCampaign(ctx: ServiceContext, id: string) {
  const c = await getCampaign(ctx, id);
  if (!["DRAFT", "ENDED", "CANCELLED"].includes(c.status)) {
    throw new Error("End or cancel the campaign before deleting it.");
  }
  for (const d of c.discounts) await deleteDiscount(ctx, d.id);
  await db.campaign.delete({ where: { id } });
  await auditCampaign(ctx, c, "CAMPAIGN_DELETED", `Deleted campaign '${c.name}'`, { status: c.status });
}

/** Attaches a discount created while the campaign is already live. */
export async function pushIfCampaignLive(ctx: ServiceContext, campaignId: string, discountId: string) {
  const c = await db.campaign.findFirst({ where: { id: campaignId, shop: ctx.shop } });
  if (c && (c.status === "SCHEDULED" || c.status === "ACTIVE")) {
    await pushDiscount(ctx, discountId, { startsAt: c.startsAt, endsAt: c.endsAt });
  }
}
