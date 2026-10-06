# MRP Discounter — Product Requirements Document

| | |
|---|---|
| Status | Draft v0.1 |
| Date | 2026-10-06 |
| Owner | Hariom Vashista |
| Platform | Shopify embedded app (React Router, Polaris, Prisma) |

## 1. Problem

Indian merchants print an MRP (Maximum Retail Price) on products and advertise offers such as "20% off MRP". Shopify's native discounts calculate against the *selling price*, not the MRP. When the selling price is already below MRP, a native "20% off" gives a smaller discount than the merchant advertised, and merchants have no way to say "bring the final price to MRP − 20%".

Merchants need discounts and coupon codes whose value is calculated from the MRP, grouped into campaigns they can schedule and monitor, with a trail of who changed what.

## 2. Goals and non-goals

**Goals**
1. Let merchants create discounts (automatic or coupon code) calculated on MRP.
2. Let merchants group discounts into time-boxed campaigns and manage them as a unit.
3. Record an audit log of every change and every discount-engine decision, so merchants can explain "why did this customer get this price".

**Non-goals (v1)**
- Editing product prices or MRP values (the app only reads MRP).
- Loyalty, referral or customer-segment programs.
- Discount stacking logic beyond Shopify's native combination settings.
- Multi-currency price rounding rules beyond the shop's presentment currency.

## 3. Users

| Persona | Needs |
|---|---|
| Merchant / marketer | Create and schedule offers quickly, without code. |
| Store operations / finance | Confirm discounts never push price below a floor; trace changes. |
| Support agent | Look up why an order got a specific price. |

## 4. Key concepts

- **MRP**: the variant's `compare_at_price`. This is the single source of truth. Variants with no MRP are *ineligible* (see §6).
- **Discount**: one rule: a type, a value, a target, and a method (automatic or code).
- **Campaign**: a named, scheduled container of one or more discounts with shared dates and status.
- **Audit log**: append-only record of actions and engine events.

## 5. Features

### 5.1 Create discounts (P0)

A merchant creates a discount with:

| Field | Details |
|---|---|
| Title | Required, shown in admin and on the order. |
| Method | Automatic, or discount code (merchant-chosen or generated). |
| Calculation | `% off MRP` or `₹ off MRP`. |
| Value | Positive number. Percentage ≤ 100; fixed amount < MRP. |
| Applies to | All products, selected products/variants, or selected collections. |
| Price floor (optional) | Never price below this amount, or below a % of MRP. |
| Eligibility (optional) | Minimum quantity, minimum subtotal. |
| Dates | Start required, end optional. |
| Combinations | Pass-through of Shopify's combine-with product/order/shipping toggles. |

**Calculation semantics** (worked example: MRP 1000, selling price 900):
- *20% off MRP*: target price = 1000 − 200 = **800**. Discount applied to the line = 900 − 800 = **100**.
- *5% off MRP*: target price = 950, which is above the selling price of 900. The discount is **not applied** and the engine logs `SKIPPED_NO_BENEFIT`. Discounts never raise a price.
- *₹250 off MRP*: target price = 750; discount on the line = 150.

**Acceptance criteria**
- A cart line for the 20% example shows a final price of 800 at checkout.
- A fixed value ≥ MRP is rejected at creation with a validation message.
- Code discounts can be applied by customers at checkout; automatic discounts apply without input.
- Editing, pausing, resuming and deleting a discount are supported and reflected in Shopify.

### 5.2 Discount campaigns (P0)

A campaign groups discounts under shared scheduling and status.

- Create campaign: name, description, start/end, one or more discounts (new or existing).
- Status lifecycle: `DRAFT → SCHEDULED → ACTIVE → ENDED`, plus `PAUSED`, `CANCELLED` and `NEEDS_ATTENTION`.
- Actions apply to the whole campaign: activate, pause, resume, end, duplicate.
- Campaign dates override member discount dates; changing them updates all members.
- Campaign list with status filter, search, and per-campaign summary (discount count, dates, orders influenced, total discount given).
- Duplicate a campaign for repeat offers (e.g. each festive season).

