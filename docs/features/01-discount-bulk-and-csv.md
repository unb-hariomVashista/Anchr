# Feature 1: Bulk-generate and CSV-import discount codes

Status: implementing

## Goal
Today a merchant creates one discount at a time (`/app/discounts/new`). Add two more ways to create
discounts, so three creation modes exist:

| Mode | Where | Output |
|---|---|---|
| Normal (existing) | `/app/discounts/new` (tab "Normal") | 1 discount |
| Bulk generate | `/app/discounts/new?tab=bulk` (tab "Bulk generate") | up to 100 CODE discounts sharing one configuration |
| CSV import | `/app/discounts/new?tab=import` (tab "Import CSV") | up to 200 rows, each with its own configuration |

## Non-goals
Editing existing discounts via CSV (import is create-only), and unlimited batch sizes (Shopify rate
limits and request timeouts; see Limits).

## Bulk generate
Inputs: title, code prefix (optional, `[A-Z0-9_-]`, max 12), quantity (1-100), random part length
(4-12, default 8), plus every shared setting of the manual form (value type/value, floor, target, min qty/subtotal,
usage limit, once-per-customer, combines-with, dates, optional campaign).

- Codes are `PREFIX-XXXXXXXX`, drawn from an unambiguous alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`)
  using `crypto.randomInt`. Generation retries on collision with existing codes in the shop and within the batch.
- Each discount title is `"<title> #<n>"`.
- Always method CODE. Same validation as manual (`parseDiscountInput`) is applied once to the shared config.
- "Create as draft" checkbox: rows are saved but not pushed to Shopify (they can be published later, or by
  attaching them to a campaign). Default off: each row is pushed via the existing `createDiscount`.
- If a campaign is chosen the rows attach to it, and follow campaign activation (existing behaviour).

## CSV import
Columns (header row required, order free, unknown columns ignored):

`title, method, code, valueType, value, targetType, targetIds, floorType, floorValue, minQuantity,
minSubtotal, usageLimit, oncePerCustomer, combineProduct, combineOrder, combineShipping, startsAt, endsAt, campaign`

- `targetIds`: Shopify GIDs separated by `;`. `campaign`: exact name of an existing campaign (optional).
- Booleans: `true/false/yes/no/1/0`. Dates: ISO `YYYY-MM-DD` or full ISO (UTC).
- Each row is mapped to the same raw shape `parseDiscountInput` takes, so validation is identical to the form.
- Extra checks: duplicate codes inside the file, codes already in the shop, unknown campaign.
- A template file is downloadable (`/api/discounts/export?template=1`). The export CSV is a valid import file.
- Flow: choose file -> "Validate only" (dry run, per-row results) or "Import". Valid rows are imported; invalid
  rows are reported with row number and reason; nothing is rolled back for rows that succeed.

## Limits and failure handling
- Max 100 generated / 200 imported rows per request, max file 1 MB. Rows are processed sequentially;
  Shopify failures are recorded on the row (status `ERROR`, `lastSyncError`) exactly as today, and surfaced in the result list.
- Audit: each created discount logs `DISCOUNT_CREATED` (existing); the batch logs one summary event
  `DISCOUNTS_BULK_GENERATED` / `DISCOUNTS_IMPORTED` with counts.

## Code layout
- `app/services/csv.server.ts` - RFC 4180 parser/serializer, formula-injection guard (shared by all features).
- `app/services/discount-bulk.server.ts` - `generateCodes`, `generateDiscounts`, `importDiscountsCsv`.
- `app/routes/app.discounts.new.jsx` hosts the three tabs; action handles `intent=generate|validate|import`, else normal create.
- `app/components/DiscountBulkForms.jsx` - bulk and import tab forms. Single entry point: the "Create Coupon" button. Tabs are hidden when creating inside a campaign.

## Test plan
Unit: code generator (alphabet, uniqueness, prefix), CSV parser (quotes, embedded newlines, BOM), row mapping.
Manual: generate 5 codes as draft; import a file with one bad row and one duplicate; dry run changes nothing.
