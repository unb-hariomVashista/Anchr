# MRP Discounter — Design Document

Companion to [PRD.md](./PRD.md). Status: Draft v0.1, 2026-10-06.

## 1. Current state (from the repo)

- Embedded app on React Router 7 + Polaris + Prisma (SQLite in dev).
- `app/mrp-engine.server.ts` has `calculateMRPDiscount` (pure math on `compare_at_price`) and `createShopifyAutomaticDiscount`, which calls `discountAutomaticBasicCreate`.
- `app/logger.server.ts` writes structured logs to console and the `AuditLog` table.
- Prisma models: `Session`, `MrpDiscountRule`, `AuditLog`.
- `app/routes/app._index.jsx` is a single page that lists rules and logs and creates a rule.
- `extensions/` is empty.

**Key gap:** `discountAutomaticBasicCreate` with `percentage` or `discountAmount` discounts the *selling price*. It does not use MRP, so the core feature is not yet delivered. `calculateMRPDiscount` is only used for preview-style math. The fix is a Shopify Function (§4).

Smaller gaps: no Function extension, no campaign model, no code (coupon) discounts, no actor on audit entries, no indexes on `AuditLog`, `write_products` scope unused, `SQLite` not suitable for production, `app/routes/app.additional.jsx` is template leftover, and `app.application_url` is still `https://example.com`.

## 2. Architecture

```
Merchant (Admin UI, Polaris)
        │  App Bridge
        ▼
React Router routes ──► Service layer ──► Shopify Admin GraphQL
 (loaders/actions)       (discounts,        (discountAutomaticAppCreate,
        │                 campaigns,         discountCodeAppCreate,
        │                 audit)             metafields, products)
        ▼                    │
   Prisma / DB ◄─────────────┘
        ▲
        │ webhooks (uninstalled, scopes_update, discounts/*, shop/redact)
        │
Checkout ──► MRP Discount Function (Wasm) ──► reads compare_at price + config metafield
```

Two runtime paths:
- **Control plane** (this app): create/manage discounts and campaigns, store config, log everything.
- **Data plane** (Shopify Function): runs inside checkout, calculates the discount from MRP. It cannot call the network or our DB; all inputs come from its GraphQL input query and the discount's metafield.

## 3. Data model (Prisma)

Replaces `MrpDiscountRule` with a richer model. Types shown as Prisma; use enums once on Postgres.

```prisma
model Campaign {
  id          String    @id @default(uuid())
  shop        String
  name        String
  description String?
  status      String    @default("DRAFT") // DRAFT|SCHEDULED|ACTIVE|PAUSED|ENDED|CANCELLED|NEEDS_ATTENTION
  startsAt    DateTime
  endsAt      DateTime?
  createdBy   String?   // staff user id
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  discounts   Discount[]

  @@index([shop, status])
  @@index([shop, startsAt])
}

model Discount {
  id                String    @id @default(uuid())
  shop              String
  campaignId        String?
  campaign          Campaign? @relation(fields: [campaignId], references: [id])
  title             String
  method            String    // AUTOMATIC | CODE
  code              String?
  valueType         String    // PERCENTAGE | FIXED_AMOUNT
  value             Float     // prefer Decimal on Postgres
  targetType        String    @default("ALL") // ALL | PRODUCTS | COLLECTIONS
  targetIds         String?   // JSON array of GIDs (Json type on Postgres)
  floorType         String?   // AMOUNT | PERCENT_OF_MRP
  floorValue        Float?
  minQuantity       Int?
  minSubtotal       Float?
  combinesWith      String?   // JSON {product, order, shipping}
  shopifyDiscountId String?   // gid://shopify/DiscountAutomaticNode|DiscountCodeNode
  status            String    @default("DRAFT") // DRAFT|ACTIVE|PAUSED|ENDED|ERROR
  lastSyncError     String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([shop, status])
  @@index([campaignId])
  @@unique([shop, code])
}

model AuditLog {                  // extended
  id         String   @id @default(uuid())
  shop       String
  timestamp  DateTime @default(now())
  level      String
  module     String
  action     String
  message    String
  metadata   String?
  actorId    String?  // staff user, null for system
  entityType String?  // DISCOUNT | CAMPAIGN | SYSTEM
  entityId   String?
  requestId  String?  // correlates one user action across entries
  before     String?  // JSON snapshot, audit trail entries only
  after      String?

  @@index([shop, timestamp])
  @@index([shop, entityType, entityId])
  @@index([shop, level, timestamp])
}
```

