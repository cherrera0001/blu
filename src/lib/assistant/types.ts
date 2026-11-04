export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export type GuardianAction =
  | "none"
  | "crisis_escalation"
  | "clinical_referral"
  | "boundary_response"
  | "output_replaced"
  | "provider_error";

export interface SafetyMetadata {
  screenedInput: boolean;
  guardianAction: GuardianAction;
  latencyMs: number;
}

export interface ProviderReply {
  text: string;
  meta: {
    providerId: string;
    model?: string;
  };
}

export interface AssistantReply {
  text: string;
  meta: {
    providerId: string;
    model?: string;
    safety: SafetyMetadata;
  };
}

export interface AssistantProvider {
  readonly id: string;
  respond(messages: ChatMessage[]): Promise<ProviderReply>;
}
