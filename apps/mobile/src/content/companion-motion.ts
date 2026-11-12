import type { CompanionMood } from "blu-core/companion";

/**
 * Reacción de Blu al cambiar de ánimo (H7). Celebra con un gesto breve cuando
 * la persona da un paso; nunca reacciona de forma negativa al desmarcar.
 */
export type CompanionReaction = "hop" | "fade" | null;

const WARMTH: Record<CompanionMood, number> = {
  resting: 0,
  waiting: 0,
  encouraging: 1,
  celebrate: 2,
  thriving: 3,
};

/** Duración total máxima del gesto (ms): presencia, no espectáculo. */
export const HOP_MS = 560;

export function reactionFor(prev: CompanionMood | null, next: CompanionMood): CompanionReaction {
  if (prev === null || prev === next) return null;
  return WARMTH[next] > WARMTH[prev] ? "hop" : "fade";
}
