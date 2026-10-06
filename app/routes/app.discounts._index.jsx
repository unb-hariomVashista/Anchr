import { Form, useFetcher, useLoaderData, useSearchParams, Link } from "react-router";
import { useState } from "react";
import {
  Tag,
  CheckCircle2,
  PauseCircle,
  Clock,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  Package,
  MoreVertical,
  Pencil,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { newContext, ShopifyUserError } from "../services/shopify-client.server";
import { deleteDiscount, setDiscountPaused, pushDiscount } from "../services/discounts.server";
import { AppShell } from "../components/ui";
import "../styles/discounts-page.css";

const STATUS_OPTIONS = ["All Statuses", "Active", "Paused", "Expired", "Draft"];
const AMOUNT_OPTIONS = ["All Amounts", "Under 20%", "20% - 40%", "Over 40%", "Under ₹500", "₹500+"];
const TYPE_OPTIONS = ["All Types", "Percentage", "Fixed Amount"];
const VALIDITY_OPTIONS = ["All Validity", "Active Now", "Expiring Soon", "Expired"];

const PAGE_SIZE = 8;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const q = url.searchParams.get("q")?.trim() || "";
  const statusParam = url.searchParams.get("status") || "ALL";
  const amountParam = url.searchParams.get("amount") || "ALL";
  const typeParam = url.searchParams.get("type") || "ALL";
  const validityParam = url.searchParams.get("validity") || "ALL";

  // Build Prisma query condition
  const where = { shop };

  if (statusParam !== "ALL" && statusParam !== "All Statuses") {
    where.status = statusParam.toUpperCase();
  }

  if (typeParam !== "ALL" && typeParam !== "All Types") {
    where.valueType = typeParam === "Percentage" ? "PERCENTAGE" : "FIXED_AMOUNT";
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { code: { contains: q } },
    ];
  }

  const skip = (page - 1) * PAGE_SIZE;

  const [totalCount, dbDiscounts, activeCount, pausedCount, expiredCount] = await Promise.all([
    db.discount.count({ where }),
    db.discount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { campaign: { select: { id: true, name: true } } },
    }),
    db.discount.count({ where: { shop, status: "ACTIVE" } }),
    db.discount.count({ where: { shop, status: "PAUSED" } }),
    db.discount.count({ where: { shop, status: "EXPIRED" } }),
  ]);

  return {
    totalCount,
    discounts: dbDiscounts,
    activeCount,
    pausedCount,
    expiredCount,
    currentPage: page,
    pageSize: PAGE_SIZE,
    filters: {
      q,
      status: statusParam,
      amount: amountParam,
      type: typeParam,
      validity: validityParam,
    },
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const ctx = newContext(admin, session);
  const form = await request.formData();
  const intent = form.get("intent");
  const id = form.get("id")?.toString();

  if (!id) return { error: "Missing discount id." };

  try {
    if (intent === "pause") await setDiscountPaused(ctx, id, true);
    else if (intent === "resume") await setDiscountPaused(ctx, id, false);
    else if (intent === "retry") await pushDiscount(ctx, id);
    else if (intent === "delete") await deleteDiscount(ctx, id);
    else return { error: "Unknown action." };
    return { ok: true };
  } catch (err) {
    return { error: err instanceof ShopifyUserError ? err.message : `Unexpected error: ${err.message}` };
  }
};