Notes
- DB is the source of truth for *intent*; Shopify is the source of truth for *what is live*. A reconcile job compares them (§7).
- Production DB: Postgres. SQLite is dev only.
- `AuditLog` is append-only; no update or delete code paths except the retention purge.

## 4. MRP calculation: Shopify Function

Create `extensions/mrp-discount` using the Discount Function API (product discount class). It reads the config from a metafield on the discount node.

**Input query (sketch)**
```graphql
query RunInput {
  discount { metafield(namespace: "$app:mrp", key: "config") { jsonValue } }
  cart {
    lines {
      id
      quantity
      cost {
        amountPerQuantity { amount }
        compareAtAmountPerQuantity { amount }   # MRP
      }
      merchandise { ... on ProductVariant { id product { id inAnyCollection(id: "...") } } }
    }
  }
}
```

**Logic per cart line**
1. Skip if no `compareAtAmountPerQuantity` or line not in scope.
2. `target = MRP − (valueType == PERCENTAGE ? MRP × value/100 : value)`, clamped at `max(0, floor)`.
3. `price = amountPerQuantity`. If `target ≥ price`, skip (no benefit).
4. Emit a per-line candidate with `fixedAmount { amount: price − target, appliesToEachItem: true }`.
5. Return candidates with the "maximum" selection strategy per product so one line gets one discount.

This reuses the same rules as `calculateMRPDiscount`; extract that math to a shared package (`shared/mrp-math.ts`) imported by both the app (simulator, tests) and the Function so the two cannot drift. Unit-test it against the PRD examples.

**Config metafield JSON** (written by the app at create/update): `{ valueType, value, floor, targetType, targetIds, minQuantity, minSubtotal }`.

**Limits to watch**: Function instruction and size limits, and no network, no logging to our DB. Function stderr is only visible in Shopify's Function run logs, so the app also records *config and lifecycle* events, and the Function-run log link is surfaced from the Partner/Admin tooling for debugging.

## 5. Shopify API integration

| Need | API |
|---|---|
| Automatic MRP discount | `discountAutomaticAppCreate` with `functionHandle`, `metafields`, dates, `combinesWith` |
| Coupon code MRP discount | `discountCodeAppCreate` with `code` |
| Update / pause / resume | `discountAutomaticAppUpdate`, `discountCodeAppUpdate`, `discountAutomaticDeactivate` / `Activate` (and code equivalents) |
| Delete | `discountAutomaticDelete`, `discountCodeDelete` |
| Product / collection pickers | App Bridge resource picker |
| Variant MRP for simulator, health check | Admin GraphQL `productVariants { price compareAtPrice }`, paginated, bulk operation for large catalogs |

All calls go through one `shopifyClient` wrapper that: attaches a `requestId`, logs start/success/userErrors/exception, retries on 429/5xx with backoff, and maps `userErrors` to typed domain errors. Use the API version already pinned in `shopify.app.toml` (`2027-01`).

## 6. Service layer and routes

Move logic out of `app._index.jsx` into server modules:

```
app/services/discounts.server.ts   create, update, pause, resume, delete, sync
app/services/campaigns.server.ts   create, activate, pause, end, duplicate
app/services/audit.server.ts       record(), query(), export(), purge()
app/services/shopify-client.server.ts
app/lib/mrp-math.ts                shared with the Function
```

Routes
| Route | Purpose |
|---|---|
| `app._index` | Dashboard: active campaigns, recent errors, quick stats |
| `app.discounts` / `app.discounts.new` / `app.discounts.$id` | List, create, edit |
| `app.campaigns` / `app.campaigns.new` / `app.campaigns.$id` | List, create, detail with member discounts |
| `app.logs` | Log viewer with filters, search, export |
| `app.simulator` | Price simulator and health check (P1) |
| `app.reports` | Reporting (P1) |
| `api.logs.export` | CSV stream |

Remove `app.additional.jsx`. Validation: use a schema library (e.g. zod) in actions; same schema drives form errors.

## 7. Campaign lifecycle and consistency

```
DRAFT ──activate──► SCHEDULED ──(startsAt)──► ACTIVE ──(endsAt)──► ENDED
                        │                       │  ▲
                        └──cancel──► CANCELLED  └pause/resume
any state with failed Shopify calls ──► NEEDS_ATTENTION
```

