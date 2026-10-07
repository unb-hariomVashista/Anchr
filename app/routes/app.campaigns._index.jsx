import { Form, useFetcher, useLoaderData, useSearchParams, Link } from "react-router";
import { useState, useRef } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Calendar,
  ChevronDown,
  X,
  MoreVertical,
  Pencil,
  Pause,
  Play,
  Copy,
  Trash2,
} from "lucide-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { newContext } from "../services/shopify-client.server";
import {
  duplicateCampaign,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
  syncCampaignStatuses,
} from "../services/campaigns.server";
import { AppShell } from "../components/ui";
import { useClickOutside } from "../components/useClickOutside";
import { ConfirmModal } from "../components/ConfirmModal";
import "../styles/campaigns-page.css";

const STATUS_OPTIONS = ["All Statuses", "Active", "Paused", "Scheduled", "Completed", "Draft"];

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  try {
    await syncCampaignStatuses(newContext(admin, session));
  } catch (e) {
    // Ignore sync errors in fallback
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") || "ALL";
  const q = url.searchParams.get("q")?.trim() || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const pageSize = 8;

  const where = {
    shop: session.shop,
    ...(statusParam !== "ALL" && statusParam !== "All Statuses"
      ? { status: statusParam.toUpperCase() }
      : {}),
    ...(q ? { name: { contains: q } } : {}),
  };

  const [totalCount, activeCount, pausedCount, completedCount, campaigns] = await Promise.all([
    db.campaign.count({ where: { shop: session.shop } }),
    db.campaign.count({ where: { shop: session.shop, status: "ACTIVE" } }),
    db.campaign.count({ where: { shop: session.shop, status: "PAUSED" } }),
    db.campaign.count({
      where: {
        shop: session.shop,
        status: { in: ["ENDED", "COMPLETED", "CANCELLED"] },
      },
    }),
    db.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        discounts: { select: { id: true, code: true, title: true } },
      },
    }),
  ]);

  return {
    totalCount,
    activeCount,
    pausedCount,
    completedCount,
    campaigns,
    currentPage: page,
    pageSize,
    filters: { status: statusParam, q, from, to },
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const ctx = newContext(admin, session);
  const form = await request.formData();
  const intent = form.get("intent");
  const id = form.get("id")?.toString();

  try {
    if (intent === "duplicate") {
      await duplicateCampaign(ctx, id);
    } else if (intent === "pause") {
      await pauseCampaign(ctx, id);
    } else if (intent === "resume") {
      await resumeCampaign(ctx, id);
    } else if (intent === "delete") {
      await deleteCampaign(ctx, id);
    }
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
};

// 3-dots action dropdown menu that automatically closes when clicked outside
function ThreeDotsMenu({ campaign }) {
  const [open, setOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const menuRef = useRef(null);
  const fetcher = useFetcher();
  const busy = fetcher.state !== "idle";

  useClickOutside(menuRef, () => setOpen(false), open);

  const handleAction = (intent) => {
    setOpen(false);
    fetcher.submit({ intent, id: campaign.id }, { method: "post" });
  };

  const status = campaign.status;

  return (
    <>
      <div className="action-dropdown-wrapper" ref={menuRef}>
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
              to={`/app/campaigns/${campaign.id}`}
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

            {(status === "PAUSED" || status === "SCHEDULED") && (
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
              className="dropdown-item"
              disabled={busy}
              onClick={() => handleAction("duplicate")}
            >
              <Copy size={15} /> <span>Duplicate</span>
            </button>

            <button
              type="button"
              className="dropdown-item delete"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setShowDeleteModal(true);
              }}
            >
              <Trash2 size={15} /> <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Campaign?"
        message={`Are you sure you want to delete campaign "${campaign.name}"? This action cannot be undone.`}
        confirmLabel="Delete Campaign"
        confirmVariant="critical"
        loading={busy}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          fetcher.submit({ intent: "delete", id: campaign.id }, { method: "post" });
          setShowDeleteModal(false);
        }}
      />
    </>
  );
}

