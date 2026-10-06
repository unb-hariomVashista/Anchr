import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { computeLineDiscount } from "../../shared/mrp-math.js";
import { toDateInput } from "./status";
import { Banner, Btn, Card, Check, ErrorList, Field, Input, NumberInput, PriceBox, Row, Select } from "./ui";

const money = (n) => `₹${Math.round(n * 100) / 100}`;

/** Shared create/edit form with a live price preview. `discount` is undefined when creating. */
export function DiscountForm({ discount, campaignId, errors = [], editing = false, cancelTo }) {
  const nav = useNavigation();
  const busy = nav.state !== "idle";
  const [method, setMethod] = useState(discount?.method ?? "AUTOMATIC");
  const [valueType, setValueType] = useState(discount?.valueType ?? "PERCENTAGE");
  const [targetType, setTargetType] = useState(discount?.targetType ?? "ALL");
  const [floorType, setFloorType] = useState(discount?.floorType ?? "NONE");
  const [value, setValue] = useState(String(discount?.value ?? ""));
  const [floorValue, setFloorValue] = useState(String(discount?.floorValue ?? ""));
  const [sampleMrp, setSampleMrp] = useState("899");
  const [samplePrice, setSamplePrice] = useState("499");
  const [targets, setTargets] = useState(discount?.targetIds ? JSON.parse(discount.targetIds) : []);

  const pick = async () => {
    const type = targetType === "PRODUCTS" ? "product" : "collection";
    const selection = await shopify.resourcePicker({
      type,
      multiple: true,
      selectionIds: targets.map((id) => ({ id })),
    });
    if (selection) setTargets(selection.map((s) => s.id));
  };

  const combines = discount?.combinesWith
    ? JSON.parse(discount.combinesWith)
    : { product: false, order: false, shipping: true };

  const preview = buildPreview({
    mrp: parseFloat(sampleMrp) || 0,
    price: parseFloat(samplePrice) || 0,
    valueType,
    value: parseFloat(value) || 0,
    floorType: floorType === "NONE" ? null : floorType,
    floorValue: parseFloat(floorValue) || 0,
  });

  const val = (e) => e.currentTarget?.value ?? e.target?.value ?? "";

  return (
    <>
      <Form method="post">
        <s-stack gap="base">
          <ErrorList errors={errors} />
          <input type="hidden" name="campaignId" value={campaignId ?? discount?.campaignId ?? ""} />
          <input type="hidden" name="targetIds" value={JSON.stringify(targets)} />
          <input type="hidden" name="valueType" value={valueType} />
          {editing && <input type="hidden" name="method" value={method} />}

          <Card title="Discount">
            <Field label="Title">
              <Input name="title" defaultValue={discount?.title ?? ""} required placeholder="e.g. Festive 30% off MRP" />
            </Field>
            <Field label="Method">
              <Select name={editing ? undefined : "method"} value={method} disabled={editing || undefined} onChange={(e) => setMethod(val(e))}>
                <option value="CODE">Discount code</option>
                <option value="AUTOMATIC">Automatic discount</option>
              </Select>
            </Field>
            {method === "CODE" && (
              <Field label="Code" hint="Customers enter this at checkout. Letters, numbers, dash or underscore.">
                <Input name="code" defaultValue={discount?.code ?? ""} readOnly={editing || undefined} placeholder="FESTIVE30" />
              </Field>
            )}
          </Card>

          <Card title="Value off MRP">
            <s-button-group>
              <s-button variant={valueType === "PERCENTAGE" ? "primary" : "secondary"} onClick={() => setValueType("PERCENTAGE")}>
                Percentage
              </s-button>
              <s-button variant={valueType === "FIXED_AMOUNT" ? "primary" : "secondary"} onClick={() => setValueType("FIXED_AMOUNT")}>
                Fixed amount
              </s-button>
            </s-button-group>
            <Field label={valueType === "PERCENTAGE" ? "Percentage (%)" : "Amount (₹)"}>
              <NumberInput name="value" min="0" value={value} onChange={(e) => setValue(val(e))} />
            </Field>
            <Field label="Price floor (optional)">
              <Select name="floorType" value={floorType} onChange={(e) => setFloorType(val(e))}>
                <option value="NONE">No floor</option>
                <option value="AMOUNT">Minimum final price</option>
                <option value="PERCENT_OF_MRP">Minimum % of MRP</option>
              </Select>
            </Field>
            {floorType !== "NONE" && (
              <Field label={floorType === "AMOUNT" ? "Minimum final price (₹)" : "Never go below this % of MRP"}>
                <NumberInput name="floorValue" min="0" value={floorValue} onChange={(e) => setFloorValue(val(e))} />
              </Field>
            )}
            <s-text color="subdued">
              Final price = MRP minus this value. It is skipped where that price is not lower than the selling price, or where a product has no MRP.
            </s-text>
          </Card>

          <Card title="Applies to">
            <Field label="Target">
              <Select
                name="targetType"
                value={targetType}
                onChange={(e) => {
                  setTargetType(val(e));
                  setTargets([]);
                }}
              >
                <option value="ALL">All products</option>
                <option value="PRODUCTS">Specific products</option>
                <option value="COLLECTIONS">Specific collections</option>
              </Select>
            </Field>
            {targetType !== "ALL" && (
              <s-stack direction="inline" gap="base" alignItems="center">
                <Btn onClick={pick}>{targetType === "PRODUCTS" ? "Select products" : "Select collections"}</Btn>
                <s-text>{targets.length} selected</s-text>
              </s-stack>
            )}
            <s-grid gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="base">
              <Field label="Minimum quantity (optional)">
                <NumberInput name="minQuantity" min="0" defaultValue={discount?.minQuantity ?? ""} />
              </Field>
              <Field label="Minimum subtotal (optional)">
                <NumberInput name="minSubtotal" min="0" defaultValue={discount?.minSubtotal ?? ""} />
              </Field>
            </s-grid>
          </Card>

          {!campaignId && !discount?.campaignId && (
            <Card title="Active dates (UTC)">
              <s-grid gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="base">
                <Field label="Start date">
                  <Input type="date" name="startsAt" defaultValue={toDateInput(discount?.startsAt)} />
                </Field>
                <Field label="End date (optional)">
                  <Input type="date" name="endsAt" defaultValue={toDateInput(discount?.endsAt)} />
                </Field>
              </s-grid>
            </Card>
          )}

          <Card title="Combines with">
            <Check label="Other product discounts" name="combineProduct" value="true" defaultChecked={combines.product} />
            <Check label="Order discounts" name="combineOrder" value="true" defaultChecked={combines.order} />
            {/* Hidden "false" comes first so an unchecked box still submits a value; the checked box's "true" wins. */}
            <input type="hidden" name="combineShipping" value="false" />
            <Check label="Shipping discounts" name="combineShipping" value="true" defaultChecked={combines.shipping} />
          </Card>

          <s-stack direction="inline" gap="base" justifyContent="end">
            {cancelTo && <Btn to={cancelTo}>Cancel</Btn>}
            <Btn type="submit" variant="primary" loading={busy}>
              {editing ? "Save changes" : "Create discount"}
            </Btn>
          </s-stack>
        </s-stack>
      </Form>

      <Card aside title="Price preview">
        <s-text color="subdued">Try a sample product. This uses the same rules as checkout.</s-text>
        <s-grid gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="base">
          <Field label="MRP (₹)">
            <NumberInput min="0" value={sampleMrp} onChange={(e) => setSampleMrp(val(e))} />
          </Field>
          <Field label="Selling price (₹)">
            <NumberInput min="0" value={samplePrice} onChange={(e) => setSamplePrice(val(e))} />
          </Field>
        </s-grid>
        <PriceBox>
          <Row label="MRP" value={money(preview.mrp)} />
          <Row label="Selling price" value={money(preview.price)} />
          <Row label="Price after discount" value={preview.applies ? money(preview.target) : "—"} />
          <s-divider />
          <Row label="Customer pays" value={money(preview.applies ? preview.target : preview.price)} bold />
        </PriceBox>
        <Banner tone={preview.applies ? "success" : "warning"} title={preview.title}>
          {preview.body}
        </Banner>
      </Card>
    </>
  );
}

/** Mirrors the checkout Function by calling the same shared math. */
function buildPreview({ mrp, price, valueType, value, floorType, floorValue }) {
  const pct = valueType === "PERCENTAGE";
  const r = computeLineDiscount({ mrp, price, valueType, value, floorType, floorValue });
  const base = { mrp, price, target: r.targetPrice, applies: r.applies };

  if (r.applies) {
    return { ...base, title: "Discount applies", body: `Customer saves ${money(r.discountPerUnit)} off the selling price.` };
  }
  if (r.reason === "SKIPPED_NO_BENEFIT") {
    const needed = pct ? `${Math.floor(((mrp - price) / mrp) * 1000) / 10}%` : money(mrp - price);
    const off = pct ? (mrp * value) / 100 : value;
    return {
      ...base,
      title: "No discount at this value",
      body: `${money(mrp)} minus this value is ${money(Math.max(0, mrp - off))}, not lower than the selling price of ${money(price)}.${mrp > price ? ` Use more than ${needed} to discount this product.` : ""}`,
    };
  }
  return { ...base, title: "Check the values", body: "Enter an MRP and a value above zero. A percentage cannot be over 100." };
}
