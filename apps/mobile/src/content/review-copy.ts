import type { ReviewInput } from "blu-core/review";

/** Respuesta de Blu tras guardar: acompaña, nunca evalúa. */
export function reviewReply(input: Omit<ReviewInput, "weekKey">): string {
  if (!input.felt && !input.decision) return "Está bien. Aquí sigo la próxima semana.";
  const opener =
    input.felt === "harder"
      ? "Gracias por contarlo. Las semanas difíciles también cuentan."
      : input.felt === "better"
        ? "Qué bueno saberlo."
        : "Gracias por contarlo.";
  const next =
    input.decision === "adjust"
      ? " Cuando quieras, toca «Se me hace difícil» en el paso que prefieras. Nada cambia hasta que tú lo elijas."
      : input.decision === "keep"
        ? " Seguimos igual."
        : "";
  return opener + next;
}
