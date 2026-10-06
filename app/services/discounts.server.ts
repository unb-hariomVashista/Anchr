import type { Discount } from "@prisma/client";
import db from "../db.server";
import { validateDiscountConfig } from "../../shared/mrp-math.js";
import {
  adminMutation,
  log,
  ShopifyUserError,
  type ServiceContext,
} from "./shopify-client.server";

const FUNCTION_HANDLE = "mrp-discount";

export interface DiscountInput {
  title: string;
  method: "AUTOMATIC" | "CODE";
  code?: string | null;
  valueType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  targetType: "ALL" | "PRODUCTS" | "COLLECTIONS";
  targetIds: string[];
  floorType?: "AMOUNT" | "PERCENT_OF_MRP" | null;
  floorValue?: number | null;
  minQuantity?: number | null;
  minSubtotal?: number | null;
  combinesWith?: { product: boolean; order: boolean; shipping: boolean };
  startsAt?: Date | null;
  endsAt?: Date | null;
  campaignId?: string | null;
}

const DEFAULT_COMBINES = { product: false, order: false, shipping: true };

/** Normalises and validates raw form values. Returns errors instead of throwing. */
export function parseDiscountInput(
  raw: Record<string, FormDataEntryValue | null | undefined>,
): { data?: DiscountInput; errors: string[] } {
  const str = (k: string) => raw[k]?.toString().trim() || "";
  const num = (k: string) => (str(k) === "" ? null : Number(str(k)));

  const method = str("method") === "CODE" ? "CODE" : "AUTOMATIC";
  let targetIds: string[] = [];
  try {
    targetIds = JSON.parse(str("targetIds") || "[]");
  } catch {
    /* handled below */
  }

  const data: DiscountInput = {
    title: str("title"),
    method,
    code: method === "CODE" ? str("code").toUpperCase() : null,
    valueType: str("valueType") as DiscountInput["valueType"],
    value: Number(str("value")),
    targetType: (str("targetType") || "ALL") as DiscountInput["targetType"],
    targetIds,
    floorType: (str("floorType") === "NONE" ? null : str("floorType") || null) as DiscountInput["floorType"],
    floorValue: num("floorValue"),
    minQuantity: num("minQuantity"),
    minSubtotal: num("minSubtotal"),
    combinesWith: {
      product: str("combineProduct") === "true",
      order: str("combineOrder") === "true",
      shipping: str("combineShipping") !== "false",
    },
    startsAt: str("startsAt") ? new Date(str("startsAt")) : null,
    endsAt: str("endsAt") ? new Date(str("endsAt")) : null,
  };

  const errors = [...validateDiscountConfig(data)];
  if (!data.title) errors.push("Title is required.");
  if (method === "CODE" && !/^[A-Z0-9_-]{3,32}$/.test(data.code || "")) {
    errors.push("Code must be 3-32 characters: letters, numbers, dash or underscore.");
  }
  if (!["ALL", "PRODUCTS", "COLLECTIONS"].includes(data.targetType)) errors.push("Invalid target.");
  if (data.targetType !== "ALL" && !Array.isArray(targetIds)) errors.push("Invalid target selection.");
  if (data.targetType !== "ALL" && Array.isArray(targetIds) && targetIds.length === 0) {
    errors.push("Select at least one product or collection.");
  }
  for (const [k, v] of [["Minimum quantity", data.minQuantity], ["Minimum subtotal", data.minSubtotal]] as const) {
    if (v != null && (!Number.isFinite(v) || v < 0)) errors.push(`${k} must be zero or more.`);
  }
  if (data.startsAt && isNaN(data.startsAt.getTime())) errors.push("Invalid start date.");
  if (data.endsAt && isNaN(data.endsAt.getTime())) errors.push("Invalid end date.");
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
    errors.push("End date must be after the start date.");
  }
  return errors.length ? { errors } : { data, errors };
}

