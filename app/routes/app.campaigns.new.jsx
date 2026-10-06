import { Form, redirect, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import { newContext } from "../services/shopify-client.server";
import { createCampaign, parseCampaignInput } from "../services/campaigns.server";
import { AppShell, Btn, Card, ErrorList, Field, Input, PageHeader, TextArea } from "../components/ui";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { data, errors } = parseCampaignInput(Object.fromEntries(await request.formData()));
  if (!data) return { errors };
  const campaign = await createCampaign(newContext(admin, session), data);
  return redirect(`/app/campaigns/${campaign.id}`);
};

export default function NewCampaign() {
  const actionData = useActionData();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <PageHeader title="Create campaign" back="/app/campaigns" />
      <Form method="post">
        <s-stack gap="base">
          <ErrorList errors={actionData?.errors} />
          <Card title="Details">
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="Description (optional)"><TextArea name="description" /></Field>
            <s-grid gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="base">
              <Field label="Start date (UTC)"><Input type="date" name="startsAt" defaultValue={today} /></Field>
              <Field label="End date (optional)"><Input type="date" name="endsAt" /></Field>
            </s-grid>
            <s-text color="subdued">
              You will add discounts on the next screen. Nothing goes live in Shopify until you activate the campaign.
            </s-text>
          </Card>
          <s-stack direction="inline" gap="base" justifyContent="end">
            <Btn to="/app/campaigns">Cancel</Btn>
            <Btn type="submit" variant="primary">Create campaign</Btn>
          </s-stack>
        </s-stack>
      </Form>
    </AppShell>
  );
}
