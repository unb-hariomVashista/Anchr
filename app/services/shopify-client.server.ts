import { logEvent, type LogParams } from "../logger.server";

export interface ServiceContext {
  admin: { graphql: (query: string, options?: { variables?: unknown }) => Promise<Response> };
  shop: string;
  actorId?: string | null;
  requestId: string;
}

export interface UserError {
  field?: string[] | null;
  message: string;
}

export class ShopifyUserError extends Error {
  constructor(public userErrors: UserError[]) {
    super(userErrors.map((e) => e.message).join("; "));
    this.name = "ShopifyUserError";
  }
}

export function newContext(
  admin: ServiceContext["admin"],
  session: { shop: string; userId?: bigint | number | string | null },
): ServiceContext {
  return {
    admin,
    shop: session.shop,
    actorId: session.userId != null ? String(session.userId) : null,
    requestId: crypto.randomUUID(),
  };
}

export function log(ctx: ServiceContext, params: Omit<LogParams, "shop" | "actorId" | "requestId">) {
  return logEvent({ ...params, shop: ctx.shop, actorId: ctx.actorId, requestId: ctx.requestId });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs an Admin GraphQL operation. Logs success, userErrors and exceptions,
 * retries transient failures with backoff, and throws ShopifyUserError on userErrors.
 * `resultKey` is the mutation root field that carries `userErrors`.
 */
export async function adminMutation<T = any>(
  ctx: ServiceContext,
  action: string,
  query: string,
  variables: Record<string, unknown>,
  resultKey: string,
  entity?: { type: "DISCOUNT" | "CAMPAIGN"; id: string },
): Promise<T> {
  const base = { module: "ShopifyAPI" as const, entityType: entity?.type, entityId: entity?.id };
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ctx.admin.graphql(query, { variables });
      const body = await response.json();

      if (body.errors?.length) {
        const throttled = body.errors.some((e: any) => e.extensions?.code === "THROTTLED");
        if (throttled && attempt < 3) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);
      }

      const result = body.data?.[resultKey];
      if (result?.userErrors?.length) {
        await log(ctx, {
          ...base,
          level: "ERROR",
          action: `${action}_USER_ERRORS`,
          message: `Shopify rejected ${action}: ${result.userErrors.map((e: UserError) => e.message).join("; ")}`,
          metadata: { variables, userErrors: result.userErrors },
        });
        throw new ShopifyUserError(result.userErrors);
      }

      await log(ctx, {
        ...base,
        level: "INFO",
        action: `${action}_SUCCESS`,
        message: `Shopify ${action} succeeded`,
        metadata: { attempt },
      });
      return result as T;
    } catch (err) {
      if (err instanceof ShopifyUserError) throw err;
      lastError = err;
      if (attempt < 3) await sleep(500 * 2 ** attempt);
    }
  }

  await log(ctx, {
    ...base,
    level: "ERROR",
    action: `${action}_EXCEPTION`,
    message: `Shopify ${action} failed: ${(lastError as Error)?.message}`,
    metadata: { stack: (lastError as Error)?.stack },
  });
  throw lastError;
}
