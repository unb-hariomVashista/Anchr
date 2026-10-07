import { useState } from "react";
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  FileText,
  Tag,
  Clock,
  Plus,
  Trash2,
  Calendar,
  Check,
  ArrowRight,
  Lightbulb,
  X,
} from "lucide-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { newContext } from "../services/shopify-client.server";
import { createCampaign, parseCampaignInput } from "../services/campaigns.server";
import { AppShell } from "../components/ui";
import { ConfirmModal } from "../components/ConfirmModal";
import "../styles/campaign-form.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const unassignedDiscounts = await db.discount.findMany({
    where: { shop: session.shop, campaignId: null },
    orderBy: { createdAt: "desc" },
  });
  return { unassignedDiscounts };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  const rawData = Object.fromEntries(form);

  const { data, errors } = parseCampaignInput(rawData);
  if (!data) return { errors };

  const attachedDiscountIds = form.getAll("attachedDiscountIds").map((id) => id.toString());

  try {
    const campaign = await createCampaign(newContext(admin, session), data);
    if (attachedDiscountIds.length > 0) {
      await db.discount.updateMany({
        where: { id: { in: attachedDiscountIds }, shop: session.shop },
        data: { campaignId: campaign.id },
      });
    }
    return redirect(`/app/campaigns/${campaign.id}`);
  } catch (err) {
    return { errors: [err.message] };
  }
};

