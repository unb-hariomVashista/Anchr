import { computeLineDiscount } from "../../../shared/mrp-math.js";

const EMPTY = { operations: [] };

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} RunResult
 */

/**
 * Applies a discount calculated on MRP (variant compare-at price) instead of the selling price.
 * Config comes from the discount's app metafield `$app:mrp-config`:
 * { valueType, value, floorType, floorValue, targetType, targetIds, minQuantity, minSubtotal }
 *
 * @param {RunInput} input
 * @returns {RunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const config = input.discount.metafield?.jsonValue;
  if (!config || !input.cart.lines.length) return EMPTY;
  if (!input.discount.discountClasses.includes("PRODUCT")) return EMPTY;

  const targetIds = Array.isArray(config.targetIds) ? config.targetIds : [];
  const minQuantity = Number(config.minQuantity) || 0;
  const minSubtotal = Number(config.minSubtotal) || 0;

  const eligible = input.cart.lines.filter((line) => {
    if (line.merchandise.__typename !== "ProductVariant") return false;
    const product = line.merchandise.product;
    if (config.targetType === "PRODUCTS") return targetIds.includes(product.id);
    if (config.targetType === "COLLECTIONS") return product.inAnyCollection;
    return true;
  });

  const subtotal = eligible.reduce(
    (sum, line) => sum + parseFloat(line.cost.amountPerQuantity.amount) * line.quantity,
    0,
  );
  const quantity = eligible.reduce((sum, line) => sum + line.quantity, 0);
  if (quantity < minQuantity || subtotal < minSubtotal) return EMPTY;

  const candidates = [];
  for (const line of eligible) {
    const mrp = line.cost.compareAtAmountPerQuantity
      ? parseFloat(line.cost.compareAtAmountPerQuantity.amount)
      : null;
    const result = computeLineDiscount({
      mrp,
      price: parseFloat(line.cost.amountPerQuantity.amount),
      valueType: config.valueType,
      value: Number(config.value),
      floorType: config.floorType ?? null,
      floorValue: config.floorValue != null ? Number(config.floorValue) : null,
    });
    if (!result.applies) continue;

    candidates.push({
      message: config.message || discountMessage(config),
      targets: [{ cartLine: { id: line.id } }],
      value: {
        fixedAmount: { amount: result.discountPerUnit.toFixed(2), appliesToEachItem: true },
      },
    });
  }

  if (!candidates.length) return EMPTY;

  return {
    operations: [{ productDiscountsAdd: { candidates, selectionStrategy: "ALL" } }],
  };
}

function discountMessage(config) {
  return config.valueType === "PERCENTAGE"
    ? `${config.value}% OFF MRP`
    : `${config.value} OFF MRP`;
}
