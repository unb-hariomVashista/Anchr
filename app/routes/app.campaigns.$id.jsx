import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { newContext } from "../services/shopify-client.server";
import {
  activateCampaign,
  deleteCampaign,
  duplicateCampaign,
  endCampaign,
  parseCampaignInput,
  pauseCampaign,
  resumeCampaign,
  syncCampaignStatuses,
  updateCampaign,
} from "../services/campaigns.server";
import { deleteDiscount } from "../services/discounts.server";
import { StatusBadge, describeValue, fmtDate, toDateInput } from "../components/status";
import { A, AppShell, Btn, Card, DataTable, ErrorList, Field, Input, PageHeader, TCell, TextArea, TRow } from "../components/ui";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  await syncCampaignStatuses(newContext(admin, session));
  const campaign = await db.campaign.findFirst({
    where: { id: params.id, shop: session.shop },
    include: { discounts: { orderBy: { createdAt: "asc" } } },
  });
  if (!campaign) throw new Response("Campaign not found", { status: 404 });
  return { campaign };
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const ctx = newContext(admin, session);
  const form = await request.formData();
  const intent = form.get("intent");

  try {
    let result;
    switch (intent) {
      case "activate": result = await activateCampaign(ctx, params.id); break;
      case "pause": result = await pauseCampaign(ctx, params.id); break;
      case "resume": result = await resumeCampaign(ctx, params.id); break;
      case "end": result = await endCampaign(ctx, params.id); break;
      case "save": {
        const { data, errors } = parseCampaignInput(Object.fromEntries(form));
        if (!data) return { errors };
        result = await updateCampaign(ctx, params.id, data);
        break;
      }
      case "removeDiscount": {
        const id = form.get("discountId")?.toString();
        const owned = await db.discount.findFirst({ where: { id, campaignId: params.id, shop: session.shop } });
        if (owned) await deleteDiscount(ctx, id);
        return { ok: true };
      }
      case "duplicate": {
        const copy = await duplicateCampaign(ctx, params.id);
        return redirect(`/app/campaigns/${copy.id}`);
      }
      case "delete":
        await deleteCampaign(ctx, params.id);
        return redirect("/app/campaigns");
      default:
        return { errors: ["Unknown action."] };
    }
    return { errors: result.failures.map((f) => `${f.title}: ${f.error}`) };
  } catch (err) {
    return { errors: [err.message] };
  }
};

function ActionButton({ intent, children, variant, confirmText, slot }) {
  const nav = useNavigation();
  return (
    <Form
      slot={slot}
      method="post"
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="intent" value={intent} />
      <Btn type="submit" variant={variant} loading={nav.formData?.get("intent") === intent}>
        {children}
      </Btn>
    </Form>
  );
}

const STAGES = [
  ["DRAFT", ["DRAFT"], "Draft: nothing is in Shopify yet"],
  ["SCHEDULED", ["SCHEDULED"], "Scheduled: waiting for the start date"],
  ["ACTIVE", ["ACTIVE"], "Active: discounts are live"],
  ["ENDED", ["ENDED", "CANCELLED"], "Ended: dates passed or you ended it"],
];

