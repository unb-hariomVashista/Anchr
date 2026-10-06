// Pure MRP discount math. Imported by both the app (simulator, validation) and the
// Shopify Function, so it must stay dependency-free and free of I/O.

/** @typedef {"PERCENTAGE" | "FIXED_AMOUNT"} ValueType */
/** @typedef {"AMOUNT" | "PERCENT_OF_MRP"} FloorType */

/**
 * @typedef {Object} LineInput
 * @property {number | null | undefined} mrp   Variant compare-at price per unit.
 * @property {number} price                    Current selling price per unit.
 * @property {ValueType} valueType
 * @property {number} value
 * @property {FloorType | null} [floorType]
 * @property {number | null} [floorValue]
 */

/**
 * @typedef {Object} LineResult
 * @property {boolean} applies
 * @property {string} reason  APPLIED | SKIPPED_NO_MRP | SKIPPED_NO_BENEFIT | SKIPPED_INVALID_CONFIG
 * @property {number} targetPrice      Price per unit after the discount.
 * @property {number} discountPerUnit  Amount taken off the current selling price per unit.
 * @property {boolean} floorApplied
 */

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Computes the per-unit discount for one cart line.
 * Target price = MRP minus the value off MRP, never below the floor.
 * A discount never raises a price.
 * @param {LineInput} input
 * @returns {LineResult}
 */
export function computeLineDiscount(input) {
  const { mrp, price, valueType, value, floorType, floorValue } = input;
  const skip = (reason) => ({
    applies: false,
    reason,
    targetPrice: price,
    discountPerUnit: 0,
    floorApplied: false,
  });

  if (valueType !== "PERCENTAGE" && valueType !== "FIXED_AMOUNT") {
    return skip("SKIPPED_INVALID_CONFIG");
  }
  if (!(value > 0) || (valueType === "PERCENTAGE" && value > 100)) {
    return skip("SKIPPED_INVALID_CONFIG");
  }
  if (!mrp || !(mrp > 0)) return skip("SKIPPED_NO_MRP");

  const offMrp = valueType === "PERCENTAGE" ? (mrp * value) / 100 : value;
  let target = Math.max(0, mrp - offMrp);

  let floorApplied = false;
  if (floorType && floorValue != null && floorValue > 0) {
    const floor = floorType === "PERCENT_OF_MRP" ? (mrp * floorValue) / 100 : floorValue;
    if (target < floor) {
      target = floor;
      floorApplied = true;
    }
  }

  target = round2(target);
  if (target >= price) return { ...skip("SKIPPED_NO_BENEFIT"), floorApplied };

  return {
    applies: true,
    reason: "APPLIED",
    targetPrice: target,
    discountPerUnit: round2(price - target),
    floorApplied,
  };
}

/**
 * Validates a discount config at creation time. Returns an array of error messages.
 * @param {{valueType: string, value: number, floorType?: string|null, floorValue?: number|null}} cfg
 * @returns {string[]}
 */
export function validateDiscountConfig(cfg) {
  const errors = [];
  if (cfg.valueType !== "PERCENTAGE" && cfg.valueType !== "FIXED_AMOUNT") {
    errors.push("Calculation must be percentage or fixed amount off MRP.");
  }
  if (!Number.isFinite(cfg.value) || cfg.value <= 0) {
    errors.push("Value must be greater than zero.");
  } else if (cfg.valueType === "PERCENTAGE" && cfg.value > 100) {
    errors.push("Percentage cannot exceed 100.");
  }
  if (cfg.floorType) {
    if (cfg.floorType !== "AMOUNT" && cfg.floorType !== "PERCENT_OF_MRP") {
      errors.push("Invalid price floor type.");
    }
    if (!Number.isFinite(cfg.floorValue) || cfg.floorValue <= 0) {
      errors.push("Price floor must be greater than zero.");
    } else if (cfg.floorType === "PERCENT_OF_MRP" && cfg.floorValue > 100) {
      errors.push("Price floor percentage cannot exceed 100.");
    }
  }
  return errors;
}
