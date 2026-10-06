import { Form, redirect, useLoaderData, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { newContext } from "../services/shopify-client.server";
import { duplicateCampaign, syncCampaignStatuses } from "../services/campaigns.server";
import { StatusBadge, fmtDate } from "../components/status";
import { A, AppShell, Btn, Card, DataTable, Field, Input, PageHeader, Select, TCell, TRow } from "../components/ui";

const STATUSES = ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "ENDED", "CANCELLED", "NEEDS_ATTENTION"];

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  await syncCampaignStatuses(newContext(admin, session));

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const statusFilter = status && status !== "ALL" ? status : undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;

  const campaigns = await db.campaign.findMany({
    where: {
      shop: session.shop,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { discounts: true } } },
  });
  return { campaigns };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  if (form.get("intent") === "duplicate") {
    const copy = await duplicateCampaign(newContext(admin, session), form.get("id").toString());
    return redirect(`/app/campaigns/${copy.id}`);
  }
  return null;
};

export default function Campaigns() {
  const { campaigns } = useLoaderData();
  const [params] = useSearchParams();

  return (
    <AppShell>
      <PageHeader title="Campaigns">
        <Btn to="/app/campaigns/new" variant="primary">Create campaign</Btn>
      </PageHeader>

      <Card>
        <Form method="get">
          <s-stack gap="base">
            <s-grid gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="base">
              <Field label="Search">
                <Input type="search" name="q" defaultValue={params.get("q") ?? ""} />
              </Field>
              <Field label="Status">
                <Select name="status" value={params.get("status") ?? "ALL"}>
                  <option value="ALL">All</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </Select>
              </Field>
            </s-grid>
            <Btn type="submit">Filter</Btn>
          </s-stack>
        </Form>
      </Card>

      {campaigns.length === 0 ? (
        <Card>
          <s-stack gap="base" alignItems="center">
            <s-text type="strong">No campaigns found</s-text>
            <s-text color="subdued">Group discounts into a scheduled campaign and manage them together.</s-text>
            <Btn to="/app/campaigns/new" variant="primary">Create campaign</Btn>
          </s-stack>
        </Card>
      ) : (
        <Card flush>
          <DataTable head={["Name", "Status", "Discounts", "Dates", "Actions"]}>
            {campaigns.map((c) => (
              <TRow key={c.id}>
                <TCell><A to={`/app/campaigns/${c.id}`}>{c.name}</A></TCell>
                <TCell><StatusBadge status={c.status} /></TCell>
                <TCell>{c._count.discounts}</TCell>
                <TCell>{fmtDate(c.startsAt)} – {fmtDate(c.endsAt)}</TCell>
                <TCell>
                  <Form method="post">
                    <input type="hidden" name="intent" value="duplicate" />
                    <input type="hidden" name="id" value={c.id} />
                    <Btn small type="submit">Duplicate</Btn>
                  </Form>
                </TCell>
              </TRow>
            ))}
          </DataTable>
        </Card>
      )}
    </AppShell>
  );
}
