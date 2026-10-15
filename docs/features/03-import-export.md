# Feature 3: Import / export of discount codes, campaigns and logs

Status: implementing

## Matrix

| Entity | Export | Import |
|---|---|---|
| Discounts | `GET /api/discounts/export` (CSV) | Feature 1 (CSV import, create-only) |
| Campaigns | `GET /api/campaigns/export` (CSV) | Feature 2 (CSV import tab on Create Campaign, create-only) |
| Logs | `GET /api/logs/export` (CSV, existing) | **Not supported** |

Why logs are export-only: audit logs are an integrity record of what happened in the shop. Allowing upload would let
anyone with app access forge history. Retention (90 days / 1 year) is handled by the existing purge, so export is the
archival path.

## Export behaviour
- Scoped to the authenticated shop. Streamed in batches of 500 (same pattern as `exportLogsCsv`).
- Discounts and campaigns honour the list page filters (query string is passed through): discounts `q,status,type`
  and campaigns `q,status`. Logs keep their filters.
- Export columns round-trip: discount export = import columns + `id,status,shopifyDiscountId`;
  campaign export = import columns + `id,status`. Import ignores the extra columns.
- Every export writes an audit event (`DISCOUNTS_EXPORTED`, `CAMPAIGNS_EXPORTED`, existing `LOGS_EXPORTED`).
- All cells pass through the formula-injection guard (`'` prefix for `= + - @ TAB CR`). Import strips that prefix
  from cells that start with `'` followed by one of those characters, so round trips are lossless.
  Numeric fields are written raw (no guard) so negative values are not mangled; they are validated on import.
- Templates: `?template=1` returns just the header plus one example row.

## UI
Export CSV buttons on the Discounts, Campaigns and Audit Logs pages. Import lives in the Import CSV tab of Create Coupon / Create Campaign. Logs have no import.

## Shared infrastructure
`csv.server.ts` exports `parseCsv(text)`, `toCsvRow(values)`, `csvResponse(stream, filename)`, `streamCsv(columns, fetchBatch)`.
