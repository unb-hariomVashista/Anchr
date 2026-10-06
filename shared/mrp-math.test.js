import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLineDiscount, validateDiscountConfig } from "./mrp-math.js";

const base = { mrp: 1000, price: 900, valueType: "PERCENTAGE", value: 20 };

test("20% off MRP 1000 with price 900 gives target 800, discount 100", () => {
  const r = computeLineDiscount(base);
  assert.equal(r.applies, true);
  assert.equal(r.targetPrice, 800);
  assert.equal(r.discountPerUnit, 100);
});

test("5% off MRP gives target 950 above price 900: skipped, no benefit", () => {
  const r = computeLineDiscount({ ...base, value: 5 });
  assert.equal(r.applies, false);
  assert.equal(r.reason, "SKIPPED_NO_BENEFIT");
  assert.equal(r.discountPerUnit, 0);
});

test("fixed 250 off MRP 1000 gives target 750, discount 150", () => {
  const r = computeLineDiscount({ ...base, valueType: "FIXED_AMOUNT", value: 250 });
  assert.equal(r.targetPrice, 750);
  assert.equal(r.discountPerUnit, 150);
});

test("missing or zero MRP is skipped", () => {
  assert.equal(computeLineDiscount({ ...base, mrp: null }).reason, "SKIPPED_NO_MRP");
  assert.equal(computeLineDiscount({ ...base, mrp: 0 }).reason, "SKIPPED_NO_MRP");
});

test("fixed value above MRP clamps to zero then to the floor", () => {
  const noFloor = computeLineDiscount({ ...base, valueType: "FIXED_AMOUNT", value: 5000 });
  assert.equal(noFloor.targetPrice, 0);
  const floored = computeLineDiscount({
    ...base,
    valueType: "FIXED_AMOUNT",
    value: 5000,
    floorType: "PERCENT_OF_MRP",
    floorValue: 50,
  });
  assert.equal(floored.targetPrice, 500);
  assert.equal(floored.floorApplied, true);
});

test("absolute floor stops the price dropping below it", () => {
  const r = computeLineDiscount({ ...base, value: 50, floorType: "AMOUNT", floorValue: 700 });
  assert.equal(r.targetPrice, 700);
  assert.equal(r.discountPerUnit, 200);
});

test("rounds to two decimals", () => {
  const r = computeLineDiscount({ mrp: 99.99, price: 99.99, valueType: "PERCENTAGE", value: 33.33 });
  assert.equal(r.targetPrice, 66.66);
  assert.equal(r.discountPerUnit, 33.33);
});

test("invalid config is skipped", () => {
  assert.equal(computeLineDiscount({ ...base, value: 0 }).reason, "SKIPPED_INVALID_CONFIG");
  assert.equal(computeLineDiscount({ ...base, value: 101 }).reason, "SKIPPED_INVALID_CONFIG");
});

test("validateDiscountConfig", () => {
  assert.deepEqual(validateDiscountConfig({ valueType: "PERCENTAGE", value: 10 }), []);
  assert.equal(validateDiscountConfig({ valueType: "PERCENTAGE", value: 120 }).length, 1);
  assert.equal(validateDiscountConfig({ valueType: "FIXED_AMOUNT", value: -1 }).length, 1);
  assert.equal(
    validateDiscountConfig({ valueType: "PERCENTAGE", value: 10, floorType: "AMOUNT", floorValue: 0 }).length,
    1,
  );
});
