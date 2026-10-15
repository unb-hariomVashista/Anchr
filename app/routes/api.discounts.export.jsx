import { authenticate } from "../shopify.server";
import { logEvent } from "../logger.server";
import { csvResponse, todayStamp } from "../services/csv.server";
import { DISCOUNT_TEMPLATE_CSV, exportDiscountsCsv } from "../services/discount-bulk.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const params = new URL(request.url).searchParams;

  if (params.get("template")) return csvResponse(DISCOUNT_TEMPLATE_CSV, "discounts-template.csv");

  const idsParam = params.get("ids")?.trim();
  const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const filters = { q: params.get("q")?.trim() || undefined, status: params.get("status") || undefined, type: params.get("type") || undefined, ids };
  await logEvent({
    shop: session.shop,
    level: "INFO",
    module: "AdminUI",
    action: "DISCOUNTS_EXPORTED",
    message: "Exported discounts to CSV",
    metadata: { filters },
    actorId: session.userId != null ? String(session.userId) : null,
    entityType: "DISCOUNT",
  });
  return csvResponse(exportDiscountsCsv(session.shop, filters), `discounts-${todayStamp()}.csv`);
};
