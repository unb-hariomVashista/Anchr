import { authenticate } from "../shopify.server";
import db from "../db.server";
import { logEvent } from "../logger.server";

// Mandatory privacy webhooks. The app stores no customer data, so the customer topics
// are acknowledged and recorded. shop/redact removes everything held for the shop.
export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  if (topic === "SHOP_REDACT") {
    await db.discount.deleteMany({ where: { shop } });
    await db.campaign.deleteMany({ where: { shop } });
    await db.auditLog.deleteMany({ where: { shop } });
    await db.session.deleteMany({ where: { shop } });
    console.log(`Redacted all data for ${shop}`);
    return new Response();
  }

  await logEvent({
    shop,
    level: "INFO",
    module: "Webhook",
    action: `WEBHOOK_${topic}`,
    message: `Received ${topic}; no customer data is stored by this app`,
    entityType: "SYSTEM",
  });
  return new Response();
};
