import type { AssistantProvider, ChatMessage, ProviderReply } from "../types";
import {
  SAFE_CLINICAL_RESPONSE,
  SAFE_CRISIS_RESPONSE,
  normalizeInput,
  guardianLog,
  CRISIS_RE,
  CLINICAL_RE,
} from "../guardian";

/**
 * Proveedor local determinista (modo demostración del MVP).
 * Reglas simples por palabras clave; sin red, sin modelo, sin estado.
 * El guardián intercepta antes en el orquestador; estas reglas son defensa en profundidad.
 */
export class LocalRuleProvider implements AssistantProvider {
  readonly id = "local-rules";

  async respond(messages: ChatMessage[]): Promise<ProviderReply> {
    const last = [...messages].reverse().find((m) => m.role === "user");
    const text = normalizeInput(last?.text ?? "");

    let reply: string;
    if (text.length === 0) {
      reply = "Cuéntame en una frase cómo va tu día y partimos por algo pequeño.";
    } else if (CRISIS_RE.test(text)) {
      guardianLog.logEvent("crisis", "safe_response");
      reply = SAFE_CRISIS_RESPONSE;
    } else if (CLINICAL_RE.test(text)) {
      reply = SAFE_CLINICAL_RESPONSE;
    } else if (/\b(ocupad\w*|trabaj\w*|tiempo|agenda|apuro)|\b(busy|workload|schedule|in a rush)\b|\btime\b|很忙|工作太忙|没时间|赶时间/i.test(text)) {
      reply =
        "El tiempo aprieta, lo entiendo. Sin asumir nada: ¿una versión de dos minutos, otro momento del día, o lo dejamos para mañana sin culpa?";
    } else if (/\b(olvid|culpa|guilt|forgot)\b|忘记|内疚/i.test(text)) {
      reply =
        "Olvidar un día no borra lo que ya cuidaste. Un paso minúsculo ahora: cambia de postura o da tres respiraciones tranquilas. Cuando quieras, lo marcamos juntos.";
    } else if (/\b(cansad\w*|agotad\w*|energia|dificil|no pude|falle\w*)|\b(tired|exhausted|no energy|couldn'?t|i failed)\b|好累|精疲力尽|没精力|没做到/i.test(text)) {
      reply =
        "Gracias por contarlo. Con poca energía, un paso minúsculo basta: estira los hombros veinte segundos o toma un sorbo de agua con calma. Cuando quieras, lo marcamos juntos.";
    } else {
      reply =
        "Gracias por compartirlo. Un paso minúsculo ahora: pausa veinte segundos y respira. Si quieres, elegimos juntos otra versión pequeña; y si no, también está bien.";
    }

    return { text: reply, meta: { providerId: this.id, model: "rules-1.0" } };
  }
}
