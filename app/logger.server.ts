import db from "./db.server";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
export type LogModule =
  | "Engine"
  | "AdminUI"
  | "ShopifyAPI"
  | "Webhook"
  | "Campaign"
  | "Scheduler"
  | "Reconcile";
export type EntityType = "DISCOUNT" | "CAMPAIGN" | "SYSTEM";

export interface LogParams {
  shop: string;
  level: LogLevel;
  module: LogModule;
  action: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  actorId?: string | null;
  entityType?: EntityType | null;
  entityId?: string | null;
  requestId?: string | null;
  /** Snapshots for audit-trail entries. */
  before?: unknown;
  after?: unknown;
}

const SENSITIVE_KEY = /token|secret|password|authorization|email|phone|address|firstname|lastname/i;

/** Removes secrets and customer PII from values before they are logged or persisted. */
export function redact(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SENSITIVE_KEY.test(k) ? "[REDACTED]" : redact(v, depth + 1),
      ]),
    );
  }
  return value;
}

const json = (v: unknown) => (v == null ? null : JSON.stringify(redact(v)));

/**
 * Structured logger. Writes JSON to the console and persists to the AuditLog table.
 * A failed DB write never fails the caller. DEBUG entries are only persisted
 * when LOG_LEVEL=debug.
 */
export async function logEvent(params: LogParams) {
  const { shop, level, module, action, message } = params;
  const metadata = params.metadata ? redact(params.metadata) : null;
  const timestamp = new Date().toISOString();

  const consolePayload = JSON.stringify({
    timestamp,
    shop,
    level,
    module,
    action,
    message,
    ...(params.entityType ? { entityType: params.entityType, entityId: params.entityId } : {}),
    ...(params.requestId ? { requestId: params.requestId } : {}),
    ...(metadata ? { metadata } : {}),
  });

  switch (level) {
    case "ERROR":
      console.error(`[MRP-LOGGER] ${consolePayload}`);
      break;
    case "WARN":
      console.warn(`[MRP-LOGGER] ${consolePayload}`);
      break;
    case "DEBUG":
      console.debug(`[MRP-LOGGER] ${consolePayload}`);
      break;
    default:
      console.log(`[MRP-LOGGER] ${consolePayload}`);
  }

  if (level === "DEBUG" && process.env.LOG_LEVEL?.toLowerCase() !== "debug") return;

  try {
    await db.auditLog.create({
      data: {
        shop,
        level,
        module,
        action,
        message,
        metadata: json(metadata),
        actorId: params.actorId ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        requestId: params.requestId ?? null,
        before: json(params.before),
        after: json(params.after),
      },
    });
  } catch (err) {
    console.error("[MRP-LOGGER] Failed to persist audit log to DB:", err);
  }
}
