import { authenticate } from "../shopify.server";
import { exportLogsCsv, filtersFromParams } from "../services/audit.server";
import { logEvent } from "../logger.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const filters = filtersFromParams(new URL(request.url).searchParams);

  await logEvent({
    shop: session.shop,
    level: "INFO",
    module: "AdminUI",
    action: "LOGS_EXPORTED",
    message: "Exported audit logs to CSV",
    metadata: { filters },
    actorId: session.userId != null ? String(session.userId) : null,
    entityType: "SYSTEM",
  });

  return new Response(exportLogsCsv(session.shop, filters), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
};
