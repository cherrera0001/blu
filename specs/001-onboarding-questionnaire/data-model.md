# Data Model: Onboarding con autodiagnóstico

## QuestionBank (contenido versionado, `src/data/onboarding/bank.json`)

| Campo | Tipo | Uso |
|---|---|---|
| `bankVersion` | string semver | Versionado semántico del banco; se conserva en cada Assessment. |
| `locale` | string | Idioma del contenido (`es-CL`). |
| `disclaimer` | string | Texto legal/ético visible. |
| `principles[].id` | string | `movement`, `nourishment`, `rest`, `family`, `community`, `nature`, `purpose`. |
| `principles[].questions[].id` | string | Único en todo el banco (ej. `mov-01`). |
| `type` | enum | `single_choice` \| `likert5` \| `multi_choice`. |
| `skippable` | bool | Si ofrece «prefiero no responder». |
| `options[].value` | int\|string | Orden ordinal 0–3 / 0–4 (mayor = mejor hábito; ver `ali-02` invertida). |
| `likertAnchors` | {low, high} | Etiquetas de extremos para `likert5`. |
| `countsTowardScore` | bool | `false` en multi_choice (barreras, no índice). Default `true`. |
| `skipIf` | {question, in} | Se omite la pregunta si la referencia tiene uno de estos valores. |
| `rationale` | string | Justificación de inclusión (auditable). |
| `evidence.status` | enum | `pendiente` \| `verificada` \| `retirada`. |

## Assessment (estado del intento, persiste en `blu.onboarding.v1`)

```ts
interface Assessment {
  bankVersion: string;
  startedAt: string;          // ISO
  updatedAt: string;
  status: "in_progress" | "completed";
  answers: Record<string, QuestionAnswer>; // questionId → respuesta
}
type QuestionAnswer =
  | { kind: "value"; value: number | string }
  | { kind: "skipped" };
```

Invariantes: solo IDs existentes y valores válidos por alternativas; respuestas de preguntas
omitidas por `skipIf` no se exigen; al completar, `status = "completed"`.

## PrincipleResult / Profile (cálculo, no persiste salvo como parte del Assessment completado)

```ts
interface PrincipleResult {
  principleId: string;
  answered: number;
  skipped: number;
  score: number | null;       // 0–100; null si sin respuestas puntuables
  band: "care" | "developing" | "strength" | null;
  confidence: "normal" | "reduced";
}
interface Profile { results: PrincipleResult[]; } // rotulado experimental en UI
```

Reglas: índice = promedio de valores respondidos / max × 100; bandas 0–39/40–69/70–100;
confianza `reduced` si omitidas > 30% del principio; `multi_choice` excluidas del cálculo.
