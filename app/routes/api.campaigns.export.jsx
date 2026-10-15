import { authenticate } from "../shopify.server";
import { logEvent } from "../logger.server";
import { csvResponse, todayStamp } from "../services/csv.server";
import { CAMPAIGN_TEMPLATE_CSV, exportCampaignsCsv } from "../services/campaign-bulk.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const params = new URL(request.url).searchParams;

  if (params.get("template")) return csvResponse(CAMPAIGN_TEMPLATE_CSV, "campaigns-template.csv");

  const idsParam = params.get("ids")?.trim();
  const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const filters = { q: params.get("q")?.trim() || undefined, status: params.get("status") || undefined, ids };
  await logEvent({
    shop: session.shop,
    level: "INFO",
    module: "AdminUI",
    action: "CAMPAIGNS_EXPORTED",
    message: "Exported campaigns to CSV",
    metadata: { filters },
    actorId: session.userId != null ? String(session.userId) : null,
    entityType: "CAMPAIGN",
  });
  return csvResponse(exportCampaignsCsv(session.shop, filters), `campaigns-${todayStamp()}.csv`);
};
