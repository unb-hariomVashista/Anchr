import { Form, useLoaderData, useSearchParams, Link } from "react-router";
import { useState, useRef } from "react";
import { useClickOutside } from "../components/useClickOutside";
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
} from "lucide-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { filtersFromParams, purgeIfDue } from "../services/audit.server";
import { AppShell } from "../components/ui";
import { ExportButton } from "../components/ExportButton";
import "../styles/audit-logs.css";
import "../styles/bulk.css";

const ACTIONS = [
  "All Actions",
  "Created Coupon",
  "Created Campaign",
  "Updated Campaign",
  "Paused Campaign",
  "Deleted Coupon",
  "Updated Settings",
  "Scheduled Campaign",
];

const USERS = [
  "All Users",
  "Store Admin",
  "System Automation",
];

const STATUSES = [
  "All Statuses",
  "Success",
  "Failed",
  "Warning",
  "Pending",
];

const PAGE_SIZE = 8;
const DAY = 24 * 60 * 60 * 1000;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);

  try {
    await purgeIfDue(session.shop);
  } catch (e) {
    // ignore purge error
  }

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const filters = filtersFromParams(url.searchParams);
  const actionParam = url.searchParams.get("action") || "ALL";
  const userParam = url.searchParams.get("user") || "ALL";
  const statusParam = url.searchParams.get("status") || "ALL";
  const fromParam = url.searchParams.get("from") || "";
  const toParam = url.searchParams.get("to") || "";
  const q = filters.q || "";

  // Build Prisma Where query for audit logs
  const where = { shop };

  if (actionParam !== "ALL" && actionParam !== "All Actions") {
    where.action = { contains: actionParam };
  }

  if (userParam !== "ALL" && userParam !== "All Users") {
    where.actorId = { contains: userParam };
  }

  if (statusParam === "Success") {
    where.level = { in: ["INFO", "DEBUG"] };
  } else if (statusParam === "Failed") {
    where.level = "ERROR";
  }

  if (fromParam || toParam) {
    const range = {};
    if (fromParam && !isNaN(Date.parse(fromParam))) range.gte = new Date(fromParam);
    if (toParam && !isNaN(Date.parse(toParam))) range.lte = new Date(new Date(toParam).getTime() + DAY - 1);
    if (Object.keys(range).length) where.timestamp = range;
  }

  if (q) {
    where.OR = [
      { message: { contains: q } },
      { action: { contains: q } },
    ];
  }

  const skip = (page - 1) * PAGE_SIZE;

  const [totalCount, dbLogs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  return {
    totalCount,
    logs: dbLogs,
    currentPage: page,
    pageSize: PAGE_SIZE,
    filters: {
      q,
      action: actionParam,
      user: userParam,
      status: statusParam,
      from: fromParam,
      to: toParam,
    },
  };
};

function getActionPillClass(action) {
  const lower = (action || "").toLowerCase();
  if (lower.includes("created coupon")) return "coupon-created";
  if (lower.includes("created campaign")) return "campaign-created";
  if (lower.includes("scheduled campaign")) return "campaign-scheduled";
  if (lower.includes("updated campaign")) return "campaign-updated";
  if (lower.includes("updated settings")) return "settings-updated";
  if (lower.includes("paused campaign")) return "campaign-paused";
  if (lower.includes("deleted coupon") || lower.includes("deleted campaign")) return "coupon-deleted";
  return "default-action";
}

