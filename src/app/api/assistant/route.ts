import { BluAssistant } from "@/lib/assistant/assistant";
import { LocalRuleProvider } from "@/lib/assistant/providers/local";

// Next 16 (Cache Components): los Route Handlers corren a request time por defecto;
// no se usa `export const dynamic` (incompatible con cacheComponents, docs instaladas).

const MAX_MESSAGES = 10;
const MAX_TEXT = 2000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_MAX;
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}

function isValidBody(body: unknown): body is { messages: ChatMessage[] } {
  if (typeof body !== "object" || body === null) return false;
  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return false;
  }
  return messages.every(
    (m) =>
      typeof m === "object" &&
      m !== null &&
      ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
      typeof (m as ChatMessage).text === "string" &&
      (m as ChatMessage).text.length > 0 &&
      (m as ChatMessage).text.length <= MAX_TEXT,
  );
}

const PROVIDER_ERROR_TEXT =
  "Tuve un problema para responder, pero sigo aquí. ¿Quieres intentarlo de nuevo?";

/**
 * BFF /api/assistant (specs/016): validación → rate limit → guardián → proveedor → guardián
 * de salida. Versión actual con proveedor LOCAL (LocalRuleProvider): sin claves, sin red
 * externa, sin persistencia. El adaptador remoto queda gated (ADR-0003/0004, specs/015).
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isValidBody(body)) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!rateLimit(clientIp(request))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const assistant = new BluAssistant(new LocalRuleProvider());
  try {
    const reply = await assistant.ask(body.messages);
    return Response.json({
      text: reply.text,
      meta: {
        providerId: reply.meta.providerId,
        safety: {
          guardianAction: reply.meta.safety.guardianAction,
          latencyMs: reply.meta.safety.latencyMs,
        },
      },
    });
  } catch {
    return Response.json(
      {
        text: PROVIDER_ERROR_TEXT,
        meta: {
          providerId: "local-rules",
          safety: { guardianAction: "provider_error", latencyMs: 0 },
        },
      },
      { status: 200 },
    );
  }
}
