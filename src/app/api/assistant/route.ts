import { BluAssistant } from "@/lib/assistant/assistant";
import { LocalRuleProvider } from "@/lib/assistant/providers/local";
import { getRemoteLlmConfig, RemoteLlmProvider } from "@/lib/assistant/providers/remote";
import type { AssistantProvider } from "@/lib/assistant/types";

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

const DAY_MS = 86_400_000;
const DAILY_MAX = 200;
const MAX_TRACKED_IPS = 1000;

interface Bucket {
  count: number;
  resetAt: number;
  day: string;
  dayCount: number;
}

const buckets = new Map<string, Bucket>();

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function sweepIfNeeded(now: number): void {
  if (buckets.size < MAX_TRACKED_IPS) return;
  for (const [ip, bucket] of buckets) {
    if (now > bucket.resetAt + DAY_MS) buckets.delete(ip);
  }
}

function rateLimit(ip: string): boolean {
  const now = Date.now();
  sweepIfNeeded(now);
  const today = dayKey(now);
  let bucket = buckets.get(ip);
  if (!bucket || bucket.day !== today) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS, day: today, dayCount: 0 };
    buckets.set(ip, bucket);
  }
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_WINDOW_MS;
  }
  bucket.count += 1;
  bucket.dayCount += 1;
  return bucket.count <= RATE_MAX && bucket.dayCount <= DAILY_MAX;
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
 * Resuelve el proveedor por request: remoto cuando BLU_LLM_BASE_URL/API_KEY/MODEL
 * están configuradas (ADR-0005); si no, el proveedor local determinista actual.
 * El orquestador degrada automáticamente al local si el remoto falla.
 */
function resolveProvider(): AssistantProvider {
  const config = getRemoteLlmConfig();
  return config ? new RemoteLlmProvider(config) : new LocalRuleProvider();
}

/**
 * Capacidades públicas del BFF (sin secretos): permite a la UI reflejar el modo
 * de respuesta antes de la primera interacción. No-store por ser request time.
 */
export async function GET(): Promise<Response> {
  return Response.json(
    { remoteConfigured: getRemoteLlmConfig() !== null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * BFF /api/assistant (specs/016): auth opcional → validación → rate limit →
 * guardián → proveedor → guardián de salida. Proveedor remoto intercambiable
 * detrás del mismo contrato; sin persistencia de conversaciones.
 */
export async function POST(request: Request): Promise<Response> {
  const apiToken = process.env.BLU_API_TOKEN?.trim();
  if (apiToken && request.headers.get("authorization") !== `Bearer ${apiToken}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

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

  const assistant = new BluAssistant(resolveProvider());
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