export default function CampaignDetail() {
  const { campaign: c } = useLoaderData();
  const actionData = useActionData();
  const s = c.status;
  const editable = !["ENDED", "CANCELLED"].includes(s);

  return (
    <AppShell>
      <PageHeader title={c.name} back="/app/campaigns" badge={<StatusBadge status={s} />}>
        {["DRAFT", "NEEDS_ATTENTION"].includes(s) && (
          <ActionButton intent="activate" variant="primary">{s === "DRAFT" ? "Activate" : "Retry"}</ActionButton>
        )}
        {["SCHEDULED", "ACTIVE"].includes(s) && <ActionButton intent="pause">Pause</ActionButton>}
        {s === "PAUSED" && <ActionButton intent="resume" variant="primary">Resume</ActionButton>}
        {editable && s !== "DRAFT" && (
          <ActionButton intent="end" variant="critical" confirmText="End this campaign? Its discounts stop working in Shopify.">
            {s === "SCHEDULED" ? "Cancel" : "End"}
          </ActionButton>
        )}
        {s === "DRAFT" && (
          <ActionButton intent="end" variant="critical" confirmText="Cancel this campaign?">Cancel</ActionButton>
        )}
        <ActionButton intent="duplicate">Duplicate</ActionButton>
        {["DRAFT", "ENDED", "CANCELLED"].includes(s) && (
          <ActionButton intent="delete" variant="critical" confirmText="Delete this campaign and its discounts?">Delete</ActionButton>
        )}
      </PageHeader>

      <ErrorList title="Some actions failed" errors={actionData?.errors} />

      <Card title="Details">
        <s-text color="subdued">{fmtDate(c.startsAt)} – {fmtDate(c.endsAt)}</s-text>
        {editable ? (
          <Form method="post">
            <s-stack gap="base">
              <input type="hidden" name="intent" value="save" />
              <Field label="Name"><Input name="name" defaultValue={c.name} /></Field>
              <Field label="Description"><TextArea name="description" defaultValue={c.description ?? ""} /></Field>
              <s-grid gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="base">
                <Field label="Start date (UTC)"><Input type="date" name="startsAt" defaultValue={toDateInput(c.startsAt)} /></Field>
                <Field label="End date"><Input type="date" name="endsAt" defaultValue={toDateInput(c.endsAt)} /></Field>
              </s-grid>
              <s-text color="subdued">These dates apply to every discount in the campaign.</s-text>
              <s-stack direction="inline"><Btn type="submit">Save details</Btn></s-stack>
            </s-stack>
          </Form>
        ) : (
          c.description && <s-text>{c.description}</s-text>
        )}
      </Card>

      <Card title={`Discounts (${c.discounts.length})`}>
        {editable && (
          <s-stack direction="inline"><Btn to={`/app/discounts/new?campaignId=${c.id}`}>Add discount</Btn></s-stack>
        )}
        {c.discounts.length === 0 ? (
          <s-text color="subdued">No discounts yet. Add at least one before activating.</s-text>
        ) : (
          <DataTable head={["Title", "Method", "Discount", "Status", "Actions"]}>
            {c.discounts.map((d) => (
              <TRow key={d.id}>
                <TCell>{d.title}</TCell>
                <TCell>{d.method === "CODE" ? `Code ${d.code}` : "Automatic"}</TCell>
                <TCell>{describeValue(d)}</TCell>
                <TCell>
                  <StatusBadge status={d.status} />
                  {d.lastSyncError && <s-text tone="critical"> {d.lastSyncError}</s-text>}
                </TCell>
                <TCell>
                  <s-stack direction="inline" gap="small-200">
                    <Btn small to={`/app/discounts/${d.id}`}>Edit</Btn>
                    {editable && (
                      <Form method="post" onSubmit={(e) => { if (!confirm(`Remove "${d.title}"?`)) e.preventDefault(); }}>
                        <input type="hidden" name="intent" value="removeDiscount" />
                        <input type="hidden" name="discountId" value={d.id} />
                        <Btn small type="submit" variant="critical">Remove</Btn>
                      </Form>
                    )}
                  </s-stack>
                </TCell>
              </TRow>
            ))}
          </DataTable>
        )}
      </Card>

      <Card aside title="Lifecycle">
        {STAGES.map(([key, members, label]) => (
          <s-text key={key} type={members.includes(s) ? "strong" : undefined} color={members.includes(s) ? undefined : "subdued"}>{label}</s-text>
        ))}
        <s-text color="subdued">Paused or needs-attention campaigns can be resumed or retried.</s-text>
      </Card>
      <Card aside title="History">
        <A to={`/app/logs?entityType=CAMPAIGN&entityId=${c.id}`}>View audit trail</A>
      </Card>
    </AppShell>
  );
}
