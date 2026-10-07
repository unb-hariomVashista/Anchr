import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import {
  FileText,
  Percent,
  Package,
  Calendar,
  Link2,
  Eye,
  AlertTriangle,
  Info,
  BookOpen,
} from "lucide-react";
import { computeLineDiscount } from "../../shared/mrp-math.js";
import { toDateInput } from "./status";
import "../styles/discount-form.css";

const money = (n) => `₹${Math.round(n * 100) / 100}`;

/** Shared create/edit form with a live price preview matching user design screenshot. */
export function DiscountForm({ discount, campaignId, errors = [], editing = false, cancelTo }) {
  const nav = useNavigation();
  const busy = nav.state !== "idle";
  const [method, setMethod] = useState(discount?.method ?? "AUTOMATIC");
  const [valueType, setValueType] = useState(discount?.valueType ?? "PERCENTAGE");
  const [targetType, setTargetType] = useState(discount?.targetType ?? "ALL");
  const [floorType, setFloorType] = useState(discount?.floorType ?? "NONE");
  const [value, setValue] = useState(String(discount?.value ?? "30"));
  const [floorValue, setFloorValue] = useState(String(discount?.floorValue ?? ""));
  const [sampleMrp, setSampleMrp] = useState("899");
  const [samplePrice, setSamplePrice] = useState("499");
  const [targets, setTargets] = useState(discount?.targetIds ? JSON.parse(discount.targetIds) : []);

  const pick = async () => {
    if (typeof shopify === "undefined" || !shopify.resourcePicker) {
      alert("Shopify Resource Picker is only available inside Shopify Admin Embedded App context.");
      return;
    }
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

  const discountLabel = valueType === "PERCENTAGE" ? `${value || "0"}% off MRP` : `₹${value || "0"} off MRP`;
  const calculatedSavings = Math.max(0, parseFloat(sampleMrp || "0") - (preview.applies ? preview.target : parseFloat(samplePrice || "0")));

  return (
    <div className="discount-form-page">
      {/* Header */}
      <div className="discount-form-header">
        <div className="discount-form-title-group">
          <h1>{editing ? `Edit ${discount?.title || "Discount"}` : "Create Discount"}</h1>
          <p>
            Set up an MRP-based discount for your products. This coupon can be used individually or added to a campaign.
          </p>
        </div>
        <a
          href="https://shopify.dev/docs/apps/selling-strategies/discounts"
          target="_blank"
          rel="noreferrer"
          className="btn-doc-link"
        >
          <BookOpen size={16} /> <span>View Documentation</span>
        </a>
      </div>

      {/* Backend Action Error List Banner */}
      {errors && errors.length > 0 && (
        <div className="alert-card warning" style={{ backgroundColor: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }}>
          <AlertTriangle size={18} className="alert-card-icon" />
          <div className="alert-card-info">
            <span className="alert-card-title">Fix the following issues</span>
            {errors.map((err, i) => (
              <span key={i} className="alert-card-text">• {err}</span>
            ))}
          </div>
        </div>
      )}

      <Form method="post">
        <input type="hidden" name="campaignId" value={campaignId ?? discount?.campaignId ?? ""} />
        <input type="hidden" name="targetIds" value={JSON.stringify(targets)} />
        <input type="hidden" name="valueType" value={valueType} />
        {editing && <input type="hidden" name="method" value={method} />}

        <div className="discount-form-grid">
          {/* Left Column: Form Cards */}
          <div className="discount-main-column">
            {/* Card 1: Basic Details */}
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-icon">
                  <FileText size={16} />
                </div>
                <h2 className="form-card-title">Basic Details</h2>
              </div>

              <div className="form-group">
                <label htmlFor="discount-title">
                  Discount Title <span className="required-star">*</span>
                </label>
                <input
                  id="discount-title"
                  type="text"
                  name="title"
                  defaultValue={discount?.title ?? ""}
                  required
                  placeholder="e.g. Festive 30% off MRP"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="discount-method">Discount Method</label>
                <select
                  id="discount-method"
                  name={editing ? undefined : "method"}
                  value={method}
                  disabled={editing || undefined}
                  onChange={(e) => setMethod(val(e))}
                  className="form-select"
                >
                  <option value="AUTOMATIC">Automatic discount</option>
                  <option value="CODE">Discount code</option>
                </select>
                <p className="form-hint">
                  {method === "AUTOMATIC"
                    ? "Discount will be applied automatically at checkout."
                    : "Customers enter this code at checkout."}
                </p>
              </div>

              {method === "CODE" && (
                <>
                  <div className="form-group">
                    <label htmlFor="discount-code">
                      Discount Code <span className="required-star">*</span>
                    </label>
                    <input
                      id="discount-code"
                      type="text"
                      name="code"
                      defaultValue={discount?.code ?? ""}
                      readOnly={editing || undefined}
                      placeholder="e.g. FESTIVE30"
                      className="form-input"
                    />
                    <p className="form-hint">Letters, numbers, dash or underscore.</p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="usage-limit">Usage limit (optional)</label>
                    <input
                      id="usage-limit"
                      type="number"
                      name="usageLimit"
                      min="1"
                      defaultValue={discount?.usageLimit ?? ""}
                      placeholder="Unlimited"
                      className="form-input"
                    />
                    <p className="form-hint">Total times this code can be redeemed. Leave empty for unlimited.</p>
                  </div>

                  <div className="checkbox-group" style={{ marginTop: "4px" }}>
                    <input type="hidden" name="oncePerCustomer" value="false" />
                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        name="oncePerCustomer"
                        value="true"
                        defaultChecked={discount?.oncePerCustomer ?? false}
                      />
                      <span>Limit to one use per customer</span>
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Card 2: Value off MRP */}
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-icon">
                  <Percent size={16} />
                </div>
                <h2 className="form-card-title">Value off MRP</h2>
              </div>

              <div className="form-row-2" style={{ alignItems: "flex-end" }}>
                <div className="form-group">
                  <label>Discount Type</label>
                  <div className="radio-group-inline" style={{ padding: "8px 0" }}>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="valueTypeRadio"
                        checked={valueType === "PERCENTAGE"}
                        onChange={() => setValueType("PERCENTAGE")}
                      />
                      <span>Percentage (%)</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="valueTypeRadio"
                        checked={valueType === "FIXED_AMOUNT"}
                        onChange={() => setValueType("FIXED_AMOUNT")}
                      />
                      <span>Fixed amount (₹)</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="discount-value">
                    Value <span className="required-star">*</span>
                  </label>
                  <div className="input-unit-wrapper">
                    <input
                      id="discount-value"
                      type="number"
                      name="value"
                      min="0"
                      step="any"
                      value={value}
                      onChange={(e) => setValue(val(e))}
                      required
                      placeholder={valueType === "PERCENTAGE" ? "30" : "500"}
                      className="form-input"
                    />
                    <span className="input-unit-suffix">
                      {valueType === "PERCENTAGE" ? "%" : "₹"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="price-floor">Price Floor (optional)</label>
                <select
                  id="price-floor"
                  name="floorType"
                  value={floorType}
                  onChange={(e) => setFloorType(val(e))}
                  className="form-select"
                >
                  <option value="NONE">No floor</option>
                  <option value="AMOUNT">Minimum final price</option>
                  <option value="PERCENT_OF_MRP">Minimum % of MRP</option>
                </select>
                <p className="form-hint">
                  Final price = MRP minus this value. It is skipped where that price is not lower than the selling price, or where a product has no MRP.
                </p>
              </div>

              {floorType !== "NONE" && (
                <div className="form-group">
                  <label htmlFor="floor-value">
                    {floorType === "AMOUNT" ? "Minimum final price (₹)" : "Never go below this % of MRP"}
                  </label>
                  <input
                    id="floor-value"
                    type="number"
                    name="floorValue"
                    min="0"
                    step="any"
                    value={floorValue}
                    onChange={(e) => setFloorValue(val(e))}
                    placeholder="e.g. 299"
                    className="form-input"
                  />
                </div>
              )}
            </div>

            {/* Card 3: Applies to */}
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-icon">
                  <Package size={16} />
                </div>
                <h2 className="form-card-title">Applies to</h2>
              </div>

              <div className="form-group">
                <label htmlFor="target-type">Target</label>
                <select
                  id="target-type"
                  name="targetType"
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(val(e));
                    setTargets([]);
                  }}
                  className="form-select"
                >
                  <option value="ALL">All products</option>
                  <option value="PRODUCTS">Specific products</option>
                  <option value="COLLECTIONS">Specific collections</option>
                </select>
              </div>

              {targetType !== "ALL" && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button type="button" onClick={pick} className="btn-cancel" style={{ padding: "8px 16px" }}>
                    {targetType === "PRODUCTS" ? "Select products" : "Select collections"}
                  </button>
                  <span style={{ fontSize: "13px", color: "#6b7280" }}>{targets.length} selected</span>
                </div>
              )}

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="min-qty">Minimum quantity (optional)</label>
                  <input
                    id="min-qty"
                    type="number"
                    name="minQuantity"
                    min="0"
                    defaultValue={discount?.minQuantity ?? "1"}
                    placeholder="1"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="min-subtotal">Minimum subtotal (optional)</label>
                  <div className="input-unit-wrapper">
                    <input
                      id="min-subtotal"
                      type="number"
                      name="minSubtotal"
                      min="0"
                      defaultValue={discount?.minSubtotal ?? "0"}
                      placeholder="0"
                      className="form-input"
                    />
                    <span className="input-unit-suffix">₹</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Active Dates (UTC) */}
            {!campaignId && !discount?.campaignId && (
              <div className="form-card">
                <div className="form-card-header">
                  <div className="form-card-icon">
                    <Calendar size={16} />
                  </div>
                  <h2 className="form-card-title">Active Dates (UTC)</h2>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="start-date">Start date</label>
                    <div className="date-input-wrapper">
                      <Calendar size={15} />
                      <input
                        id="start-date"
                        type="date"
                        name="startsAt"
                        defaultValue={toDateInput(discount?.startsAt) || "2026-10-01"}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="end-date">End date (optional)</label>
                    <div className="date-input-wrapper">
                      <Calendar size={15} />
                      <input
                        id="end-date"
                        type="date"
                        name="endsAt"
                        defaultValue={toDateInput(discount?.endsAt)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card 5: Combines with */}
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-icon">
                  <Link2 size={16} />
                </div>
                <h2 className="form-card-title">Combines with</h2>
              </div>

              <div className="checkbox-group">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    name="combineProduct"
                    value="true"
                    defaultChecked={combines.product}
                  />
                  <span>Other product discounts</span>
                </label>

                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    name="combineOrder"
                    value="true"
                    defaultChecked={combines.order}
                  />
                  <span>Order discounts</span>
                </label>

                <input type="hidden" name="combineShipping" value="false" />
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    name="combineShipping"
                    value="true"
                    defaultChecked={combines.shipping}
                  />
                  <span>Shipping discounts</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Sidebar & Live Preview */}
          <div className="discount-sidebar">
            {/* Price Preview Card */}
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-icon">
                  <Eye size={16} />
                </div>
                <h2 className="form-card-title">Price Preview</h2>
              </div>
              <p className="form-card-subtitle">
                Try a sample product to see how the discount will be applied at checkout.
              </p>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="sample-mrp">MRP (₹)</label>
                  <input
                    id="sample-mrp"
                    type="number"
                    min="0"
                    value={sampleMrp}
                    onChange={(e) => setSampleMrp(val(e))}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sample-price">Selling price (₹)</label>
                  <input
                    id="sample-price"
                    type="number"
                    min="0"
                    value={samplePrice}
                    onChange={(e) => setSamplePrice(val(e))}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Styled Summary Box */}
              <div className="preview-summary-box">
                <div className="preview-row">
                  <span>MRP</span>
                  <span>{money(preview.mrp)}</span>
                </div>
                <div className="preview-row">
                  <span>Selling price</span>
                  <span>{money(preview.price)}</span>
                </div>
                <div className="preview-row">
                  <span>Discount ({discountLabel})</span>
                  <span className="preview-value-green">
                    {preview.applies ? `-${money(calculatedSavings)}` : "—"}
                  </span>
                </div>
                <div className="preview-divider" />
                <div className="preview-row bold">
                  <span>Customer pays</span>
                  <span className="preview-value-green">
                    {money(preview.applies ? preview.target : preview.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Alert Banner */}
            <div className={`alert-card ${preview.applies ? "success" : "warning"}`}>
              {preview.applies ? (
                <Info size={18} className="alert-card-icon" />
              ) : (
                <AlertTriangle size={18} className="alert-card-icon" />
              )}
              <div className="alert-card-info">
                <span className="alert-card-title">
                  {preview.applies ? "Discount applies" : "Check the values"}
                </span>
                <span className="alert-card-text">{preview.body}</span>
              </div>
            </div>

            {/* How It Works Card */}
            <div className="how-it-works-card">
              <div className="how-it-works-title">
                <Info size={16} />
                <span>How it works</span>
              </div>
              <ul className="how-it-works-list">
                <li>The discount is calculated based on the product's MRP.</li>
                <li>If the discounted price is lower than the selling price, the selling price will be used.</li>
                <li>The discount will not be applied to products without an MRP.</li>
              </ul>
            </div>

            {/* Bottom Form Actions */}
            <div className="form-actions-row">
              <Link to={cancelTo || "/app/discounts"} className="btn-cancel">
                Cancel
              </Link>
              <button type="submit" disabled={busy} className="btn-submit-green">
                {editing ? "Save Changes" : "Create Discount"}
              </button>
            </div>
          </div>
        </div>
      </Form>
    </div>
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
