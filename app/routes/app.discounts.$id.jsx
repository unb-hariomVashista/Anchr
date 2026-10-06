import { redirect, useActionData, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { newContext, ShopifyUserError } from "../services/shopify-client.server";
import { parseDiscountInput, updateDiscount } from "../services/discounts.server";
import { DiscountForm } from "../components/DiscountForm";
import { AppShell, PageHeader } from "../components/ui";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const discount = await db.discount.findFirst({ where: { id: params.id, shop: session.shop } });
  if (!discount) throw new Response("Discount not found", { status: 404 });
  return { discount };
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const ctx = newContext(admin, session);
  const form = Object.fromEntries(await request.formData());

  const existing = await db.discount.findFirst({ where: { id: params.id, shop: session.shop } });
  if (!existing) return { errors: ["Discount not found."] };
  // Dates belong to the campaign when there is one.
  if (existing.campaignId) {
    form.startsAt = existing.startsAt?.toISOString().slice(0, 10) ?? "";
    form.endsAt = existing.endsAt?.toISOString().slice(0, 10) ?? "";
  }

  const { data, errors } = parseDiscountInput(form);
  if (!data) return { errors };

  try {
    await updateDiscount(ctx, params.id, data);
    return redirect(existing.campaignId ? `/app/campaigns/${existing.campaignId}` : "/app/discounts");
  } catch (err) {
    return { errors: [err instanceof ShopifyUserError ? err.message : `Unexpected error: ${err.message}`] };
  }
};

export default function EditDiscount() {
  const { discount } = useLoaderData();
  const actionData = useActionData();
  const back = discount.campaignId ? `/app/campaigns/${discount.campaignId}` : "/app/discounts";

  return (
    <AppShell>
      <PageHeader title={`Edit ${discount.title}`} back={back} />
      <DiscountForm discount={discount} editing errors={actionData?.errors} cancelTo={back} />
    </AppShell>
  );
}
