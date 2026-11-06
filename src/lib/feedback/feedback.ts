import { hasPurpose, type ConsentState } from "@/lib/consent";

// Aprendizaje con retroalimentación humana (BLU-1104): los eventos son
// estructurados (catálogo de razones, sin texto libre), gated por el
// consentimiento "mejora" y solo se usan agregados. Los cambios de reglas son
// decisiones humanas versionadas (ADR-0007), nunca automáticas.

export const FEEDBACK_STORAGE_KEY = "blu.feedback.v1";

export const FEEDBACK_REASONS = [
  "no-era-para-mi",
  "no-pude-hacerlo",
  "no-me-gusto",
  "duplicado",
] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export interface FeedbackEvent {
  id: string; // aleatorio, sin vínculo a la persona
  kind: "suggestion-feedback";
  habitId: string;
  useful: boolean;
  reason: FeedbackReason | null; // estructurado; NUNCA texto libre
  at: string; // ISO
}

export interface FeedbackAggregate {
  total: number;
  useful: number;
  notUseful: number;
  byReason: Record<FeedbackReason, number>;
  byHabitId: Record<string, { useful: number; notUseful: number }>;
}

export type RecordResult =
  | { ok: true; event: FeedbackEvent }
  | { ok: false; error: "consentimiento_requerido" | "habito_invalido" | "evento_invalido" };

/** Registra retroalimentación explícita. Fail-closed sin consentimiento «mejora». */
export function recordFeedback(
  input: { habitId: string; useful: boolean; reason?: FeedbackReason },
  consent: ConsentState,
  now: string,
): RecordResult {
  if (!hasPurpose(consent, "mejora")) return { ok: false, error: "consentimiento_requerido" };
  const candidate: FeedbackEvent = {
    id: crypto.randomUUID(),
    kind: "suggestion-feedback",
    habitId: input.habitId,
    useful: input.useful,
    reason: input.reason ?? null,
    at: now,
  };
  const valid = validateFeedbackEvent(candidate);
  if (!valid.ok) return { ok: false, error: "evento_invalido" };
  return { ok: true, event: candidate };
}

export type EventValidation = { ok: true; event: FeedbackEvent } | { ok: false; error: string };

/** Auditoría anti-contenido sensible: cualquier campo de texto libre invalida el evento. */
export function validateFeedbackEvent(raw: unknown): EventValidation {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "evento inválido." };
  const r = raw as Record<string, unknown>;
  // Guard explícito: si alguien intenta adjuntar texto libre, el evento se rechaza.
  for (const freeTextKey of ["comment", "text", "message", "note", "details"]) {
    if (freeTextKey in r) {
      return { ok: false, error: `texto libre no permitido («${freeTextKey}»).` };
    }
  }
  if (typeof r.id !== "string" || r.id.length === 0) return { ok: false, error: "id inválido." };
  if (r.kind !== "suggestion-feedback") return { ok: false, error: "kind inválido." };
  if (typeof r.habitId !== "string" || r.habitId.length === 0) {
    return { ok: false, error: "habitId inválido." };
  }
  if (typeof r.useful !== "boolean") return { ok: false, error: "useful debe ser booleano." };
  if (r.reason !== null && !(typeof r.reason === "string" && (FEEDBACK_REASONS as readonly string[]).includes(r.reason))) {
    return { ok: false, error: `reason debe ser null o uno de: ${FEEDBACK_REASONS.join(", ")}.` };
  }
  if (typeof r.at !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(r.at)) {
    return { ok: false, error: "at debe ser fecha ISO." };
  }
  return {
    ok: true,
    event: {
      id: r.id,
      kind: "suggestion-feedback",
      habitId: r.habitId,
      useful: r.useful,
      reason: (r.reason as FeedbackReason | null) ?? null,
      at: r.at,
    },
  };
}

/** Agregación mínima: solo conteos; los eventos individuales no se exponen. */
export function aggregateFeedback(events: ReadonlyArray<FeedbackEvent>): FeedbackAggregate {
  const byReason = Object.fromEntries(FEEDBACK_REASONS.map((r) => [r, 0])) as Record<FeedbackReason, number>;
  const byHabitId: Record<string, { useful: number; notUseful: number }> = {};
  let useful = 0;
  for (const e of events) {
    if (e.useful) useful += 1;
    if (e.reason) byReason[e.reason] += 1;
    const bucket = (byHabitId[e.habitId] ??= { useful: 0, notUseful: 0 });
    if (e.useful) bucket.useful += 1;
    else bucket.notUseful += 1;
  }
  return { total: events.length, useful, notUseful: events.length - useful, byReason, byHabitId };
}

export type LoadResult =
  | { ok: true; events: FeedbackEvent[] }
  | { ok: false; error: "log_corrupto" };

export function loadFeedbackLog(storage: Storage = localStorage): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(FEEDBACK_STORAGE_KEY);
  } catch {
    return { ok: false, error: "log_corrupto" };
  }
  if (raw === null) return { ok: true, events: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "log_corrupto" };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: "log_corrupto" };
  const events: FeedbackEvent[] = [];
  for (const item of parsed) {
    const valid = validateFeedbackEvent(item);
    if (!valid.ok) return { ok: false, error: "log_corrupto" };
    events.push(valid.event);
  }
  return { ok: true, events };
}

export type SaveResult = { ok: true } | { ok: false; error: "almacenamiento_no_disponible" };

export function saveFeedbackLog(
  events: ReadonlyArray<FeedbackEvent>,
  storage: Storage = localStorage,
): SaveResult {
  for (const e of events) {
    if (!validateFeedbackEvent(e).ok) return { ok: false, error: "almacenamiento_no_disponible" };
  }
  try {
    storage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(events));
    return { ok: true };
  } catch {
    return { ok: false, error: "almacenamiento_no_disponible" };
  }
}