/** Config JSON read by the Shopify Function from the `$app:mrp-config` metafield. */
export function functionConfig(d: Pick<Discount, "valueType" | "value" | "floorType" | "floorValue" | "targetType" | "targetIds" | "minQuantity" | "minSubtotal">) {
  return {
    valueType: d.valueType,
    value: d.value,
    floorType: d.floorType,
    floorValue: d.floorValue,
    targetType: d.targetType,
    targetIds: d.targetIds ? JSON.parse(d.targetIds) : [],
    // Variables for the input query: collection membership is evaluated by Shopify.
    collectionIds: d.targetType === "COLLECTIONS" && d.targetIds ? JSON.parse(d.targetIds) : [],
    minQuantity: d.minQuantity,
    minSubtotal: d.minSubtotal,
  };
}

function combines(d: Pick<Discount, "combinesWith">) {
  const c = d.combinesWith ? JSON.parse(d.combinesWith) : DEFAULT_COMBINES;
  return { productDiscounts: !!c.product, orderDiscounts: !!c.order, shippingDiscounts: !!c.shipping };
}

const snapshot = (d: Discount) => ({
  title: d.title,
  method: d.method,
  code: d.code,
  valueType: d.valueType,
  value: d.value,
  targetType: d.targetType,
  targetIds: d.targetIds,
  floorType: d.floorType,
  floorValue: d.floorValue,
  status: d.status,
  startsAt: d.startsAt,
  endsAt: d.endsAt,
  campaignId: d.campaignId,
  shopifyDiscountId: d.shopifyDiscountId,
});

const isCode = (d: Pick<Discount, "method">) => d.method === "CODE";

const CREATE = {
  AUTOMATIC: {
    query: `#graphql
      mutation CreateAutomatic($input: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $input) {
          automaticAppDiscount { discountId }
          userErrors { field message }
        }
      }`,
    key: "discountAutomaticAppCreate",
    pick: (r: any) => r.automaticAppDiscount?.discountId as string | undefined,
  },
  CODE: {
    query: `#graphql
      mutation CreateCode($input: DiscountCodeAppInput!) {
        discountCodeAppCreate(codeAppDiscount: $input) {
          codeAppDiscount { discountId }
          userErrors { field message }
        }
      }`,
    key: "discountCodeAppCreate",
    pick: (r: any) => r.codeAppDiscount?.discountId as string | undefined,
  },
};

function shopifyInput(d: Discount, window: { startsAt?: Date | null; endsAt?: Date | null }) {
  return {
    title: d.title,
    ...(isCode(d) ? { code: d.code } : {}),
    functionHandle: FUNCTION_HANDLE,
    discountClasses: ["PRODUCT"],
    startsAt: (window.startsAt ?? new Date()).toISOString(),
    endsAt: window.endsAt ? window.endsAt.toISOString() : null,
    combinesWith: combines(d),
    metafields: [
      {
        namespace: "$app",
        key: "mrp-config",
        type: "json",
        value: JSON.stringify(functionConfig(d)),
      },
    ],
  };
}

export async function createDiscount(ctx: ServiceContext, input: DiscountInput) {
  if (input.method === "CODE") {
    const clash = await db.discount.findFirst({ where: { shop: ctx.shop, code: input.code! } });
    if (clash) throw new ShopifyUserError([{ message: `Code ${input.code} is already used by another discount.` }]);
  }

  const created = await db.discount.create({
    data: {
      shop: ctx.shop,
      campaignId: input.campaignId ?? null,
      title: input.title,
      method: input.method,
      code: input.code ?? null,
      valueType: input.valueType,
      value: input.value,
      targetType: input.targetType,
      targetIds: JSON.stringify(input.targetIds),
      floorType: input.floorType ?? null,
      floorValue: input.floorValue ?? null,
      minQuantity: input.minQuantity ?? null,
      minSubtotal: input.minSubtotal ?? null,
      combinesWith: JSON.stringify(input.combinesWith ?? DEFAULT_COMBINES),
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      status: "DRAFT",
      createdBy: ctx.actorId ?? null,
    },
  });

  await log(ctx, {
    level: "INFO",
    module: "AdminUI",
    action: "DISCOUNT_CREATED",
    message: `Created discount '${created.title}'`,
    entityType: "DISCOUNT",
    entityId: created.id,
    after: snapshot(created),
  });

  // Discounts that belong to a campaign go live when the campaign is activated.
  if (created.campaignId) return created;
  return pushDiscount(ctx, created.id);
}