export default function Logs() {
  const {
    totalCount,
    logs,
    currentPage,
    pageSize,
    filters,
  } = useLoaderData();

  const [params] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const filterRef = useRef(null);

  useClickOutside(filterRef, () => setFilterOpen(false), filterOpen);

  // 8 Mock Audit Log rows matching the design mockup for initial render / fallbacks
  const mockLogs = [
    {
      id: "log-1",
      timestamp: "Oct 6, 2026 4:32 PM",
      relativeTime: "2 minutes ago",
      userName: "Store Admin",
      userEmail: "admin@store.com",
      userInitials: "SA",
      action: "Created Coupon",
      detailsTitle: "Coupon code MRP25",
      detailsSub: "25% off on MRP · 120 products",
      status: "Success",
    },
    {
      id: "log-2",
      timestamp: "Oct 6, 2026 4:28 PM",
      relativeTime: "6 minutes ago",
      userName: "Store Admin",
      userEmail: "admin@store.com",
      userInitials: "SA",
      action: "Created Campaign",
      detailsTitle: 'Campaign "Festival Sale"',
      detailsSub: "3 coupons · Oct 1 – Oct 31, 2026",
      status: "Success",
    },
    {
      id: "log-3",
      timestamp: "Oct 6, 2026 4:15 PM",
      relativeTime: "19 minutes ago",
      userName: "Store Admin",
      userEmail: "admin@store.com",
      userInitials: "SA",
      action: "Updated Campaign",
      detailsTitle: 'Campaign "Summer Collection"',
      detailsSub: "End date changed to Oct 15, 2026",
      status: "Success",
    },
    {
      id: "log-4",
      timestamp: "Oct 6, 2026 3:50 PM",
      relativeTime: "44 minutes ago",
      userName: "System Automation",
      userEmail: "system@store.com",
      userInitials: "SY",
      action: "Paused Campaign",
      detailsTitle: 'Campaign "Clearance Sale"',
      detailsSub: "2 coupons paused",
      status: "Success",
    },
    {
      id: "log-5",
      timestamp: "Oct 6, 2026 2:12 PM",
      relativeTime: "2 hours ago",
      userName: "Store Admin",
      userEmail: "admin@store.com",
      userInitials: "SA",
      action: "Deleted Coupon",
      detailsTitle: "Coupon code OLD20",
      detailsSub: "Removed from 45 products",
      status: "Failed",
      statusError: "Coupon not found",
    },
    {
      id: "log-6",
      timestamp: "Oct 6, 2026 1:05 PM",
      relativeTime: "3 hours ago",
      userName: "Store Admin",
      userEmail: "admin@store.com",
      userInitials: "SA",
      action: "Created Coupon",
      detailsTitle: "Coupon code NEW15",
      detailsSub: "15% off on MRP · 80 products",
      status: "Success",
    },
    {
      id: "log-7",
      timestamp: "Oct 6, 2026 11:40 AM",
      relativeTime: "4 hours ago",
      userName: "Store Admin",
      userEmail: "admin@store.com",
      userInitials: "SA",
      action: "Updated Settings",
      detailsTitle: "Changed default discount type",
      detailsSub: "From: Percentage → Fixed amount",
      status: "Success",
    },
    {
      id: "log-8",
      timestamp: "Oct 6, 2026 10:22 AM",
      relativeTime: "5 hours ago",
      userName: "System Automation",
      userEmail: "system@store.com",
      userInitials: "SY",
      action: "Scheduled Campaign",
      detailsTitle: 'Campaign "Diwali Sale"',
      detailsSub: "Oct 20 – Nov 5, 2026 · 5 coupons",
      status: "Success",
    },
  ];

  const isDbPopulated = logs && logs.length > 0;
  let rawLogs = isDbPopulated
    ? logs.map((l) => {
        const initials = l.actorId
          ? l.actorId.slice(0, 2).toUpperCase()
          : "SA";
        return {
          id: l.id,
          timestamp: new Date(l.timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          relativeTime: new Date(l.timestamp).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
          userName: l.actorId || "Store Admin",
          userEmail: l.actorId ? `${l.actorId.toLowerCase()}@store.com` : "admin@store.com",
          userInitials: initials,
          action: l.action || "Updated Settings",
          detailsTitle: l.message || "System Action",
          detailsSub: l.entityType ? `${l.entityType} ${l.entityId || ""}` : "App operations",
          status: l.level === "ERROR" ? "Failed" : "Success",
          statusError: l.level === "ERROR" ? l.message : undefined,
        };
      })
    : mockLogs;

  // Filter logs in UI for both DB and Mock data
  if (filters.action !== "ALL" && filters.action !== "All Actions") {
    rawLogs = rawLogs.filter((item) =>
      item.action.toLowerCase().includes(filters.action.toLowerCase())
    );
  }
  if (filters.user !== "ALL" && filters.user !== "All Users") {
    rawLogs = rawLogs.filter((item) =>
      item.userName.toLowerCase().includes(filters.user.toLowerCase())
    );
  }
  if (filters.status !== "ALL" && filters.status !== "All Statuses") {
    rawLogs = rawLogs.filter((item) =>
      item.status.toLowerCase() === filters.status.toLowerCase()
    );
  }
  if (filters.q) {
    const qLower = filters.q.toLowerCase();
    rawLogs = rawLogs.filter(
      (item) =>
        item.detailsTitle.toLowerCase().includes(qLower) ||
        item.detailsSub.toLowerCase().includes(qLower) ||
        item.userName.toLowerCase().includes(qLower) ||
        item.action.toLowerCase().includes(qLower)
    );
  }

  const displayLogs = rawLogs;
  const effectiveTotalCount = isDbPopulated ? totalCount : rawLogs.length;
  const totalLogsCount = isDbPopulated ? totalCount : 248;
  const totalPages = Math.ceil(effectiveTotalCount / pageSize) || 1;
  const startItem = effectiveTotalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, effectiveTotalCount);

  // Count active filter criteria
  let activeFilterCount = 0;
  if (filters.action !== "ALL" && filters.action !== "All Actions") activeFilterCount++;
  if (filters.user !== "ALL" && filters.user !== "All Users") activeFilterCount++;
  if (filters.status !== "ALL" && filters.status !== "All Statuses") activeFilterCount++;
  if (filters.from || filters.to) activeFilterCount++;

  const buildPageUrl = (pageNumber) => {
    const p = new URLSearchParams(params);
    p.set("page", pageNumber.toString());
    return `/app/logs?${p.toString()}`;
  };

  const getPaginationRange = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayLogs.length && displayLogs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayLogs.map((item) => item.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const exportParams = new URLSearchParams(params);
  if (selectedIds.length > 0) {
    exportParams.set("ids", selectedIds.join(","));
  }
  const exportUrl = `/api/logs/export?${exportParams.toString()}`;
  const exportFilename = selectedIds.length > 0
    ? `audit-logs-selected-${selectedIds.length}.csv`
    : `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

  return (
    <AppShell>
      <div className="audit-page">
        {/* Header */}
        <div className="audit-header">
          <div className="audit-title-group">
            <h1>Audit Logs</h1>
            <p>
              Track all actions performed in the app, including coupon creation, campaign updates and more.
            </p>
          </div>

          <ExportButton url={exportUrl} filename={exportFilename}>
            {selectedIds.length > 0 ? `Export Selected (${selectedIds.length})` : "Export CSV"}
          </ExportButton>
        </div>

        {/* Search Row: Search input on left (Max width 480px), Single Filters Button on right */}
        <Form method="get" className="audit-search-row">
          {/* Search Input */}
          <div className="audit-search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              name="q"
              className="audit-search-input"
              placeholder="Search by coupon code, campaign name or product..."
              defaultValue={filters.q}
            />
          </div>

          {/* Single Filters Button & Popover */}
          <div style={{ position: "relative" }} ref={filterRef}>
            <button
              type="button"
              className={`btn-audit-filters ${filterOpen ? "active" : ""}`}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span style={{
                  backgroundColor: "#10b981",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "999px"
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Expandable Filter Popover Box (Kept mounted in DOM for form submission) */}
            <div
              className="audit-filter-popover"
              style={{ display: filterOpen ? "flex" : "none" }}
            >
              <h3 className="audit-filter-title">
                <span>Filter Audit Logs</span>
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                  onClick={() => setFilterOpen(false)}
                >
                  <X size={16} />
                </button>
              </h3>

              {/* Action Filter */}
              <div className="audit-filter-group">
                <label htmlFor="action-select">Action</label>
                <select
                  id="action-select"
                  name="action"
                  defaultValue={filters.action}
                >
                  {ACTIONS.map((act) => (
                    <option key={act} value={act === "All Actions" ? "ALL" : act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Filter */}
              <div className="audit-filter-group">
                <label htmlFor="user-select">User</label>
                <select
                  id="user-select"
                  name="user"
                  defaultValue={filters.user}
                >
                  {USERS.map((usr) => (
                    <option key={usr} value={usr === "All Users" ? "ALL" : usr}>
                      {usr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="audit-filter-group">
                <label htmlFor="status-select">Status</label>
                <select
                  id="status-select"
                  name="status"
                  defaultValue={filters.status}
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st === "All Statuses" ? "ALL" : st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filters inside Popover */}
              <div className="audit-date-row">
                <div className="audit-filter-group">
                  <label htmlFor="pop-from">From</label>
                  <input id="pop-from" type="date" name="from" defaultValue={filters.from} />
                </div>
                <div className="audit-filter-group">
                  <label htmlFor="pop-to">To</label>
                  <input id="pop-to" type="date" name="to" defaultValue={filters.to} />
                </div>
              </div>

              <div className="audit-filter-actions">
                <Link to="/app/logs" className="btn-audit-reset" onClick={() => setFilterOpen(false)}>
                  Clear All
                </Link>
                <button type="submit" className="btn-audit-apply" onClick={() => setFilterOpen(false)}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </Form>

        {/* Audit Log Table Card */}
        <div className="audit-table-card">
          <div className="audit-table-container">
            <table className="audit-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }} className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={displayLogs.length > 0 && selectedIds.length === displayLogs.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Timestamp &darr;</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "#6b7280", padding: "32px" }}>
                      No audit log entries found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  displayLogs.map((log) => (
                    <tr key={log.id} className={selectedIds.includes(log.id) ? "row-selected" : ""}>
                      <td className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(log.id)}
                          onChange={() => toggleSelect(log.id)}
                        />
                      </td>
                      {/* Timestamp */}
                      <td>
                        <div className="time-col">
                          <span className="time-main">{log.timestamp}</span>
                          <span className="time-sub">{log.relativeTime}</span>
                        </div>
                      </td>

                      {/* User */}
                      <td>
                        <div className="user-col">
                          <div className="user-avatar">{log.userInitials}</div>
                          <div className="user-info">
                            <span className="user-name">{log.userName}</span>
                            <span className="user-email">{log.userEmail}</span>
                          </div>
                        </div>
                      </td>

                      {/* Action (Colored Pill only, NO icon inside) */}
                      <td>
                        <span className={`action-pill ${getActionPillClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Details */}
                      <td>
                        <div className="details-col">
                          <span className="details-title">{log.detailsTitle}</span>
                          <span className="details-sub">{log.detailsSub}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <div className="status-col">
                          <span className={`status-pill ${log.status.toLowerCase()}`}>
                            {log.status}
                          </span>
                          {log.statusError && (
                            <span className="status-error-sub">{log.statusError}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Pagination */}
          <div className="table-footer">
            <span className="footer-info">
              Showing {startItem}&ndash;{endItem} of {effectiveTotalCount} logs
            </span>

            <div className="pagination-group">
              {currentPage > 1 ? (
                <Link to={buildPageUrl(currentPage - 1)} className="page-btn">
                  &lt;
                </Link>
              ) : (
                <button type="button" className="page-btn disabled" disabled>
                  &lt;
                </button>
              )}

              {getPaginationRange(currentPage, totalPages).map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="page-btn disabled">
                    ...
                  </span>
                ) : (
                  <Link
                    key={item}
                    to={buildPageUrl(item)}
                    className={`page-btn ${item === currentPage ? "active" : ""}`}
                  >
                    {item}
                  </Link>
                )
              )}

              {currentPage < totalPages ? (
                <Link to={buildPageUrl(currentPage + 1)} className="page-btn">
                  &gt;
                </Link>
              ) : (
                <button type="button" className="page-btn disabled" disabled>
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