- A campaign operation fans out to member discounts. Each Shopify call is recorded; success/failure is stored per `Discount` (`status`, `lastSyncError`).
- Operations are idempotent (keyed by `shopifyDiscountId` and target status), so retrying `NEEDS_ATTENTION` is safe.
- **Scheduling**: set Shopify `startsAt`/`endsAt` on each discount so Shopify itself activates and ends them. The app does not need to be up at the start time. A scheduled job only updates *our* status field and runs the reconcile.
- **Reconcile job** (every 15 min per shop, plus on `discounts/update` webhooks if subscribed): fetch discount nodes by id, compare status and dates with the DB, log `DRIFT_DETECTED`, and fix or flag. This catches merchants editing the discount directly in Shopify admin.
- Jobs: start with a simple in-process scheduler or the host platform's cron; move to a queue (e.g. BullMQ/Redis) if volume needs it.

## 8. Logging and audit design

Two entry classes in one table, distinguished by `entityType`/`before`/`after`:

- **Audit entries** (`level=INFO`, `module=AdminUI` or `Engine`): written by services in the same DB transaction as the state change where possible, with `actorId` from `session.onlineAccess` user id (requires online token for staff identity; fall back to `system`).
- **Integration/engine entries**: from `shopifyClient` and webhook handlers.

`logEvent` changes
- Add `actorId`, `entityType`, `entityId`, `requestId`, `before`, `after`.
- Add a `redact()` step that removes access tokens, customer email/phone/address, and discount codes of customers' orders from metadata.
- Console logging stays as structured JSON for the host's log aggregator; DB write failure must never fail the user action (already the case) but is counted.
- DEBUG is only persisted when `LOG_LEVEL=debug`, to bound volume.
- Keep `module` as a closed set; add `Campaign`, `Scheduler`, `Reconcile`.

Viewer: server-side pagination (cursor on `timestamp,id`), filters map to the three indexes above, CSV export streams rows rather than loading all into memory.

Retention: daily purge job deletes DEBUG/INFO older than 90 days and audit entries older than 1 year, and writes one summary entry (`LOG_PURGE`).

## 9. Security and compliance

- Auth via `authenticate.admin` on every loader/action; every query is scoped by `shop`. Add tests that a shop cannot read another's rows.
- Webhooks verified by the Shopify library; add `shop/redact`, `customers/data_request`, `customers/redact` handlers (mandatory for the App Store) — the app stores no customer data, so these log and acknowledge.
- Least scopes: drop `write_products`; add `read_orders` only with reporting.
- No secrets or PII in logs (redaction + code review rule).
- Rate limiting and input validation on all actions; reject discount values that would give a ≤ 0 price unless explicitly allowed.

## 10. Testing

- **Unit**: `mrp-math` against a table of cases (PRD examples, rounding, missing MRP, MRP ≤ price, floor, qty > 1).
- **Function**: `shopify app function run` with fixtures; also the Function's test harness for each target type.
- **Service**: Shopify client mocked; verify audit entries and state transitions, including partial failures.
- **E2E on a dev store**: create each discount type, check cart and checkout prices, pause/resume, scheduled start.
- **Load**: log viewer with 1M rows; Function with a 100-line cart.

## 11. Deployment and operations

- Replace SQLite with Postgres; run `prisma migrate deploy` at startup (existing `docker-start`).
- Set real `application_url` and redirect URLs (still `https://example.com`).
- Environment: separate Shopify app configs for dev and prod (`shopify.app.mrp-discounter.toml` already exists as a second config).
- Observability: ship console JSON logs to the host aggregator; alert on ERROR rate and on `NEEDS_ATTENTION` campaigns.

## 12. Rollout plan

1. **M1**: extract `mrp-math`, build the Function, switch create to `discountAutomaticAppCreate`, migrate `MrpDiscountRule` → `Discount`, extend `AuditLog`. Existing rules created via the old native path are listed with a "Legacy: not MRP-based" badge and a one-click recreate.
2. **M2**: campaigns, scheduling, reconcile, log viewer, export.
3. **M3**: code discounts (if not in M1), simulator, health check, reporting, retention, compliance webhooks, App Store review.

## 13. Open technical questions

1. Function API target: confirm the current product-discount target and its `compareAtAmountPerQuantity` field availability in the pinned API version before building.
2. Online vs offline tokens: staff attribution needs online sessions; decide whether to use them for admin actions only.
3. Host and DB provider, and whether a queue is justified at launch.
4. Whether to subscribe to discount webhooks for faster drift detection versus polling only.