/**
 * Makes the discount exist and be active in Shopify. Idempotent: creates it if it has
 * no Shopify id yet, otherwise re-activates it. Failures are stored on the row.
 * `window` overrides the dates (campaign dates take precedence).
 */
export async function pushDiscount(
  ctx: ServiceContext,
  id: string,
  window?: { startsAt?: Date | null; endsAt?: Date | null },
): Promise<Discount> {
  const d = await db.discount.findFirstOrThrow({ where: { id, shop: ctx.shop } });
  const before = snapshot(d);
  const dates = window ?? { startsAt: d.startsAt, endsAt: d.endsAt };

  try {
    let shopifyDiscountId = d.shopifyDiscountId;
    if (!shopifyDiscountId) {
      const spec = CREATE[d.method === "CODE" ? "CODE" : "AUTOMATIC"];
      const res = await adminMutation(ctx, "DISCOUNT_CREATE", spec.query, { input: shopifyInput(d, dates) }, spec.key, {
        type: "DISCOUNT",
        id: d.id,
      });
      shopifyDiscountId = spec.pick(res) ?? null;
    } else {
      await updateShopifyDiscount(ctx, d, dates);
      await setShopifyActive(ctx, d, true);
    }

    const updated = await db.discount.update({
      where: { id },
      data: {
        shopifyDiscountId,
        status: "ACTIVE",
        lastSyncError: null,
        startsAt: dates.startsAt ?? d.startsAt,
        endsAt: dates.endsAt ?? d.endsAt,
      },
    });
    await log(ctx, {
      level: "INFO",
      module: "Engine",
      action: "DISCOUNT_ACTIVATED",
      message: `Discount '${d.title}' is live in Shopify`,
      entityType: "DISCOUNT",
      entityId: id,
      before,
      after: snapshot(updated),
    });
    return updated;
  } catch (err) {
    const message = (err as Error).message;
    const failed = await db.discount.update({ where: { id }, data: { status: "ERROR", lastSyncError: message } });
    await log(ctx, {
      level: "ERROR",
      module: "Engine",
      action: "DISCOUNT_SYNC_FAILED",
      message: `Could not sync '${d.title}' to Shopify: ${message}`,
      entityType: "DISCOUNT",
      entityId: id,
    });
    if (err instanceof ShopifyUserError) throw err;
    return failed;
  }
}

async function setShopifyActive(ctx: ServiceContext, d: Discount, active: boolean) {
  const kind = isCode(d) ? "Code" : "Automatic";
  const verb = active ? "Activate" : "Deactivate";
  const key = `discount${kind}${verb}`;
  const nodeField = isCode(d) ? "codeDiscountNode" : "automaticDiscountNode";
  return adminMutation(
    ctx,
    `DISCOUNT_${verb.toUpperCase()}`,
    `#graphql
      mutation ${verb}${kind}($id: ID!) {
        ${key}(id: $id) {
          ${nodeField} { id }
          userErrors { field message }
        }
      }`,
    { id: d.shopifyDiscountId },
    key,
    { type: "DISCOUNT", id: d.id },
  );
}

async function updateShopifyDiscount(
  ctx: ServiceContext,
  d: Discount,
  window: { startsAt?: Date | null; endsAt?: Date | null },
) {
  const kind = isCode(d) ? "Code" : "Automatic";
  const key = `discount${kind}AppUpdate`;
  const argName = isCode(d) ? "codeAppDiscount" : "automaticAppDiscount";
  const inputType = isCode(d) ? "DiscountCodeAppInput" : "DiscountAutomaticAppInput";
  // functionHandle cannot be changed on update.
  const { functionHandle: _omit, ...input } = shopifyInput(d, window);
  return adminMutation(
    ctx,
    "DISCOUNT_UPDATE",
    `#graphql
      mutation Update${kind}($id: ID!, $input: ${inputType}!) {
        ${key}(id: $id, ${argName}: $input) {
          userErrors { field message }
        }
      }`,
    { id: d.shopifyDiscountId, input },
    key,
    { type: "DISCOUNT", id: d.id },
  );
}

