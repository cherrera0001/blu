import {
  decodeReview,
  upsertReview,
  WEEK_KEY_RE,
  type ReviewInput,
  type WeeklyReview,
} from "blu-core/review";

// Dominio compartido con móvil en blu-core/review; aquí solo vive el adaptador
// de almacenamiento del navegador.
export {
  getISOWeekKey,
  type Felt,
  type ReviewDecision,
  type ReviewInput,
  type WeeklyReview,
} from "blu-core/review";

export interface ReviewsSnapshot {
  reviews: WeeklyReview[] | null;
  error: string | null;
}

const STORAGE_KEY = "blu.review.v1";

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

export function saveReview(input: ReviewInput, now: string): { ok: boolean; error: string | null } {
  if (!WEEK_KEY_RE.test(input.weekKey)) {
    return { ok: false, error: "La clave de semana no es válida." };
  }
  const current = loadReviews().reviews ?? [];
  const next = upsertReview(current, input, now);
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

let cached: ReviewsSnapshot | undefined;
const serverSnapshot: ReviewsSnapshot = { reviews: null, error: null };
const listeners = new Set<() => void>();

export function getReviewSnapshot(): ReviewsSnapshot {
  if (typeof window === "undefined") return { reviews: null, error: null };
  if (cached === undefined) {
    cached = loadReviews();
  }
  return cached;
}

export function getServerReviewSnapshot(): ReviewsSnapshot {
  return serverSnapshot;
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
