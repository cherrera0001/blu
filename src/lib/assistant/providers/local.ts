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
      reply = "Cuéntame en una frase cómo va tu día; podemos partir por algo pequeño.";
    } else if (CRISIS_RE.test(text)) {
      guardianLog.logEvent("crisis", "safe_response");
      reply = SAFE_CRISIS_RESPONSE;
    } else if (CLINICAL_RE.test(text)) {
      reply = SAFE_CLINICAL_RESPONSE;
    } else if (/\b(ocupad\w*|trabaj\w*|tiempo|agenda|apuro)/i.test(text)) {
      reply =
        "Tiene sentido que el tiempo influya. No asumiré qué necesitas: ¿te serviría elegir una versión de dos minutos, cambiar el momento o dejarlo para otro día?";
    } else if (/\b(cansad\w*|agotad\w*|energia|dificil|no pude|falle\w*)/i.test(text)) {
      reply =
        "Gracias por contármelo. No es un fallo. ¿Qué pesó más esta vez: el tiempo, la energía, acordarte u otra cosa? Puedes cambiar el plan o no cambiarlo.";
    } else {
      reply =
        "Gracias por compartirlo. ¿Qué versión pequeña y realista te gustaría probar, si es que quieres probar alguna?";
    }

    return { text: reply, meta: { providerId: this.id, model: "rules-1.0" } };
  }
}
