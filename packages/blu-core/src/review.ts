/**
 * Revisión semanal (BLU-1202): dominio puro compartido por web y móvil.
 * Una pregunta opcional («¿cómo te sentiste?») y una decisión opcional
 * («mantener» o «ajustar»). Responder nada también es válido.
 */
export type Felt = "better" | "same" | "harder";
export type ReviewDecision = "keep" | "adjust";

export interface WeeklyReview {
  weekKey: string;
  felt?: Felt;
  decision?: ReviewDecision;
  updatedAt: string;
}

export interface ReviewInput {
  weekKey: string;
  felt?: Felt;
  decision?: ReviewDecision;
}

export const MAX_REVIEWS = 12;
export const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;
export const FELTS: Felt[] = ["better", "same", "harder"];
export const DECISIONS: ReviewDecision[] = ["keep", "adjust"];

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

export function decodeReview(item: unknown): WeeklyReview {
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

/** Inserta o reemplaza la revisión de esa semana; conserva las 12 más recientes. */
export function upsertReview(
  current: readonly WeeklyReview[],
  input: ReviewInput,
  now: string,
): WeeklyReview[] {
  if (!WEEK_KEY_RE.test(input.weekKey)) throw new Error("La clave de semana no es válida.");
  const review: WeeklyReview = { weekKey: input.weekKey, updatedAt: now };
  if (input.felt) review.felt = input.felt;
  if (input.decision) review.decision = input.decision;
  return [review, ...current.filter((r) => r.weekKey !== input.weekKey)].slice(0, MAX_REVIEWS);
}

export function reviewForWeek(
  reviews: readonly WeeklyReview[] | undefined,
  today: Date,
): WeeklyReview | null {
  const key = getISOWeekKey(today);
  return reviews?.find((r) => r.weekKey === key) ?? null;
}

/**
 * Se ofrece solo al final de la semana (viernes a domingo) y solo si aún no
 * hubo respuesta (ni siquiera «prefiero no responder»): nunca persigue.
 */
export function reviewDue(reviews: readonly WeeklyReview[] | undefined, today: Date): boolean {
  const day = today.getDay(); // 0 = domingo
  const endOfWeek = day === 5 || day === 6 || day === 0;
  return endOfWeek && reviewForWeek(reviews, today) === null;
}
