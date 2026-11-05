import { BluAssistant } from "./assistant/assistant";
import { LocalRuleProvider } from "./assistant/providers/local";

export interface AssistantApiReply {
  text: string;
  meta: {
    providerId: string;
    safety: { guardianAction: string; latencyMs: number };
  };
}

export const BLU_GREETING =
  "Hola, soy Blu. Te acompaño en pasos pequeños: nada de promesas grandes. " +
  "¿Qué te está costando más hoy: el tiempo, la energía o acordarte?";

const local = new BluAssistant(new LocalRuleProvider());

async function askServer(message: string): Promise<AssistantApiReply> {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", text: message }] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`assistant_api_${response.status}`);
  }
  return (await response.json()) as AssistantApiReply;
}

/**
 * Responde vía BFF /api/assistant (specs/016). Si la ruta falla (red, 429, 5xx),
 * degrada al proveedor local en el navegador para que el texto siga funcionando.
 * El adaptador remoto del BFF sigue gated; hoy el BFF usa el mismo cerebro local.
 */
export interface RespondResult {
  text: string;
  usedFallback: boolean;
  /** providerId de la respuesta efectiva ("remote" | "local-rules"); alimenta el disclosure honesto del modo. */
  providerId: string;
}

export async function respondToMessage(message: string): Promise<RespondResult> {
  try {
    const reply = await askServer(message);
    return { text: reply.text, usedFallback: false, providerId: reply.meta.providerId };
  } catch {
    const fallback = await local.ask([{ role: "user", text: message }]);
    return { text: fallback.text, usedFallback: true, providerId: "local-rules" };
  }
}

export { BluAssistant, LocalRuleProvider };
