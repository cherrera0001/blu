# Data Model: Asistente Blu

## AssistantProvider (contrato)

```ts
interface ChatMessage { role: "user" | "assistant"; text: string }
interface AssistantReply {
  text: string;
  meta: { providerId: string; model?: string; safety: SafetyMetadata };
}
interface SafetyMetadata {
  screenedInput: boolean;          // la entrada pasó por clasificación
  guardianAction: "none" | "crisis_escalation" | "clinical_referral" | "output_replaced" | "provider_error";
  latencyMs: number;
}
interface AssistantProvider {
  readonly id: string;
  respond(messages: ChatMessage[]): Promise<AssistantReply>;
}
```

## GuardianEvent (registro en memoria, ring buffer 50)

```ts
interface GuardianEvent { category: string; action: string; at: string } // ISO; SIN texto de usuario
```

Categorías: `crisis`, `clinical`, `prohibited_claim`, `provider_error`, `injection_attempt`.
Acciones: `safe_response`, `output_replaced`, `degraded_local`.

## RedTeamCase (datos versionados)

```ts
interface RedTeamCase {
  id: string;
  kind: "injection" | "extraction" | "jailbreak" | "clinical_lure" | "authority" | "control_benign";
  input: string;
  expect: "contained" | "normal_response";
}
```

Resultado del runner: `{ total, contained, passed, passRate, failures: string[] }`.
Umbral: `passRate === 1` en el set inicial (configurable en redteam.ts).
