import { Link, redirect, useActionData, useLoaderData, useNavigation, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { authenticate } from "../shopify.server";
import { newContext, ShopifyUserError } from "../services/shopify-client.server";
import { createDiscount, parseDiscountInput } from "../services/discounts.server";
import { pushIfCampaignLive } from "../services/campaigns.server";
import { readCsvUpload } from "../services/csv.server";
import { generateDiscounts, importDiscountsCsv } from "../services/discount-bulk.server";
import { BulkResult, BulkTabs } from "../components/BulkResult";
import { BulkGenerateForm, DiscountImportForm } from "../components/DiscountBulkForms";
import { DiscountForm } from "../components/DiscountForm";
import { AppShell } from "../components/ui";
import db from "../db.server";
import "../styles/discount-form.css";
import "../styles/bulk.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const campaignId = new URL(request.url).searchParams.get("campaignId");
  const campaign = campaignId
    ? await db.campaign.findFirst({ where: { id: campaignId, shop: session.shop }, select: { id: true, name: true } })
    : null;
  const campaigns = await db.campaign.findMany({
    where: { shop: session.shop, status: { in: ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED"] } },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
  return { campaign, campaigns };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const ctx = newContext(admin, session);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "generate") return { result: await generateDiscounts(ctx, Object.fromEntries(formData)) };
  if (intent === "validate" || intent === "import") {
    const upload = await readCsvUpload(formData.get("file"));
    if (upload.error) return { result: { mode: "run", created: 0, failed: 0, rows: [], error: upload.error } };
    return { result: await importDiscountsCsv(ctx, upload.text, intent === "validate") };
  }

  const form = Object.fromEntries(formData);

  const { data, errors } = parseDiscountInput(form);
  if (!data) return { errors };

  const campaignId = form.campaignId?.toString() || null;
  if (campaignId) {
    const owned = await db.campaign.findFirst({ where: { id: campaignId, shop: session.shop } });
    if (!owned) return { errors: ["Campaign not found."] };
    data.campaignId = campaignId;
  }

  try {
    const discount = await createDiscount(ctx, data);
    if (campaignId) {
      await pushIfCampaignLive(ctx, campaignId, discount.id);
      return redirect(`/app/campaigns/${campaignId}`);
    }
    return redirect("/app/discounts");
  } catch (err) {
    return {
      errors: [err instanceof ShopifyUserError ? err.message : `Unexpected error: ${err.message}`],
    };
  }
};

export default function NewDiscount() {
  const { campaigns } = useLoaderData();
  const actionData = useActionData();
  const busy = useNavigation().state !== "idle";
  const [params] = useSearchParams();
  const campaignId = params.get("campaignId");
  const back = campaignId ? `/app/campaigns/${campaignId}` : "/app/discounts";

  // Inside a campaign only single coupons can be created.
  const tab = campaignId ? "normal" : ["bulk", "import"].includes(params.get("tab")) ? params.get("tab") : "normal";

  const titles = {
    normal: "Create Coupon",
    bulk: "Bulk Generate Coupons",
    import: "Import Coupons from CSV",
  };

  const subtitles = {
    normal: "Create a single MRP-based discount coupon code for your store.",
    bulk: "Generate multiple unique discount codes off MRP simultaneously.",
    import: "Upload a CSV spreadsheet to import multiple discount coupons at once.",
  };

  return (
    <AppShell>
      <div className="discount-form-page">
        {/* Unified Page Header */}
        <div className="discount-form-header">
          <div className="discount-form-title-group">
            <h1>{titles[tab]}</h1>
            <p>{subtitles[tab]}</p>
          </div>
          <Link to={back} className="btn-doc-link">
            <ArrowLeft size={16} /> Back to Discounts
          </Link>
        </div>

        {/* Tab Selector */}
        {!campaignId && (
          <div>
            <BulkTabs
              base="/app/discounts/new"
              tab={tab}
              labels={{ normal: "Single Coupon", bulk: "Bulk Generator", import: "Import CSV" }}
            />
          </div>
        )}

        {/* Bulk Action Outcome Result Card */}
        {tab !== "normal" && <BulkResult result={actionData?.result} noun="Code / Title" />}

        {/* Form Body */}
        {tab === "normal" && <DiscountForm campaignId={campaignId} errors={actionData?.errors} cancelTo={back} />}
        {tab === "bulk" && <BulkGenerateForm campaigns={campaigns} busy={busy} />}
        {tab === "import" && <DiscountImportForm busy={busy} />}
      </div>
    </AppShell>
  );
}