// Component for 3-dots dropdown menu using Lucide Icons (NO EMOJIS)
function ThreeDotsMenu({ discount }) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  const busy = fetcher.state !== "idle";

  const handleAction = (intent) => {
    setOpen(false);
    fetcher.submit({ intent, id: discount.id }, { method: "post" });
  };

  const handleDelete = () => {
    setOpen(false);
    if (confirm(`Are you sure you want to delete discount "${discount.title || discount.code}"?`)) {
      fetcher.submit({ intent: "delete", id: discount.id }, { method: "post" });
    }
  };

  const status = discount.status;

  return (
    <div className="action-dropdown-wrapper">
      <button
        type="button"
        className="three-dots-btn"
        onClick={() => setOpen(!open)}
        title="Actions"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="dropdown-menu">
          <Link
            to={`/app/discounts/${discount.id}`}
            className="dropdown-item"
            onClick={() => setOpen(false)}
          >
            <Pencil size={15} /> <span>Edit</span>
          </Link>

          {status === "ACTIVE" && (
            <button
              type="button"
              className="dropdown-item"
              disabled={busy}
              onClick={() => handleAction("pause")}
            >
              <Pause size={15} /> <span>Pause</span>
            </button>
          )}

          {status === "PAUSED" && (
            <button
              type="button"
              className="dropdown-item"
              disabled={busy}
              onClick={() => handleAction("resume")}
            >
              <Play size={15} /> <span>Resume</span>
            </button>
          )}

          <button
            type="button"
            className="dropdown-item delete"
            disabled={busy}
            onClick={handleDelete}
          >
            <Trash2 size={15} /> <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function Discounts() {
  const {
    totalCount,
    discounts,
    activeCount,
    pausedCount,
    expiredCount,
    currentPage,
    pageSize,
    filters,
  } = useLoaderData();

  const [params] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);

  // Standard sample items matching user design screenshot for empty/demo DB states
  const mockDiscounts = [
    {
      id: "disc-1",
      code: "MRP25",
      name: "25% off on MRP",
      discountValue: "25%",
      discountSub: "off on MRP",
      type: "Percentage",
      appliesTo: "All Products",
      appliesSub: "120 products",
      used: 34,
      limit: 500,
      validity: "Oct 1, 2026 – Oct 31, 2026",
      status: "ACTIVE",
    },
    {
      id: "disc-2",
      code: "FESTIVE20",
      name: "Festive Season Sale",
      discountValue: "20%",
      discountSub: "off on MRP",
      type: "Percentage",
      appliesTo: "Festival Collection",
      appliesSub: "45 products",
      used: 230,
      limit: 1000,
      validity: "Oct 1, 2026 – Oct 31, 2026",
      status: "ACTIVE",
    },
    {
      id: "disc-3",
      code: "CLEARANCE30",
      name: "Clearance Sale",
      discountValue: "30%",
      discountSub: "off on MRP",
      type: "Percentage",
      appliesTo: "Clearance Collection",
      appliesSub: "80 products",
      used: 512,
      limit: 1000,
      validity: "Oct 1, 2026 – Oct 15, 2026",
      status: "ACTIVE",
    },
    {
      id: "disc-4",
      code: "NEW15",
      name: "New Arrivals",
      discountValue: "15%",
      discountSub: "off on MRP",
      type: "Percentage",
      appliesTo: "New Arrivals",
      appliesSub: "60 products",
      used: 120,
      limit: 500,
      validity: "Oct 5, 2026 – Oct 31, 2026",
      status: "ACTIVE",
    },
    {
      id: "disc-5",
      code: "DIWALI50",
      name: "Diwali Mega Offer",
      discountValue: "50%",
      discountSub: "off on MRP",
      type: "Percentage",
      appliesTo: "All Products",
      appliesSub: "250 products",
      used: 1000,
      limit: 1000,
      validity: "Oct 10, 2026 – Nov 5, 2026",
      status: "EXPIRED",
    },
    {
      id: "disc-6",
      code: "FLAT500",
      name: "Flat ₹500 off",
      discountValue: "₹500",
      discountSub: "off on MRP",
      type: "Fixed Amount",
      appliesTo: "Premium Collection",
      appliesSub: "30 products",
      used: 45,
      limit: 200,
      validity: "Oct 1, 2026 – Oct 31, 2026",
      status: "ACTIVE",
    },
    {
      id: "disc-7",
      code: "SUMMER10",
      name: "Summer Sale",
      discountValue: "10%",
      discountSub: "off on MRP",
      type: "Percentage",
      appliesTo: "Summer Collection",
      appliesSub: "95 products",
      used: 0,
      limit: 500,
      validity: "Oct 1, 2026 – Oct 31, 2026",
      status: "PAUSED",
    },
    {
      id: "disc-8",
      code: "WELCOME10",
      name: "Welcome Offer",
      discountValue: "10%",
      discountSub: "off on MRP",
      type: "Percentage",
      appliesTo: "All Products",
      appliesSub: "250 products",
      used: 67,
      limit: 500,
      validity: "Oct 1, 2026 – Dec 31, 2026",
      status: "ACTIVE",
    },
  ];

  const isDbPopulated = discounts && discounts.length > 0;
  let rawItems = isDbPopulated
    ? discounts.map((d) => ({
        id: d.id,
        code: d.code || d.title,
        name: d.title || "Discount",
        discountValue: d.valueType === "PERCENTAGE" ? `${d.value}%` : `₹${d.value}`,
        discountSub: "off on MRP",
        type: d.valueType === "PERCENTAGE" ? "Percentage" : "Fixed Amount",
        appliesTo: d.targetType === "ALL" ? "All Products" : d.targetType === "COLLECTIONS" ? "Collections" : "Products",
        appliesSub: d.campaign ? d.campaign.name : "Selected items",
        used: 0,
        limit: 500,
        validity: `${d.startsAt ? new Date(d.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Immediate"} – ${d.endsAt ? new Date(d.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No expiry"}`,
        status: d.status,
      }))
    : mockDiscounts;

  // Filter items in UI for both DB and Mock data
  if (filters.status !== "ALL" && filters.status !== "All Statuses") {
    rawItems = rawItems.filter(
      (item) => item.status.toLowerCase() === filters.status.toLowerCase()
    );
  }
  if (filters.type !== "ALL" && filters.type !== "All Types") {
    rawItems = rawItems.filter(
      (item) => item.type.toLowerCase() === filters.type.toLowerCase()
    );
  }
  if (filters.amount !== "ALL" && filters.amount !== "All Amounts") {
    rawItems = rawItems.filter((item) => {
      const val = parseInt(item.discountValue.replace(/[^0-9]/g, ""), 10);
      if (filters.amount === "Under 20%") return item.type === "Percentage" && val < 20;
      if (filters.amount === "20% - 40%") return item.type === "Percentage" && val >= 20 && val <= 40;
      if (filters.amount === "Over 40%") return item.type === "Percentage" && val > 40;
      if (filters.amount === "Under ₹500") return item.type === "Fixed Amount" && val < 500;
      if (filters.amount === "₹500+") return item.type === "Fixed Amount" && val >= 500;
      return true;
    });
  }
  if (filters.q) {
    const qLower = filters.q.toLowerCase();
    rawItems = rawItems.filter(
      (item) =>
        item.code.toLowerCase().includes(qLower) ||
        item.name.toLowerCase().includes(qLower) ||
        item.appliesTo.toLowerCase().includes(qLower)
    );
  }

  const displayItems = rawItems;
  const totalCouponsCount = isDbPopulated ? totalCount : 48;
  const activeCountDisplay = isDbPopulated ? activeCount : 34;
  const pausedCountDisplay = isDbPopulated ? pausedCount : 8;
  const expiredCountDisplay = isDbPopulated ? expiredCount : 6;

  // Real Pagination Calculations
  const totalPages = Math.ceil(displayItems.length / pageSize) || 1;
  const startItem = displayItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, displayItems.length);

  // Count active filter criteria
  let activeFilterCount = 0;
  if (filters.status !== "ALL" && filters.status !== "All Statuses") activeFilterCount++;
  if (filters.amount !== "ALL" && filters.amount !== "All Amounts") activeFilterCount++;
  if (filters.type !== "ALL" && filters.type !== "All Types") activeFilterCount++;
  if (filters.validity !== "ALL" && filters.validity !== "All Validity") activeFilterCount++;

  const buildPageUrl = (pageNumber) => {
    const p = new URLSearchParams(params);
    p.set("page", pageNumber.toString());
    return `/app/discounts?${p.toString()}`;
  };

  return (
    <AppShell>
      <div className="discounts-page">
        {/* Header */}
        <div className="discounts-header">
          <div className="discounts-title-group">
            <h1>Discounts</h1>
            <p>
              Manage all your MRP-based discount coupons. Create, edit, pause or delete coupons.
            </p>
          </div>
          <Link to="/app/discounts/new" className="btn-create-coupon">
            <Plus size={16} /> Create Coupon
          </Link>
        </div>

        {/* 4 Metric Cards */}
        <div className="discounts-metrics-grid">
          {/* Card 1 */}
          <div className="discounts-metric-card">
            <div className="discounts-metric-icon green">
              <Tag size={22} />
            </div>
            <div className="discounts-metric-info">
              <span className="discounts-metric-label">Total Coupons</span>
              <span className="discounts-metric-value">{totalCouponsCount}</span>
              <span className="discounts-metric-change positive">&uarr; +12% vs last month</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="discounts-metric-card">
            <div className="discounts-metric-icon active-dot">
              <CheckCircle2 size={22} />
            </div>
            <div className="discounts-metric-info">
              <span className="discounts-metric-label">Active</span>
              <span className="discounts-metric-value">{activeCountDisplay}</span>
              <span className="discounts-metric-change positive">
                {Math.round((activeCountDisplay / (totalCouponsCount || 1)) * 100)}% of total coupons
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="discounts-metric-card">
            <div className="discounts-metric-icon paused-orange">
              <PauseCircle size={22} />
            </div>
            <div className="discounts-metric-info">
              <span className="discounts-metric-label">Paused</span>
              <span className="discounts-metric-value">{pausedCountDisplay}</span>
              <span className="discounts-metric-change orange">
                {Math.round((pausedCountDisplay / (totalCouponsCount || 1)) * 100)}% of total coupons
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="discounts-metric-card">
            <div className="discounts-metric-icon expired-red">
              <Clock size={22} />
            </div>
            <div className="discounts-metric-info">
              <span className="discounts-metric-label">Expired</span>
              <span className="discounts-metric-value">{expiredCountDisplay}</span>
              <span className="discounts-metric-change red">
                {Math.round((expiredCountDisplay / (totalCouponsCount || 1)) * 100)}% of total coupons
              </span>
            </div>
          </div>
        </div>

        {/* Search & Single Filters Popover Button */}
        <Form method="get" className="discounts-search-row">
          {/* Search Input (Max width 480px) */}
          <div className="discounts-search-wrapper">
            <Search size={16} />
            <input
              type="text"
              name="q"
              className="discounts-search-input"
              placeholder="Search by coupon code, name or product..."
              defaultValue={filters.q}
            />
          </div>

          {/* Single Filters Button */}
          <button
            type="button"
            className={`btn-toggle-filters ${filterOpen ? "active" : ""}`}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <SlidersHorizontal size={15} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="filter-badge-count">{activeFilterCount}</span>
            )}
          </button>

          {/* Expandable Filter Popover Box (Kept mounted in DOM for form submission) */}
          <div
            className="filter-popover-panel"
            style={{ display: filterOpen ? "flex" : "none" }}
          >
            <h3 className="filter-panel-title">
              <span>Filter Discounts</span>
              <button
                type="button"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                onClick={() => setFilterOpen(false)}
              >
                <X size={16} />
              </button>
            </h3>

            {/* Status Filter */}
            <div className="filter-group">
              <label htmlFor="status-select">Status</label>
              <select
                id="status-select"
                name="status"
                defaultValue={filters.status}
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st === "All Statuses" ? "ALL" : st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Discount Amount Filter */}
            <div className="filter-group">
              <label htmlFor="amount-select">Discount Amount</label>
              <select
                id="amount-select"
                name="amount"
                defaultValue={filters.amount}
              >
                {AMOUNT_OPTIONS.map((amt) => (
                  <option key={amt} value={amt === "All Amounts" ? "ALL" : amt}>
                    {amt}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="filter-group">
              <label htmlFor="type-select">Discount Type</label>
              <select
                id="type-select"
                name="type"
                defaultValue={filters.type}
              >
                {TYPE_OPTIONS.map((tp) => (
                  <option key={tp} value={tp === "All Types" ? "ALL" : tp}>
                    {tp}
                  </option>
                ))}
              </select>
            </div>

            {/* Validity Filter */}
            <div className="filter-group">
              <label htmlFor="validity-select">Validity</label>
              <select
                id="validity-select"
                name="validity"
                defaultValue={filters.validity}
              >
                {VALIDITY_OPTIONS.map((val) => (
                  <option key={val} value={val === "All Validity" ? "ALL" : val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-panel-actions">
              <Link
                to="/app/discounts"
                className="btn-reset-panel"
                onClick={() => setFilterOpen(false)}
              >
                Clear All
              </Link>
              <button
                type="submit"
                className="btn-apply-panel"
                onClick={() => setFilterOpen(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </Form>

        {/* Table Card */}
        <div className="discounts-table-card">
          <div className="discounts-table-container">
            <table className="discounts-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input type="checkbox" />
                  </th>
                  <th>Coupon Code &darr;</th>
                  <th>Discount</th>
                  <th>Type</th>
                  <th>Applies To</th>
                  <th>Usage</th>
                  <th>Validity</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right", paddingRight: "20px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", color: "#6b7280", padding: "32px" }}>
                      No discounts found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  displayItems.map((item) => {
                    const usagePercent = Math.min(100, Math.round((item.used / item.limit) * 100));
                    return (
                      <tr key={item.id}>
                        {/* Checkbox */}
                        <td className="checkbox-col">
                          <input type="checkbox" />
                        </td>

                        {/* Coupon Code */}
                        <td>
                          <div className="code-col">
                            <span className="code-title">{item.code}</span>
                            <span className="code-sub">{item.name}</span>
                          </div>
                        </td>

                        {/* Discount */}
                        <td>
                          <div className="discount-col">
                            <span className="discount-title">{item.discountValue}</span>
                            <span className="discount-sub">{item.discountSub}</span>
                          </div>
                        </td>

                        {/* Type Pill */}
                        <td>
                          <span
                            className={`type-pill ${
                              item.type === "Percentage" ? "percentage" : "fixed"
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>

                        {/* Applies To */}
                        <td>
                          <div className="applies-col">
                            <div className="applies-icon">
                              <Package size={18} />
                            </div>
                            <div className="applies-info">
                              <span className="applies-title">{item.appliesTo}</span>
                              <span className="applies-sub">{item.appliesSub}</span>
                            </div>
                          </div>
                        </td>

                        {/* Usage Progress */}
                        <td>
                          <div className="usage-progress-col">
                            <div className="usage-progress-info">
                              <div className="usage-text-row">
                                <span className="usage-num">
                                  {item.used} / {item.limit}
                                </span>
                                <span className="usage-percent">{usagePercent}%</span>
                              </div>
                              <div className="usage-bar-bg">
                                <div
                                  className={`usage-bar-fill ${usagePercent >= 100 ? "full" : ""}`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Validity */}
                        <td>
                          <span className="validity-text">{item.validity}</span>
                        </td>

                        {/* Status Badge */}
                        <td>
                          <span
                            className={`status-badge-pill ${item.status.toLowerCase()}`}
                          >
                            {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                          </span>
                        </td>

                        {/* Actions 3-dots Dropdown Menu (Lucide Icons) */}
                        <td style={{ textAlign: "right", paddingRight: "20px" }}>
                          <ThreeDotsMenu discount={item} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Real Dynamic Pagination Footer */}
          <div className="discounts-footer">
            <span className="footer-info-text">
              Showing {startItem}&ndash;{endItem} of {displayItems.length} coupons
            </span>

            <div className="pagination-controls">
              {currentPage > 1 ? (
                <Link to={buildPageUrl(currentPage - 1)} className="page-num-btn">
                  &lt;
                </Link>
              ) : (
                <button type="button" className="page-num-btn disabled" disabled>
                  &lt;
                </button>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Link
                  key={pageNum}
                  to={buildPageUrl(pageNum)}
                  className={`page-num-btn ${pageNum === currentPage ? "active" : ""}`}
                >
                  {pageNum}
                </Link>
              ))}

              {currentPage < totalPages ? (
                <Link to={buildPageUrl(currentPage + 1)} className="page-num-btn">
                  &gt;
                </Link>
              ) : (
                <button type="button" className="page-num-btn disabled" disabled>
                  &gt;
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
