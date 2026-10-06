import { redirect, useActionData, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import { newContext, ShopifyUserError } from "../services/shopify-client.server";
import { createDiscount, parseDiscountInput } from "../services/discounts.server";
import { pushIfCampaignLive } from "../services/campaigns.server";
import { DiscountForm } from "../components/DiscountForm";
import { AppShell, PageHeader } from "../components/ui";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const campaignId = new URL(request.url).searchParams.get("campaignId");
  const campaign = campaignId
    ? await db.campaign.findFirst({ where: { id: campaignId, shop: session.shop }, select: { id: true, name: true } })
    : null;
  return { campaign };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const ctx = newContext(admin, session);
  const form = Object.fromEntries(await request.formData());

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
  const actionData = useActionData();
  const [params] = useSearchParams();
  const campaignId = params.get("campaignId");
  const back = campaignId ? `/app/campaigns/${campaignId}` : "/app/discounts";

  return (
    <AppShell>
      <PageHeader title="Create MRP discount" back={back} />
      <DiscountForm campaignId={campaignId} errors={actionData?.errors} cancelTo={back} />
    </AppShell>
  );
}
