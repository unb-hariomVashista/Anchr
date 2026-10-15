import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import {
  Hash,
  Percent,
  Target,
  Calendar,
  Sparkles,
  Lightbulb,
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
  Info,
  Layers,
  ArrowRight,
} from "lucide-react";
import { MAX_GENERATE, MAX_IMPORT_ROWS } from "../../shared/bulk-limits.js";
import { FileDropzone } from "./FileDropzone";
import { ExportButton } from "./ExportButton";
import "../styles/discount-form.css";
import "../styles/bulk.css";

/** "Bulk generate" tab of the Create Coupon page. */
export function BulkGenerateForm({ campaigns = [] }) {
  const navigation = useNavigation();
  const isGenerating = navigation.state === "submitting" && navigation.formData?.get("intent") === "generate";
  const [title, setTitle] = useState("Festive coupon");
  const [prefix, setPrefix] = useState("FESTIVE");
  const [count, setCount] = useState(10);
  const [codeLength, setCodeLength] = useState(8);
  const [valueType, setValueType] = useState("PERCENTAGE");
  const [value, setValue] = useState(30);
  const [floorType, setFloorType] = useState("NONE");
  const [floorValue, setFloorValue] = useState("");
  const [targetType, setTargetType] = useState("ALL");
  const [targets, setTargets] = useState([]);

  const pick = async () => {
    if (typeof shopify === "undefined" || !shopify.resourcePicker) {
      alert("Shopify Resource Picker is only available inside the Shopify Admin.");
      return;
    }
    const selection = await shopify.resourcePicker({
      type: targetType === "PRODUCTS" ? "product" : "collection",
      multiple: true,
      selectionIds: targets.map((id) => ({ id })),
    });
    if (selection) setTargets(selection.map((s) => s.id));
  };

  // Sample calculations for live preview
  const sampleMrp = 1000;
  let sampleDiscount = 0;
  if (valueType === "PERCENTAGE") {
    sampleDiscount = (sampleMrp * (parseFloat(value) || 0)) / 100;
  } else {
    sampleDiscount = parseFloat(value) || 0;
  }
  let samplePrice = Math.max(0, sampleMrp - sampleDiscount);

  if (floorType === "AMOUNT" && floorValue) {
    samplePrice = Math.max(samplePrice, parseFloat(floorValue) || 0);
  } else if (floorType === "PERCENT_OF_MRP" && floorValue) {
    const minPrice = (sampleMrp * (parseFloat(floorValue) || 0)) / 100;
    samplePrice = Math.max(samplePrice, minPrice);
  }

  const sampleCodeStr = `${prefix ? prefix.toUpperCase() + "-" : ""}${"X".repeat(codeLength)}`;

  return (
    <Form method="post">
      <input type="hidden" name="intent" value="generate" />
      <input type="hidden" name="valueType" value={valueType} />
      <input type="hidden" name="targetIds" value={JSON.stringify(targets)} />

      <div className="discount-form-grid">
        {/* Left Column: Form Cards */}
        <div className="discount-form-main">
          {/* Card 1: Codes */}
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-icon">
                <Hash size={18} />
              </div>
              <div>
                <h2 className="form-card-title">Coupon Codes & Quantities</h2>
                <p className="form-card-subtitle">Define title prefix, quantity and random code generation rules.</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="title">
                Title Pattern <span className="required-star">*</span>
              </label>
              <input
                id="title"
                name="title"
                required
                placeholder="e.g. Festive coupon"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="form-hint">{'Each discount will be titled "<title> #1", "#2", ...'}</p>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="prefix">Code prefix (optional)</label>
                <input
                  id="prefix"
                  name="prefix"
                  maxLength={12}
                  placeholder="FESTIVE"
                  className="form-input"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="count">Quantity (1-{MAX_GENERATE})</label>
                <input
                  id="count"
                  name="count"
                  type="number"
                  min="1"
                  max={MAX_GENERATE}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="codeLength">Random part length (4-12)</label>
              <input
                id="codeLength"
                name="codeLength"
                type="number"
                min="4"
                max="12"
                value={codeLength}
                onChange={(e) => setCodeLength(e.target.value)}
                className="form-input"
              />
              <p className="form-hint">Generated codes look like {sampleCodeStr}. Ambiguous characters (0/O, 1/I) are excluded.</p>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="usageLimit">Usage limit per code (optional)</label>
                <input id="usageLimit" name="usageLimit" type="number" min="1" placeholder="Unlimited" className="form-input" />
              </div>
              <div className="checkbox-group" style={{ alignSelf: "end", paddingBottom: "10px" }}>
                <input type="hidden" name="oncePerCustomer" value="false" />
                <label className="checkbox-option">
                  <input type="checkbox" name="oncePerCustomer" value="true" />
                  <span>One use per customer</span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 2: Value off MRP */}
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-icon">
                <Percent size={18} />
              </div>
              <div>
                <h2 className="form-card-title">Value Off MRP</h2>
                <p className="form-card-subtitle">Set discount value type, percentage or fixed amount off MRP.</p>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="valueTypeSel">Discount type</label>
                <select
                  id="valueTypeSel"
                  value={valueType}
                  onChange={(e) => setValueType(e.target.value)}
                  className="form-select"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED_AMOUNT">Fixed amount (₹)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="value">
                  Value <span className="required-star">*</span>
                </label>
                <input
                  id="value"
                  name="value"
                  type="number"
                  min="0"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="floorType">Price floor (optional)</label>
                <select
                  id="floorType"
                  name="floorType"
                  value={floorType}
                  onChange={(e) => setFloorType(e.target.value)}
                  className="form-select"
                >
                  <option value="NONE">No floor</option>
                  <option value="AMOUNT">Minimum final price</option>
                  <option value="PERCENT_OF_MRP">Minimum % of MRP</option>
                </select>
              </div>
              {floorType !== "NONE" && (
                <div className="form-group">
                  <label htmlFor="floorValue">Floor value</label>
                  <input
                    id="floorValue"
                    name="floorValue"
                    type="number"
                    min="0"
                    step="any"
                    value={floorValue}
                    onChange={(e) => setFloorValue(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Applies to */}
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-icon">
                <Target size={18} />
              </div>
              <div>
                <h2 className="form-card-title">Applies To</h2>
                <p className="form-card-subtitle">Specify target products or collections and purchase conditions.</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="targetType">Target</label>
              <select
                id="targetType"
                name="targetType"
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value);
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
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button type="button" onClick={pick} className="btn-cancel" style={{ padding: "8px 16px" }}>
                  {targetType === "PRODUCTS" ? "Select products" : "Select collections"}
                </button>
                <span style={{ fontSize: 13, color: "#6b7280" }}>{targets.length} selected</span>
              </div>
            )}

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="minQuantity">Minimum quantity</label>
                <input id="minQuantity" name="minQuantity" type="number" min="0" defaultValue="1" className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="minSubtotal">Minimum subtotal (₹)</label>
                <input id="minSubtotal" name="minSubtotal" type="number" min="0" defaultValue="0" className="form-input" />
              </div>
            </div>
          </div>

          {/* Card 4: Dates & Publishing */}
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-icon">
                <Calendar size={18} />
              </div>
              <div>
                <h2 className="form-card-title">Dates, Campaign & Publishing</h2>
                <p className="form-card-subtitle">Set availability window or attach to a campaign.</p>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="startsAt">Start date (UTC)</label>
                <input id="startsAt" name="startsAt" type="date" className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="endsAt">End date (optional)</label>
                <input id="endsAt" name="endsAt" type="date" className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="campaignId">Add to campaign (optional)</label>
              <select id="campaignId" name="campaignId" className="form-select" defaultValue="">
                <option value="">None</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="form-hint">Campaign dates will override the individual dates above.</p>
            </div>

            <div className="checkbox-group">
              <input type="hidden" name="combineShipping" value="false" />
              <label className="checkbox-option">
                <input type="checkbox" name="combineProduct" value="true" />
                <span>Combines with product discounts</span>
              </label>
              <label className="checkbox-option">
                <input type="checkbox" name="combineOrder" value="true" />
                <span>Combines with order discounts</span>
              </label>
              <label className="checkbox-option">
                <input type="checkbox" name="combineShipping" value="true" defaultChecked />
                <span>Combines with shipping discounts</span>
              </label>
              <input type="hidden" name="saveAsDraft" value="false" />
              <label className="checkbox-option">
                <input type="checkbox" name="saveAsDraft" value="true" />
                <span>Save as drafts (do not publish to Shopify yet)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Sidebar */}
        <div className="discount-sidebar">
          {/* Live Preview Summary Card */}
          <div className="form-card preview-sidebar-card">
            <h3 className="form-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={18} color="#059669" />
              Bulk Generation Preview
            </h3>

            <div className="preview-summary-box">
              <div className="preview-row">
                <span>Quantity:</span>
                <strong style={{ color: "#111827" }}>{count} coupons</strong>
              </div>
              <div className="preview-row">
                <span>Code Pattern:</span>
                <code>{sampleCodeStr}</code>
              </div>
              <div className="preview-row">
                <span>Discount Value:</span>
                <span className="preview-value-green">
                  {valueType === "PERCENTAGE" ? `${value || 0}% OFF MRP` : `₹${value || 0} OFF MRP`}
                </span>
              </div>

              <div className="preview-divider" />

              <div className="preview-row">
                <span>Sample MRP:</span>
                <span>₹{sampleMrp.toLocaleString()}</span>
              </div>
              <div className="preview-row bold">
                <span>Estimated Price:</span>
                <span className="preview-value-green">₹{Math.round(samplePrice).toLocaleString()}</span>
              </div>
            </div>

            <div className="alert-card success" style={{ padding: "12px", marginTop: "4px" }}>
              <CheckCircle2 size={16} className="alert-card-icon" />
              <div className="alert-card-info">
                <span className="alert-card-title">Ready to Generate</span>
                <span className="alert-card-text">
                  Codes will be generated securely in batch and saved to your store.
                </span>
              </div>
            </div>

            <div className="form-actions-row" style={{ marginTop: 12, justifyContent: "stretch" }}>
              <button type="submit" disabled={isGenerating} className="btn-submit-green" style={{ width: "100%", justifyContent: "center" }}>
                {isGenerating ? "Generating Codes..." : `Generate ${count} Coupon${count == 1 ? "" : "s"}`}
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="how-it-works-card">
            <div className="how-it-works-title">
              <Lightbulb size={18} /> How Bulk Generation Works
            </div>
            <ul className="how-it-works-list">
              <li>Generates unique, non-repeating code strings automatically.</li>
              <li>Each code is individually tracked and respects usage limits.</li>
              <li>You can export generated codes to CSV at any time from the Discounts page.</li>
            </ul>
          </div>
        </div>
      </div>
    </Form>
  );
}

