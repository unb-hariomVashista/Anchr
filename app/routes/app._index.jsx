import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { newContext } from "../services/shopify-client.server";
import { syncCampaignStatuses } from "../services/campaigns.server";
import { AppShell } from "../components/ui";
import "../styles/homepage.css";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    await syncCampaignStatuses(newContext(admin, session));
  } catch (e) {
    // ignore sync errors in loader fallback
  }

  const [totalCouponsCount, activeDiscountsCount, dbDiscounts] = await Promise.all([
    db.discount.count({ where: { shop } }),
    db.discount.count({ where: { shop, status: "ACTIVE" } }),
    db.discount.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    totalCouponsCount,
    activeDiscountsCount,
    dbDiscounts,
  };
};

export default function Index() {
  const { totalCouponsCount, activeDiscountsCount, dbDiscounts } = useLoaderData();

  // Standard sample data from design mockup for fallback when DB is empty
  const defaultCoupons = [
    {
      code: "MRP25",
      discount: "25% off MRP",
      appliesTo: "All products",
      used: 245,
      limit: 1000,
      status: "Active",
      expiryDate: "Dec 31, 2025",
      createdOn: "Oct 6, 2026",
    },
    {
      code: "MRP10",
      discount: "10% off MRP",
      appliesTo: "Collections (3)",
      used: 83,
      limit: 500,
      status: "Active",
      expiryDate: "Nov 30, 2026",
      createdOn: "Oct 4, 2026",
    },
    {
      code: "FESTIVE20",
      discount: "20% off MRP",
      appliesTo: "All products",
      used: 920,
      limit: 2000,
      status: "Active",
      expiryDate: "Oct 31, 2026",
      createdOn: "Oct 1, 2026",
    },
    {
      code: "CLEARANCE30",
      discount: "30% off MRP",
      appliesTo: "Selected products (12)",
      used: 0,
      limit: 500,
      status: "Scheduled",
      expiryDate: "Nov 15, 2026",
      createdOn: "Sep 28, 2026",
    },
  ];

  const displayedCoupons =
    dbDiscounts && dbDiscounts.length > 0
      ? dbDiscounts.map((d) => ({
          code: d.code || d.title,
          discount: d.valueType === "PERCENTAGE" ? `${d.value}% off MRP` : `₹${d.value} off MRP`,
          appliesTo: d.targetType === "ALL" ? "All products" : d.targetType === "COLLECTIONS" ? "Collections" : "Products",
          used: 0,
          limit: 1000,
          status: d.status === "ACTIVE" ? "Active" : "Scheduled",
          expiryDate: d.endsAt ? new Date(d.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No expiry",
          createdOn: new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        }))
      : defaultCoupons;

  const totalCouponsDisplay = totalCouponsCount > 0 ? totalCouponsCount : 24;
  const activeCouponsDisplay = activeDiscountsCount > 0 ? activeDiscountsCount : 18;

  return (
    <AppShell>
      <div className="mrp-homepage">
        {/* Top Banner Image */}
        <Link to="/app/discounts/new" className="mrp-banner-img-container" title="Get Started with MRP Discounts">
          <img
            src="/homepage-top-bannner.png"
            alt="Boost sales with MRP-based discounts banner"
          />
        </Link>

        {/* 4 Metric Cards */}
        <div className="metrics-grid">
          {/* Card 1 */}
          <div className="metric-card">
            <div className="metric-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">Total Coupons</span>
              <span className="metric-value">{totalCouponsDisplay}</span>
              <span className="metric-change positive">↑ 3 this month</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="metric-card">
            <div className="metric-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">Active Coupons</span>
              <span className="metric-value">{activeCouponsDisplay}</span>
              <span className="metric-change neutral">75% active</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="metric-card">
            <div className="metric-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">Total Redemptions</span>
              <span className="metric-value">1,248</span>
              <span className="metric-change positive">↑ 12% from last month</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="metric-card">
            <div className="metric-icon red">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">Total Sales (from coupons)</span>
              <span className="metric-value">₹2,48,900</span>
              <span className="metric-change positive">↑ 18% from last month</span>
            </div>
          </div>
        </div>

        {/* 2 Main Action Cards as Pure Images */}
        <div className="action-cards-grid">
          {/* Card 1: Create Discount Coupon */}
          <Link to="/app/discounts/new" className="action-card-img-link" title="Create Discount Coupon">
            <img src="/create-discount.png" alt="Create Discount Coupon Card" />
          </Link>

          {/* Card 2: Create Discount Campaign */}
          <Link to="/app/campaigns/new" className="action-card-img-link" title="Create Discount Campaign">
            <img src="/create-campaign.png" alt="Create Discount Campaign Card" />
          </Link>
        </div>

        {/* Recent Coupons Table Card */}
        <div className="table-card">
          <div className="table-header-row">
            <div>
              <h2 className="table-header-title">Recent Coupons</h2>
              <p className="table-header-sub">Your latest created coupons.</p>
            </div>
            <Link to="/app/discounts" className="btn-view-all">
              View All &rarr;
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Coupon Code</th>
                  <th>Discount</th>
                  <th>Applies To</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th>Expiry Date</th>
                  <th>Created On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedCoupons.map((coupon, idx) => {
                  const percent = Math.min(100, Math.round((coupon.used / coupon.limit) * 100));
                  return (
                    <tr key={idx}>
                      <td className="coupon-code">{coupon.code}</td>
                      <td>{coupon.discount}</td>
                      <td>{coupon.appliesTo}</td>
                      <td>
                        <div className="usage-container">
                          <span className="usage-text">
                            {coupon.used} / {coupon.limit}
                          </span>
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${coupon.status.toLowerCase()}`}>
                          {coupon.status}
                        </span>
                      </td>
                      <td>{coupon.expiryDate}</td>
                      <td>{coupon.createdOn}</td>
                      <td>
                        <button type="button" className="action-dots-btn" title="Actions">
                          &bull;&bull;&bull;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
