import { BluAssistant } from "./assistant/assistant";
import { LocalRuleProvider } from "./assistant/providers/local";

/**
 * Compatibilidad con el código existente (BluApp y pruebas previas).
 * La nueva integración debe preferir BluAssistant directamente.
 */
const shared = new BluAssistant(new LocalRuleProvider());

export async function respondToMessage(message: string): Promise<string> {
  const reply = await shared.ask([{ role: "user", text: message }]);
  return reply.text;
}

export { BluAssistant, LocalRuleProvider };