export default function NewCampaign() {
  const { unassignedDiscounts } = useLoaderData();
  const actionData = useActionData();
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  const [description, setDescription] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [startsAt, setStartsAt] = useState(today);

  // Attached discounts state for creation flow
  const [attachedDiscounts, setAttachedDiscounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDiscountId, setSelectedDiscountId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleAttachDiscount = () => {
    if (!selectedDiscountId) return;
    const target = unassignedDiscounts.find((d) => d.id === selectedDiscountId);
    if (target && !attachedDiscounts.some((d) => d.id === target.id)) {
      setAttachedDiscounts([...attachedDiscounts, target]);
    }
    setShowAddModal(false);
    setSelectedDiscountId("");
  };

  const handleRemoveDiscount = (discountId) => {
    setAttachedDiscounts(attachedDiscounts.filter((d) => d.id !== discountId));
    setDeleteTarget(null);
  };

  const availableUnassigned = (unassignedDiscounts || []).filter(
    (d) => !attachedDiscounts.some((ad) => ad.id === d.id)
  );

  return (
    <AppShell>
      <div className="campaign-form-page">
        {/* Top Header */}
        <div className="campaign-form-header">
          <div className="campaign-form-title-group">
            <h1>Create Campaign</h1>
            <p>
              Add multiple discount coupons and run them together for a specific time period. You can target specific products or collections for each coupon.
            </p>
          </div>
        </div>

        {/* Action Error List */}
        {actionData?.errors && actionData.errors.length > 0 && (
          <div className="alert-card warning" style={{ backgroundColor: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }}>
            <div className="alert-card-info">
              <span className="alert-card-title">Fix the following issues</span>
              {actionData.errors.map((err, i) => (
                <span key={i} className="alert-card-text">• {err}</span>
              ))}
            </div>
          </div>
        )}

        <Form method="post">
          {/* Hidden inputs for attached discounts */}
          {attachedDiscounts.map((d) => (
            <input key={d.id} type="hidden" name="attachedDiscountIds" value={d.id} />
          ))}

          <div className="campaign-form-grid">
            {/* Left Column: Form Cards */}
            <div className="campaign-main-column">
              {/* Card 1: Campaign Details */}
              <div className="form-card">
                <div className="form-card-header">
                  <div className="form-card-icon green">
                    <FileText size={16} />
                  </div>
                  <h2 className="form-card-title">Campaign Details</h2>
                </div>

                <div className="form-group">
                  <label htmlFor="campaign-name">
                    Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="campaign-name"
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Festive Offer Sale"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="campaign-desc">Description (optional)</label>
                  <textarea
                    id="campaign-desc"
                    name="description"
                    rows={3}
                    maxLength={500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Festive offers across key categories for the holiday season."
                    className="form-textarea"
                  />
                  <div className="char-counter">{description.length}/500</div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="start-date">
                      Start date (UTC) <span className="required-star">*</span>
                    </label>
                    <div className="date-input-wrapper">
                      <Calendar size={15} />
                      <input
                        id="start-date"
                        type="date"
                        name="startsAt"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        required
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
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
                <p className="form-hint">These dates apply to every discount in the campaign.</p>
              </div>

              {/* Card 2: Discounts (X) */}
              <div className="form-card">
                <div className="form-card-header-row">
                  <div className="form-card-header">
                    <div className="form-card-icon green">
                      <Tag size={16} />
                    </div>
                    <h2 className="form-card-title">Discounts ({attachedDiscounts.length})</h2>
                  </div>

                  <button
                    type="button"
                    className="btn-add-discount"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus size={15} /> <span>Add discount</span>
                  </button>
                </div>
                <p className="form-card-subtitle">
                  Add at least one discount to this campaign. These discounts will be activated together based on the campaign dates.
                </p>

                {attachedDiscounts.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "#6b7280", fontSize: "13.5px" }}>
                    No discounts attached yet. Click "+ Add discount" above to select existing discounts or create a new one.
                  </div>
                ) : (
                  <div className="campaign-discounts-table-wrapper">
                    <table className="campaign-discounts-table">
                      <thead>
                        <tr>
                          <th style={{ width: "4%" }}>#</th>
                          <th style={{ width: "24%" }}>Discount</th>
                          <th style={{ width: "14%" }}>Method</th>
                          <th style={{ width: "12%" }}>Value</th>
                          <th style={{ width: "14%" }}>Price floor</th>
                          <th style={{ width: "16%" }}>Applies to</th>
                          <th style={{ width: "8%" }}>Min qty</th>
                          <th style={{ width: "8%" }}>Min subtotal</th>
                          <th style={{ width: "4%", textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attachedDiscounts.map((d, index) => (
                          <tr key={d.id}>
                            <td>{index + 1}</td>
                            <td>
                              <div className="discount-name-badge">
                                <span className="discount-name-title">{d.code || d.title}</span>
                                <span className="discount-name-sub">{d.title}</span>
                              </div>
                            </td>
                            <td>{d.method === "CODE" ? "Code" : "Automatic"}</td>
                            <td>{d.valueType === "PERCENTAGE" ? `${d.value}%` : `₹${d.value}`}</td>
                            <td>
                              {d.floorType === "AMOUNT"
                                ? `Min ₹${d.floorValue}`
                                : d.floorType === "PERCENT_OF_MRP"
                                ? `Min ${d.floorValue}%`
                                : "No floor"}
                            </td>
                            <td>
                              {d.targetType === "ALL"
                                ? "All products"
                                : d.targetType === "COLLECTIONS"
                                ? "Collections"
                                : "Specific products"}
                            </td>
                            <td>{d.minQuantity ?? 1}</td>
                            <td>₹{d.minSubtotal ?? 0}</td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="btn-remove-icon"
                                title="Remove discount"
                                onClick={() => setDeleteTarget({ id: d.id, title: d.title || d.code })}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Card 3: Lifecycle (Matching Reference Screenshot) */}
              <div className="form-card">
                <div className="form-card-header">
                  <div className="form-card-icon green">
                    <Clock size={16} />
                  </div>
                  <h2 className="form-card-title">Lifecycle</h2>
                </div>

                <div className="lifecycle-stepper-container">
                  {/* Stepper Progress Bar Visual */}
                  <div className="stepper-timeline">
                    <div className="stepper-timeline-line" />
                    <div className="stepper-timeline-progress" style={{ width: "0%" }} />

                    {/* Step 1: Draft */}
                    <div className="stepper-step completed">
                      <div className="step-node">
                        <Check size={14} />
                      </div>
                      <div className="step-info">
                        <span className="step-title">Draft</span>
                        <span className="step-desc">Nothing is live in Shopify yet.</span>
                      </div>
                    </div>

                    {/* Step 2: Scheduled */}
                    <div className="stepper-step">
                      <div className="step-node" />
                      <div className="step-info">
                        <span className="step-title">Scheduled</span>
                        <span className="step-desc">Waiting for the start date.</span>
                      </div>
                    </div>

                    {/* Step 3: Active */}
                    <div className="stepper-step">
                      <div className="step-node" />
                      <div className="step-info">
                        <span className="step-title">Active</span>
                        <span className="step-desc">All discounts in this campaign are live.</span>
                      </div>
                    </div>

                    {/* Step 4: Ended */}
                    <div className="stepper-step">
                      <div className="step-node" />
                      <div className="step-info">
                        <span className="step-title">Ended</span>
                        <span className="step-desc">Dates have passed or you ended the campaign.</span>
                      </div>
                    </div>
                  </div>

                  <div className="lifecycle-status-banner">
                    <div className="lifecycle-banner-icon">
                      <Calendar size={16} />
                    </div>
                    <div className="lifecycle-banner-text">
                      <span className="lifecycle-banner-title">
                        This campaign will start on {startsAt} (UTC).
                      </span>
                      <span className="lifecycle-banner-sub">
                        All attached discounts will be activated automatically once you create and publish the campaign.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: History */}
              <div className="form-card">
                <div className="history-card-body">
                  <div className="form-card-header">
                    <div className="form-card-icon blue">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h2 className="form-card-title">History</h2>
                      <p className="form-card-subtitle" style={{ margin: "2px 0 0 0" }}>
                        View all changes and actions related to this campaign.
                      </p>
                    </div>
                  </div>

                  <Link to="/app/logs" className="btn-audit-trail">
                    <span>View audit trail</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Sticky Sidebar (ONLY "How campaigns work", NO Examples card) */}
            <div className="campaign-sidebar">
              <div className="how-campaigns-card">
                <div className="how-campaigns-header">
                  <div className="form-card-icon lightblue">
                    <Lightbulb size={16} />
                  </div>
                  <h3 className="how-campaigns-title">How campaigns work</h3>
                </div>
                <p className="how-campaigns-text">
                  A campaign lets you group multiple discount coupons and run them together for a specific time period. You can target specific products, collections or run a site-wide campaign.
                </p>
              </div>

              {/* Bottom Actions Buttons */}
              <div className="campaign-form-actions-row">
                <Link to="/app/campaigns" className="btn-cancel">
                  Cancel
                </Link>
                <button type="submit" disabled={busy} className="btn-submit-green">
                  Save campaign
                </button>
              </div>
            </div>
          </div>
        </Form>

        {/* Add Discount Modal (Select from existing OR create new) */}
        {showAddModal && (
          <div className="add-discount-modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="add-discount-modal-card" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>Add Discount to Campaign</h3>
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                  onClick={() => setShowAddModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Option 1: Select from existing discounts */}
              <div className="add-discount-option-box">
                <label style={{ fontSize: "13.5px", fontWeight: 700, color: "#111827" }}>
                  Option 1: Select from existing discounts
                </label>
                {availableUnassigned.length === 0 ? (
                  <p style={{ fontSize: "12.5px", color: "#6b7280", margin: 0 }}>
                    No unassigned discounts available in your store.
                  </p>
                ) : (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <select
                      value={selectedDiscountId}
                      onChange={(e) => setSelectedDiscountId(e.target.value)}
                      className="form-select"
                      style={{ flex: 1 }}
                    >
                      <option value="">Select a discount...</option>
                      {availableUnassigned.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title || d.code} ({d.valueType === "PERCENTAGE" ? `${d.value}%` : `₹${d.value}`})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedDiscountId}
                      onClick={handleAttachDiscount}
                      className="btn-submit-green"
                      style={{ padding: "8px 16px", borderRadius: "8px" }}
                    >
                      Add Selected
                    </button>
                  </div>
                )}
              </div>

              {/* Option 2: Create new discount */}
              <div className="add-discount-option-box">
                <label style={{ fontSize: "13.5px", fontWeight: 700, color: "#111827" }}>
                  Option 2: Create a new discount
                </label>
                <p style={{ fontSize: "12.5px", color: "#6b7280", margin: 0 }}>
                  Create a new discount from scratch.
                </p>
                <Link
                  to="/app/discounts/new"
                  className="btn-add-discount"
                  style={{ alignSelf: "flex-start", marginTop: "4px" }}
                >
                  <Plus size={15} /> <span>Create New Discount</span>
                </Link>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Discount Confirmation Modal */}
        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Remove Discount?"
          message={`Are you sure you want to remove "${deleteTarget?.title}" from this campaign?`}
          confirmLabel="Remove"
          confirmVariant="critical"
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleRemoveDiscount(deleteTarget?.id)}
        />
      </div>
    </AppShell>
  );
}
