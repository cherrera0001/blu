import type { ReviewInput } from "blu-core/review";
import { esT, type Translate } from "../i18n-core";

/** Respuesta de Blu tras guardar: acompaña, nunca evalúa. */
export function reviewReply(input: Omit<ReviewInput, "weekKey">, t: Translate = esT): string {
  if (!input.felt && !input.decision) return t("Está bien. Aquí sigo la próxima semana.");
  const opener =
    input.felt === "harder"
      ? t("Gracias por contarlo. Las semanas difíciles también cuentan.")
      : input.felt === "better"
        ? t("Qué bueno saberlo.")
        : t("Gracias por contarlo.");
  const next =
    input.decision === "adjust"
      ? t("Cuando quieras, toca «Se me hace difícil» en el paso que prefieras. Nada cambia hasta que tú lo elijas.")
      : input.decision === "keep"
        ? t("Seguimos igual.")
        : "";
  return next ? `${opener} ${next}` : opener;
}
