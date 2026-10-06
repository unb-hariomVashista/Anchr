import { authenticate } from "../shopify.server";
import db from "../db.server";
import { logEvent } from "../logger.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  await logEvent({
    shop,
    level: "INFO",
    module: "Webhook",
    action: "APP_UNINSTALLED",
    message: `Received ${topic}. Data is kept until shop/redact (about 30 days after uninstall).`,
    entityType: "SYSTEM",
  });

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
