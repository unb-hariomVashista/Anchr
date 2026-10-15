# Anchr - MRP Discount Generator

A Shopify app built with React Router and Shopify Functions that applies automatic and code-based discounts calculated against the **MRP (Compare-at Price)** of products instead of their selling price.

---

## 🌟 Key Features

- **True MRP Discounting**: Shopify natively discounts off the current selling price. Anchr discounts directly off the variant's `compareAtPrice` (MRP).
- **Flexible Value Types**:
  - **Percentage Off MRP** (e.g. 20% off MRP)
  - **Fixed Amount Off MRP** (e.g. ₹500 off MRP)
- **Margin Protection (Price Floors)**: Set a floor price (minimum amount or % of MRP) to guarantee items are never sold below your required margins.
- **Product & Collection Targeting**:
  - All catalog products
  - Specific collections
  - Selected products
- **Campaign Management**: Group multiple discounts into time-bounded promotional campaigns (draft, scheduled, active, and ended states).
- **Bulk Discount Operations**: Generate bulk coupon batches or import them via CSV with dry-run validation.
- **Audit Logging & Analytics**: Track discount creations, updates, lifecycle events, and export activity logs to CSV.
- **Native Shopify Function**: Runs on Shopify's checkout infrastructure (`cart.lines.discounts.generate.run`) with WebAssembly performance and zero external API latency.

---

## 🏗️ Architecture

```
├── app/
│   ├── routes/                # React Router v7 routes (Admin embedded UI)
│   │   ├── app._index.jsx     # Overview & dashboard
│   │   ├── app.discounts.*    # Discount management & creation
│   │   ├── app.campaigns.*    # Campaign grouping & scheduling
│   │   ├── app.logs.jsx       # Audit logs & compliance trail
│   │   └── webhooks.*         # Mandatory GDPR & lifecycle webhooks
│   ├── components/            # Reusable UI & bulk forms
│   ├── shopify.server.js      # App Bridge & GraphQL server client
│   └── logger.server.js       # App audit logger
├── extensions/
│   └── mrp-discount/          # Shopify Function (cart.lines.discounts.generate.run)
│       ├── src/               # Function GraphQL input & runner
│       └── shopify.extension.toml
├── shared/
│   └── mrp-math.js            # Pure discount computation logic (used by app & function)
└── prisma/
    └── schema.prisma          # Database schema (Sessions, Discounts, Campaigns, Logs)
```

---

## 📐 How the Discount Calculation Works

1. **Target Price Formula**:
   $$\text{Discount Off MRP} = \begin{cases} \text{MRP} \times \frac{\text{Value}}{100} & (\text{Percentage}) \\ \text{Value} & (\text{Fixed Amount}) \end{cases}$$
   $$\text{Target Price} = \max(0, \text{MRP} - \text{Discount Off MRP})$$

2. **Price Floor Enforcement**:
   If a minimum price floor is specified, $\text{Target Price}$ is clamped so it never drops below the floor.

3. **Shopify Per-Unit Discount**:
   - If $\text{Target Price} \ge \text{Price}$, the item already sells for less than the discounted MRP; no discount is added.
   - If $\text{Target Price} < \text{Price}$:
     $$\text{Discount per unit} = \text{Price} - \text{Target Price}$$
   This ensures prices never increase, never go negative, and discount calculations are always accurate.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.20+ or Node.js 20+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- A Shopify Partner account and development store

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/unb-hariomVashista/Anchr.git
   cd Anchr
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Initialize the database**:
   ```bash
   pnpm exec prisma db push
   ```

4. **Start local development**:
   ```bash
   pnpm run dev
   ```
   Press `P` to open your app URL and install it on your development store.

---

## 🛠️ Commands

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Runs the local development server with Cloudflare tunnel |
| `pnpm run build` | Compiles the React Router web application for production |
| `pnpm run deploy` | Builds the Shopify Function and deploys the app configuration |
| `pnpm exec prisma studio` | Opens the Prisma visual database browser |

---

## 🔒 Security & App Store Compliance

- **Authentication**: Fully embedded admin interface using Shopify App Bridge session tokens (no third-party cookie dependencies).
- **Access Scopes**: Requests only the minimal required scopes:
  - `read_products`
  - `read_discounts`
  - `write_discounts`
- **GraphQL Only**: Built entirely on Shopify's GraphQL Admin API (`2026-07`/`2027-01`).
- **Privacy Webhooks**: Handles mandatory Shopify GDPR topics (`customers/data_request`, `customers/redact`, `shop/redact`).
- **Checkout Integrity**: Uses native Shopify Functions at checkout without altering catalog pricing or circumventing payment.

---

## 📄 License

Proprietary / MIT. Developed by **Anchr**.
