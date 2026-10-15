# Feature 2: Campaign creation and CSV import

Status: implemented. (Bulk-generating campaigns was dropped; campaigns have only Normal and Import.)

Campaign creation at `/app/campaigns/new` has two tabs: **Normal** (existing form) and **Import CSV** (`?tab=import`).

## CSV import
Columns: `name, description, startsAt, endsAt` (header required, `name` and `startsAt` required).
- Row mapping reuses `parseCampaignInput`; per-row errors with row numbers.
- Duplicate names within the file or an existing campaign name are errors (names link discounts via the discount CSV `campaign` column).
- "Validate only" dry run or "Import"; valid rows import even if others fail. Max 200 rows, 1 MB. Created as DRAFT, no discounts.
- Audit: `CAMPAIGN_CREATED` per campaign, summary `CAMPAIGNS_IMPORTED`.

Code: `app/services/campaign-bulk.server.ts` (import + export), `app/routes/app.campaigns.new.jsx`.