export default function Campaigns() {
  const {
    totalCount,
    activeCount,
    pausedCount,
    completedCount,
    campaigns,
    currentPage,
    pageSize,
    filters,
  } = useLoaderData();

  const [params] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const filterRef = useRef(null);
  const dateRef = useRef(null);

  // Automatically close filter popovers when clicking outside or clicking any interactive element outside
  useClickOutside(filterRef, () => setFilterOpen(false), filterOpen);
  useClickOutside(dateRef, () => setDateOpen(false), dateOpen);

  // Standard sample items matching user design screenshot for empty/demo DB states
  const mockCampaigns = [
    {
      id: "camp-1",
      name: "Diwali Sale",
      subtitle: "Festive offers across key categories",
      couponsCount: "5 coupons",
      couponsSub: "DIWALI10, DIWALI20 ...",
      appliesTo: "All Products",
      appliesSub: "1,000 products",
      schedule: "Oct 20, 2026 – Nov 5, 2026",
      status: "ACTIVE",
    },
    {
      id: "camp-2",
      name: "Summer Collection",
      subtitle: "Seasonal discounts on summer wear",
      couponsCount: "3 coupons",
      couponsSub: "SUMMER10, SUMMER20 ...",
      appliesTo: "Summer Collection",
      appliesSub: "95 products",
      schedule: "Apr 1, 2026 – Apr 30, 2026",
      status: "PAUSED",
    },
    {
      id: "camp-3",
      name: "Clearance Sale",
      subtitle: "End of season clearance offers",
      couponsCount: "4 coupons",
      couponsSub: "CLEARANCE10 ...",
      appliesTo: "Clearance Collection",
      appliesSub: "80 products",
      schedule: "Oct 1, 2026 – Oct 15, 2026",
      status: "ACTIVE",
    },
    {
      id: "camp-4",
      name: "New Arrivals Launch",
      subtitle: "Special discount on new products",
      couponsCount: "2 coupons",
      couponsSub: "NEW15, NEW20",
      appliesTo: "New Arrivals",
      appliesSub: "60 products",
      schedule: "Oct 5, 2026 – Nov 5, 2026",
      status: "ACTIVE",
    },
    {
      id: "camp-5",
      name: "Winter Essentials",
      subtitle: "Discounts on winter collection",
      couponsCount: "3 coupons",
      couponsSub: "WINTER10, WINTER20 ...",
      appliesTo: "Winter Collection",
      appliesSub: "120 products",
      schedule: "Nov 1, 2026 – Dec 31, 2026",
      status: "SCHEDULED",
    },
    {
      id: "camp-6",
      name: "Welcome Offer",
      subtitle: "First time customer discount",
      couponsCount: "1 coupon",
      couponsSub: "WELCOME10",
      appliesTo: "All Products",
      appliesSub: "1,000 products",
      schedule: "Oct 1, 2026 – Dec 31, 2026",
      status: "COMPLETED",
    },
    {
      id: "camp-7",
      name: "Flash Sale",
      subtitle: "Limited time offer",
      couponsCount: "2 coupons",
      couponsSub: "FLASH20, FLASH30",
      appliesTo: "Selected Products",
      appliesSub: "30 products",
      schedule: "Oct 10, 2026 – Oct 12, 2026",
      status: "COMPLETED",
    },
    {
      id: "camp-8",
      name: "Festival Bundle",
      subtitle: "Bundle offers for festive season",
      couponsCount: "4 coupons",
      couponsSub: "FESTIVE10 ...",
      appliesTo: "Selected Collections",
      appliesSub: "250 products",
      schedule: "Oct 15, 2026 – Nov 15, 2026",
      status: "PAUSED",
    },
  ];

  const isDbPopulated = campaigns && campaigns.length > 0;
  let rawItems = isDbPopulated
    ? campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        subtitle: c.description || "Group discount campaign",
        couponsCount: `${c.discounts?.length || 0} coupon${(c.discounts?.length || 0) === 1 ? "" : "s"}`,
        couponsSub: c.discounts?.map((d) => d.code || d.title).join(", ") || "No coupons",
        appliesTo: "Selected items",
        appliesSub: "Campaign products",
        schedule: `${c.startsAt ? new Date(c.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Immediate"} – ${c.endsAt ? new Date(c.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No expiry"}`,
        status: c.status,
      }))
    : mockCampaigns;

  // Filter items in UI
  if (filters.status !== "ALL" && filters.status !== "All Statuses") {
    rawItems = rawItems.filter(
      (item) => item.status.toLowerCase() === filters.status.toLowerCase()
    );
  }
  if (filters.q) {
    const qLower = filters.q.toLowerCase();
    rawItems = rawItems.filter(
      (item) =>
        item.name.toLowerCase().includes(qLower) ||
        item.subtitle.toLowerCase().includes(qLower) ||
        item.couponsSub.toLowerCase().includes(qLower) ||
        item.appliesTo.toLowerCase().includes(qLower)
    );
  }

  const displayItems = rawItems;
  const totalDisplayCount = isDbPopulated ? totalCount : 24;
  const activeDisplayCount = isDbPopulated ? activeCount : 16;
  const pausedDisplayCount = isDbPopulated ? pausedCount : 5;
  const completedDisplayCount = isDbPopulated ? completedCount : 3;

  const totalPages = Math.ceil(displayItems.length / pageSize) || 1;
  const startItem = displayItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, displayItems.length);

  // Count active filter criteria
  let activeFilterCount = 0;
  if (filters.status !== "ALL" && filters.status !== "All Statuses") activeFilterCount++;
  if (filters.from || filters.to) activeFilterCount++;

  const buildPageUrl = (pageNumber) => {
    const p = new URLSearchParams(params);
    p.set("page", pageNumber.toString());
    return `/app/campaigns?${p.toString()}`;
  };

  const dateLabel = filters.from && filters.to
    ? `${filters.from} – ${filters.to}`
    : "Oct 1, 2026 – Oct 31, 2026";

  const renderStatusBadge = (status) => {
    const st = (status || "").toLowerCase();
    let badgeClass = "completed";
    let label = status;

    if (st === "active") {
      badgeClass = "active";
      label = "Active";
    } else if (st === "paused") {
      badgeClass = "paused";
      label = "Paused";
    } else if (st === "scheduled") {
      badgeClass = "scheduled";
      label = "Scheduled";
    } else if (st === "completed" || st === "ended") {
      badgeClass = "completed";
      label = "Completed";
    } else if (st === "draft") {
      badgeClass = "draft";
      label = "Draft";
    }

    return <span className={`status-badge-pill ${badgeClass}`}>{label}</span>;
  };

  return (
    <AppShell>
      <div className="campaigns-page">
        {/* Header */}
        <div className="campaigns-header">
          <div className="campaigns-title-group">
            <h1>Campaigns</h1>
            <p>
              Create and manage MRP-based discount campaigns to run multiple coupons together for specific products, collections or time periods.
            </p>
          </div>
          <Link to="/app/campaigns/new" className="btn-create-campaign">
            <Plus size={16} /> <span>Create Campaign</span>
          </Link>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="campaigns-metrics-grid">
          <div className="campaigns-metric-card">
            <div className="campaigns-metric-info">
              <span className="campaigns-metric-label">Total Campaigns</span>
              <span className="campaigns-metric-value">{totalDisplayCount}</span>
              <span className="campaigns-metric-change positive">↑ +33% vs last month</span>
            </div>
          </div>

          <div className="campaigns-metric-card">
            <div className="campaigns-metric-info">
              <span className="campaigns-metric-label">Active</span>
              <span className="campaigns-metric-value">{activeDisplayCount}</span>
              <span className="campaigns-metric-change positive">67% of total</span>
            </div>
          </div>

          <div className="campaigns-metric-card">
            <div className="campaigns-metric-info">
              <span className="campaigns-metric-label">Paused</span>
              <span className="campaigns-metric-value">{pausedDisplayCount}</span>
              <span className="campaigns-metric-change orange">21% of total</span>
            </div>
          </div>

          <div className="campaigns-metric-card">
            <div className="campaigns-metric-info">
              <span className="campaigns-metric-label">Completed</span>
              <span className="campaigns-metric-value">{completedDisplayCount}</span>
              <span className="campaigns-metric-change subdued">12% of total</span>
            </div>
          </div>
        </div>

        {/* Search Row & Popover Filters */}
        <Form method="get" className="campaigns-search-row">
          {/* Search Input (Max width 480px) */}
          <div className="campaigns-search-wrapper">
            <Search size={16} />
            <input
              type="text"
              name="q"
              className="campaigns-search-input"
              placeholder="Search by campaign name, coupon code or product..."
              defaultValue={filters.q}
            />
          </div>

          <div className="campaigns-controls-right">
            {/* Date Range Selector Button & Popover */}
            <div style={{ position: "relative" }} ref={dateRef}>
              <button
                type="button"
                className="date-picker-btn"
                onClick={() => setDateOpen(!dateOpen)}
              >
                <Calendar size={15} />
                <span>{dateLabel}</span>
                <ChevronDown size={14} />
              </button>

              <div
                className="filter-popover-panel"
                style={{ width: "300px", display: dateOpen ? "flex" : "none" }}
              >
                <h3 className="filter-panel-title">
                  <span>Select Date Range</span>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                    onClick={() => setDateOpen(false)}
                  >
                    <X size={16} />
                  </button>
                </h3>
                <div className="filter-group">
                  <label htmlFor="from-date">From Date</label>
                  <input
                    id="from-date"
                    type="date"
                    name="from"
                    defaultValue={filters.from || "2026-10-01"}
                  />
                </div>
                <div className="filter-group">
                  <label htmlFor="to-date">To Date</label>
                  <input
                    id="to-date"
                    type="date"
                    name="to"
                    defaultValue={filters.to || "2026-10-31"}
                  />
                </div>
                <div className="filter-panel-actions">
                  <Link to="/app/campaigns" className="btn-reset-panel" onClick={() => setDateOpen(false)}>
                    Clear
                  </Link>
                  <button type="submit" className="btn-apply-panel" onClick={() => setDateOpen(false)}>
                    Apply Date
                  </button>
                </div>
              </div>
            </div>

            {/* Single Filters Button & Popover */}
            <div style={{ position: "relative" }} ref={filterRef}>
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

              {/* Expandable Filter Popover Box */}
              <div
                className="filter-popover-panel"
                style={{ display: filterOpen ? "flex" : "none" }}
              >
                <h3 className="filter-panel-title">
                  <span>Filter Campaigns</span>
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

                <div className="filter-panel-actions">
                  <Link
                    to="/app/campaigns"
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
            </div>
          </div>
        </Form>

        {/* Table Card (Clean text without product icons/images and without performance column) */}
        <div className="campaigns-table-card">
          <div className="campaigns-table-wrapper">
            <table className="campaigns-table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Campaign Name</th>
                  <th style={{ width: "20%" }}>Coupons</th>
                  <th style={{ width: "22%" }}>Applies To</th>
                  <th style={{ width: "18%" }}>Schedule</th>
                  <th style={{ width: "8%" }}>Status</th>
                  <th style={{ width: "4%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="campaign-name-cell">
                        <Link to={`/app/campaigns/${item.id}`}>{item.name}</Link>
                        <span className="campaign-subtitle">{item.subtitle}</span>
                      </div>
                    </td>
                    <td>
                      <div className="coupons-cell">
                        <span className="coupons-count">{item.couponsCount}</span>
                        <span className="coupons-codes">{item.couponsSub}</span>
                      </div>
                    </td>
                    <td>
                      <div className="applies-cell">
                        <span className="applies-title">{item.appliesTo}</span>
                        <span className="applies-sub">{item.appliesSub}</span>
                      </div>
                    </td>
                    <td>
                      <span className="schedule-cell">{item.schedule}</span>
                    </td>
                    <td>{renderStatusBadge(item.status)}</td>
                    <td style={{ textAlign: "right" }}>
                      <ThreeDotsMenu campaign={item} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer & Pagination */}
          <div className="campaigns-footer">
            <span className="footer-info-text">
              Showing {startItem}-{endItem} of {totalDisplayCount} campaigns
            </span>
            <div className="pagination-controls">
              <Link
                to={buildPageUrl(Math.max(1, currentPage - 1))}
                className={`page-num-btn ${currentPage === 1 ? "disabled" : ""}`}
                onClick={(e) => currentPage === 1 && e.preventDefault()}
              >
                ‹
              </Link>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <Link
                  key={pg}
                  to={buildPageUrl(pg)}
                  className={`page-num-btn ${currentPage === pg ? "active" : ""}`}
                >
                  {pg}
                </Link>
              ))}
              <Link
                to={buildPageUrl(Math.min(totalPages, currentPage + 1))}
                className={`page-num-btn ${currentPage === totalPages ? "disabled" : ""}`}
                onClick={(e) => currentPage === totalPages && e.preventDefault()}
              >
                ›
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