/** "Import" tab of the Create Coupon page. */
export function DiscountImportForm() {
  const navigation = useNavigation();
  const isValidating = navigation.state === "submitting" && navigation.formData?.get("intent") === "validate";
  const isImporting = navigation.state === "submitting" && navigation.formData?.get("intent") === "import";
  const busy = isValidating || isImporting;

  return (
    <Form method="post" encType="multipart/form-data">
      <div className="discount-form-grid">
        {/* Main Column */}
        <div className="discount-form-main">
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-icon">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h2 className="form-card-title">Upload CSV File</h2>
                <p className="form-card-subtitle">
                  Upload a standard .CSV spreadsheet containing your coupon codes and discount details.
                </p>
              </div>
            </div>

            {/* Custom Drag & Drop Zone */}
            <FileDropzone name="file" accept=".csv" maxSizeMB={1} />

            <div className="form-actions-row" style={{ justifyContent: "flex-start", gap: 12, marginTop: 8 }}>
              <button
                type="submit"
                name="intent"
                value="validate"
                disabled={busy}
                className="btn-cancel"
              >
                {isValidating ? "Validating..." : "Validate only (Dry run)"}
              </button>
              <button
                type="submit"
                name="intent"
                value="import"
                disabled={busy}
                className="btn-submit-green"
              >
                {isImporting ? "Importing..." : "Import Discounts"}
              </button>
            </div>
          </div>

          {/* CSV Requirements Card */}
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-icon">
                <HelpCircle size={18} />
              </div>
              <div>
                <h2 className="form-card-title">CSV Format & Column Guidelines</h2>
                <p className="form-card-subtitle">Your CSV file should include the following header columns:</p>
              </div>
            </div>

            <div className="csv-guide-table-wrapper">
              <table className="csv-guide-table">
                <thead>
                  <tr>
                    <th>Column Name</th>
                    <th>Required</th>
                    <th>Supported Values / Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>title</code></td>
                    <td><span className="badge-req">Required</span></td>
                    <td>Discount title or name (e.g. "Summer Sale 20%")</td>
                  </tr>
                  <tr>
                    <td><code>valueType</code></td>
                    <td><span className="badge-req">Required</span></td>
                    <td><code>PERCENTAGE</code> or <code>FIXED_AMOUNT</code></td>
                  </tr>
                  <tr>
                    <td><code>value</code></td>
                    <td><span className="badge-req">Required</span></td>
                    <td>Numeric value (e.g. <code>20</code> for 20% or <code>500</code> for ₹500)</td>
                  </tr>
                  <tr>
                    <td><code>code</code></td>
                    <td>Optional</td>
                    <td>Coupon code string (e.g. <code>SUMMER20</code>). Auto-generated if blank.</td>
                  </tr>
                  <tr>
                    <td><code>floorType</code></td>
                    <td>Optional</td>
                    <td><code>NONE</code>, <code>AMOUNT</code>, or <code>PERCENT_OF_MRP</code></td>
                  </tr>
                  <tr>
                    <td><code>floorValue</code></td>
                    <td>Optional</td>
                    <td>Floor constraint numeric value (e.g. <code>300</code>)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                Need a starter file? Download our official CSV template:
              </span>
              <ExportButton url="/api/discounts/export?template=1" filename="discounts-template.csv" className="btn-secondary-link">
                Download CSV Template
              </ExportButton>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="discount-sidebar">
          <div className="form-card">
            <h3 className="form-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Info size={18} color="#059669" />
              Import Instructions
            </h3>
            <p className="form-hint" style={{ fontSize: 13, lineHeight: 1.5, color: "#374151" }}>
              • Up to <strong>{MAX_IMPORT_ROWS} rows</strong> and <strong>1 MB</strong> file size limit.
            </p>
            <p className="form-hint" style={{ fontSize: 13, lineHeight: 1.5, color: "#374151" }}>
              • Valid rows will be imported even if other individual rows contain validation errors.
            </p>
            <p className="form-hint" style={{ fontSize: 13, lineHeight: 1.5, color: "#374151" }}>
              • Use <strong>"Validate only"</strong> first to verify your spreadsheet before creating real coupons.
            </p>
          </div>
        </div>
      </div>
    </Form>
  );
}
