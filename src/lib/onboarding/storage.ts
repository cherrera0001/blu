import type { Assessment, QuestionAnswer } from "./engine";

const STORAGE_KEY = "blu.onboarding.v1";

export interface OnboardingSnapshot {
  assessment: Assessment | null;
  error: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeAssessment(raw: string | null): Assessment {
  if (raw === null) {
    throw new Error("EMPTY");
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Los datos guardados del cuestionario no se pueden leer.");
  }
  if (!isRecord(value) || typeof value.bankVersion !== "string" || typeof value.startedAt !== "string") {
    throw new Error("El formato de los datos del cuestionario no es válido.");
  }
  if (
    (value.status !== "in_progress" && value.status !== "completed") ||
    !isRecord(value.answers)
  ) {
    throw new Error("El formato de los datos del cuestionario no es válido.");
  }
  const answers: Record<string, QuestionAnswer> = {};
  for (const [qid, answer] of Object.entries(value.answers)) {
    if (!isRecord(answer) || (answer.kind !== "value" && answer.kind !== "skipped")) {
      throw new Error("Hay una respuesta guardada con formato inválido.");
    }
    answers[qid] =
      answer.kind === "skipped"
        ? { kind: "skipped" }
        : { kind: "value", value: answer.value as number | string | Array<number | string> };
  }
  return {
    bankVersion: value.bankVersion,
    startedAt: value.startedAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : value.startedAt,
    status: value.status,
    answers,
  };
}

export function loadOnboarding(): OnboardingSnapshot {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { assessment: null, error: "No se pudo acceder al almacenamiento local de este navegador." };
  }
  if (raw === null) return { assessment: null, error: null };
  try {
    return { assessment: decodeAssessment(raw), error: null };
  } catch (error) {
    return {
      assessment: null,
      error: error instanceof Error ? error.message : "Los datos guardados del cuestionario no se pueden leer.",
    };
  }
}

export function saveOnboarding(assessment: Assessment): { ok: boolean; error: string | null } {
  const raw = JSON.stringify(assessment);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    if (window.localStorage.getItem(STORAGE_KEY) !== raw) {
      throw new Error("El navegador no confirmó el guardado.");
    }
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error: "El navegador no pudo guardar tu avance. Revisa el espacio disponible o la configuración de privacidad.",
    };
  }
}

export function clearOnboarding(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return window.localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}