export async function setDiscountPaused(ctx: ServiceContext, id: string, paused: boolean) {
  const d = await db.discount.findFirstOrThrow({ where: { id, shop: ctx.shop } });
  const before = snapshot(d);

  if (!d.shopifyDiscountId) {
    return paused ? d : pushDiscount(ctx, id);
  }

  try {
    await setShopifyActive(ctx, d, !paused);
    const updated = await db.discount.update({
      where: { id },
      data: { status: paused ? "PAUSED" : "ACTIVE", lastSyncError: null },
    });
    await log(ctx, {
      level: "INFO",
      module: "AdminUI",
      action: paused ? "DISCOUNT_PAUSED" : "DISCOUNT_RESUMED",
      message: `${paused ? "Paused" : "Resumed"} discount '${d.title}'`,
      entityType: "DISCOUNT",
      entityId: id,
      before,
      after: snapshot(updated),
    });
    return updated;
  } catch (err) {
    await db.discount.update({ where: { id }, data: { status: "ERROR", lastSyncError: (err as Error).message } });
    throw err;
  }
}

export async function updateDiscount(ctx: ServiceContext, id: string, input: DiscountInput) {
  const d = await db.discount.findFirstOrThrow({ where: { id, shop: ctx.shop } });
  if (d.method !== input.method || (d.method === "CODE" && d.code !== input.code)) {
    throw new ShopifyUserError([{ message: "Method and code cannot be changed after creation." }]);
  }
  const before = snapshot(d);

  const updated = await db.discount.update({
    where: { id },
    data: {
      title: input.title,
      valueType: input.valueType,
      value: input.value,
      targetType: input.targetType,
      targetIds: JSON.stringify(input.targetIds),
      floorType: input.floorType ?? null,
      floorValue: input.floorValue ?? null,
      minQuantity: input.minQuantity ?? null,
      minSubtotal: input.minSubtotal ?? null,
      combinesWith: JSON.stringify(input.combinesWith ?? DEFAULT_COMBINES),
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    },
  });

  if (updated.shopifyDiscountId) {
    try {
      await updateShopifyDiscount(ctx, updated, { startsAt: updated.startsAt, endsAt: updated.endsAt });
    } catch (err) {
      await db.discount.update({ where: { id }, data: { status: "ERROR", lastSyncError: (err as Error).message } });
      throw err;
    }
  }

  await log(ctx, {
    level: "INFO",
    module: "AdminUI",
    action: "DISCOUNT_UPDATED",
    message: `Updated discount '${updated.title}'`,
    entityType: "DISCOUNT",
    entityId: id,
    before,
    after: snapshot(updated),
  });
  return updated;
}

/** Deactivates in Shopify and marks the discount ended, e.g. when a campaign ends. */
export async function endDiscount(ctx: ServiceContext, id: string) {
  const d = await db.discount.findFirstOrThrow({ where: { id, shop: ctx.shop } });
  if (d.shopifyDiscountId) await setShopifyActive(ctx, d, false);
  return db.discount.update({ where: { id }, data: { status: "ENDED", lastSyncError: null } });
}

export async function deleteDiscount(ctx: ServiceContext, id: string) {
  const d = await db.discount.findFirstOrThrow({ where: { id, shop: ctx.shop } });
  const before = snapshot(d);

  if (d.shopifyDiscountId) {
    const kind = isCode(d) ? "Code" : "Automatic";
    const key = `discount${kind}Delete`;
    await adminMutation(
      ctx,
      "DISCOUNT_DELETE",
      `#graphql
        mutation Delete${kind}($id: ID!) {
          ${key}(id: $id) {
            ${isCode(d) ? "deletedCodeDiscountId" : "deletedAutomaticDiscountId"}
            userErrors { field message }
          }
        }`,
      { id: d.shopifyDiscountId },
      key,
      { type: "DISCOUNT", id },
    );
  }

  await db.discount.delete({ where: { id } });
  await log(ctx, {
    level: "INFO",
    module: "AdminUI",
    action: "DISCOUNT_DELETED",
    message: `Deleted discount '${d.title}'`,
    entityType: "DISCOUNT",
    entityId: id,
    before,
  });
}
