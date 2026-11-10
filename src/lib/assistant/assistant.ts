import type { AssistantProvider, AssistantReply, ChatMessage, GuardianAction, ProviderReply } from "./types";
import {
  classifyInput,
  validateOutput,
  guardianLog,
  SAFE_CRISIS_RESPONSE,
  SAFE_CLINICAL_RESPONSE,
  SAFE_BOUNDARY_RESPONSE,
} from "./guardian";
import { LocalRuleProvider } from "./providers/local";

function lastUserText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return messages[i].text;
  }
  return "";
}

function safeReply(
  text: string,
  providerId: string,
  guardianAction: GuardianAction,
  latencyMs: number,
): AssistantReply {
  return {
    text,
    meta: { providerId, safety: { screenedInput: true, guardianAction, latencyMs } },
  };
}

export class BluAssistant {
  private readonly provider: AssistantProvider;
  private readonly fallback: LocalRuleProvider;

  constructor(provider: AssistantProvider) {
    this.provider = provider;
    this.fallback = new LocalRuleProvider();
  }

  async ask(messages: ChatMessage[]): Promise<AssistantReply> {
    const started = Date.now();
    const input = lastUserText(messages);

    if (input.trim().length === 0) {
      const reply = await this.fallback.respond(messages);
      return this.withSafety(reply, "none", started);
    }

    const classification = classifyInput(input);
    if (classification.category === "crisis") {
      guardianLog.logEvent("crisis", "safe_response");
      return safeReply(SAFE_CRISIS_RESPONSE, this.provider.id, "crisis_escalation", Date.now() - started);
    }
    if (classification.category === "clinical") {
      guardianLog.logEvent("clinical", "safe_response");
      return safeReply(SAFE_CLINICAL_RESPONSE, this.provider.id, "clinical_referral", Date.now() - started);
    }
    if (classification.category === "boundary") {
      guardianLog.logEvent("injection_attempt", "safe_response");
      return safeReply(SAFE_BOUNDARY_RESPONSE, this.provider.id, "boundary_response", Date.now() - started);
    }

    try {
      const reply = await this.provider.respond(messages);
      const latencyMs = Date.now() - started;
      if (!validateOutput(reply.text)) {
        guardianLog.logEvent("prohibited_claim", "output_replaced");
        return safeReply(SAFE_BOUNDARY_RESPONSE, this.provider.id, "output_replaced", latencyMs);
      }
      return this.withSafety(reply, "none", started);
    } catch {
      guardianLog.logEvent("provider_error", "degraded_local");
      const degraded = await this.fallback.respond(messages);
      const reply = this.withSafety(degraded, "provider_error", started);
      return { ...reply, meta: { ...reply.meta, providerId: "local-rules" } };
    }
  }

  private withSafety(reply: ProviderReply, guardianAction: GuardianAction, started: number): AssistantReply {
    return {
      text: reply.text,
      meta: {
        providerId: reply.meta.providerId,
        model: reply.meta.model,
        safety: {
          screenedInput: true,
          guardianAction,
          latencyMs: Date.now() - started,
        },
      },
    };
  }
}