**Acceptance criteria**
- Pausing a campaign deactivates all member discounts in Shopify within 1 minute and the UI reflects it.
- A scheduled campaign activates at its start time without merchant action.
- Partial failures (some Shopify calls fail) leave the campaign in `NEEDS_ATTENTION` with per-discount errors, and are retryable.

### 5.3 Logging and audit (P0)

Two kinds of records, both queryable in-app:

1. **Audit trail** (who/what/when): every create, update, pause, resume, delete of a discount or campaign, with the acting staff user and before/after values.
2. **Engine and integration logs**: Shopify API calls (success and user errors), webhook receipts, and discount calculation decisions (applied, skipped, capped by floor).

Requirements
- Log viewer: filter by level (DEBUG/INFO/WARN/ERROR), module, action, date range, and entity (discount or campaign); free-text search; pagination; expandable metadata JSON.
- Export to CSV.
- Entries are immutable from the UI.
- Retention: 90 days for DEBUG/INFO, 1 year for audit-trail entries. A daily job purges expired rows.
- No secrets or customer PII in logs (design doc §9).
- On `app/uninstalled`, data is retained for 30 days then deleted; on the GDPR `shop/redact` webhook, deleted immediately.

### 5.4 Preview and validation (P1)

- Price simulator: pick a product/variant, see MRP, selling price, discount result, and floor effects before saving.
- Health check: list variants in scope with no MRP or MRP ≤ selling price, so the merchant knows where a discount will do nothing.

### 5.5 Reporting (P1)

Per discount and campaign: orders, units, total discount amount, revenue, average discount % off MRP. Date range filter, CSV export.

### 5.6 Candidates for v2

Customer-segment targeting, A/B testing discount values, tiered volume discounts off MRP, emailed scheduled reports, in-app roles and permissions.

## 6. Rules and edge cases

1. **Currency**: calculations in presentment currency; round to 2 decimals, half-up, once per line.
2. **Missing MRP**: variant skipped, logged at INFO, counted in the health check.
3. **MRP at or below selling price**: skipped, logged `SKIPPED_NO_BENEFIT`.
4. **Quantity**: discount computed per unit, multiplied by quantity.
5. **Multiple eligible discounts**: Shopify's combination rules decide; otherwise the largest customer benefit wins.
6. **Variants added after creation**: product/collection scope is evaluated at checkout, so new variants are picked up automatically.
7. **Code collisions**: uniqueness is validated against existing Shopify codes before creation.

## 7. Success metrics

- Time to create a first discount: under 2 minutes.
- Price mismatches versus expected: 0 in the QA matrix, < 0.1% in production.
- A merchant can answer "why this price" from the log in under 1 minute.
- No Function timeouts or limit errors at checkout.

## 8. Permissions (Shopify scopes)

`read_products` (MRP), `read_discounts`, `write_discounts`. `write_products` is currently requested in `shopify.app.toml` but is not needed for these goals and should be dropped before App Store submission. Add `read_orders` for reporting (P1).

## 9. Risks

| Risk | Mitigation |
|---|---|
| Native discounts cannot compute on MRP | Use a Shopify Function (design doc §4). |
| Merchants don't maintain `compare_at_price` | Health check, clear skip logging. |
| Log volume growth | Retention and purge job, indexes, sampling for DEBUG. |
| Discount below cost | Price floor, confirmation on aggressive values. |

## 10. Milestones

| Milestone | Scope |
|---|---|
| M1 | MRP discount Function, create/edit/pause discounts, audit trail. |
| M2 | Campaigns with scheduling, log viewer with filters and export. |
| M3 | Simulator, health check, reporting, retention jobs, App Store readiness. |

## 11. Open questions

1. Should the MRP source be configurable (e.g. a metafield) instead of only `compare_at_price`?
2. When the MRP-derived target is above the selling price, skip (draft) or apply nothing and warn?
3. Is multi-currency (Markets) in scope for v1?
4. Do we need per-staff permissions for who can create campaigns?
