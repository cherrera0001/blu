export type Felt = "better" | "same" | "harder";
export type ReviewDecision = "keep" | "adjust";

export interface WeeklyReview {
  weekKey: string;
  felt?: Felt;
  decision?: ReviewDecision;
  updatedAt: string;
}

export interface ReviewsSnapshot {
  reviews: WeeklyReview[] | null;
  error: string | null;
}

const STORAGE_KEY = "blu.review.v1";
const MAX_REVIEWS = 12;
const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;
const FELTS: Felt[] = ["better", "same", "harder"];
const DECISIONS: ReviewDecision[] = ["keep", "adjust"];

/** Semana ISO 8601 (lunes como inicio) como clave determinística: AAAA-Www. */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // jueves de la semana
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeReview(item: unknown): WeeklyReview {
  if (!isRecord(item) || typeof item.weekKey !== "string" || !WEEK_KEY_RE.test(item.weekKey)) {
    throw new Error("Hay una revisión guardada con formato inválido.");
  }
  if (typeof item.updatedAt !== "string") {
    throw new Error("Hay una revisión guardada con formato inválido.");
  }
  if (item.felt !== undefined && !FELTS.includes(item.felt as Felt)) {
    throw new Error("Hay una revisión con una respuesta de ánimo inválida.");
  }
  if (item.decision !== undefined && !DECISIONS.includes(item.decision as ReviewDecision)) {
    throw new Error("Hay una revisión con una decisión inválida.");
  }
  const review: WeeklyReview = { weekKey: item.weekKey, updatedAt: item.updatedAt };
  if (item.felt !== undefined) review.felt = item.felt as Felt;
  if (item.decision !== undefined) review.decision = item.decision as ReviewDecision;
  return review;
}

export function loadReviews(): ReviewsSnapshot {
  if (typeof window === "undefined") return { reviews: null, error: null };
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { reviews: null, error: "No se pudo acceder al almacenamiento local de este navegador." };
  }
  if (raw === null) return { reviews: null, error: null };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { reviews: null, error: "Las revisiones guardadas no se pueden leer." };
  }
  try {
    if (!Array.isArray(value)) throw new Error("El formato de las revisiones no es válido.");
    return { reviews: value.map(decodeReview), error: null };
  } catch (error) {
    return {
      reviews: null,
      error: error instanceof Error ? error.message : "Las revisiones guardadas no se pueden leer.",
    };
  }
}

export interface ReviewInput {
  weekKey: string;
  felt?: Felt;
  decision?: ReviewDecision;
}

export function saveReview(input: ReviewInput, now: string): { ok: boolean; error: string | null } {
  if (!WEEK_KEY_RE.test(input.weekKey)) {
    return { ok: false, error: "La clave de semana no es válida." };
  }
  const current = loadReviews().reviews ?? [];
  const next: WeeklyReview[] = [
    { weekKey: input.weekKey, felt: input.felt, decision: input.decision, updatedAt: now },
    ...current.filter((review) => review.weekKey !== input.weekKey),
  ].slice(0, MAX_REVIEWS);
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    if (window.localStorage.getItem(STORAGE_KEY) !== raw) {
      throw new Error("El navegador no confirmó el guardado.");
    }
    invalidateReviews();
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error: "El navegador no pudo guardar tu revisión. Revisa el espacio disponible o la configuración de privacidad.",
    };
  }
}

// ---- store con patrón useSyncExternalStore (misma convención que storage.ts) ----

let cached: WeeklyReview[] | null | undefined;
const listeners = new Set<() => void>();

export function getReviewSnapshot(): WeeklyReview[] | null {
  if (typeof window === "undefined") return null;
  if (cached === undefined) {
    cached = loadReviews().reviews;
  }
  return cached;
}

export function getServerReviewSnapshot(): WeeklyReview[] | null {
  return null;
}

export function subscribeReviews(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function invalidateReviews(): void {
  cached = undefined;
  for (const listener of listeners) listener();
}
