import type { BluState } from "blu-core/blu";
import type { WeeklyReview } from "blu-core/review";
import { esT, type Translate } from "./i18n-core";

/**
 * Exportar mis datos (paridad web specs/005). Mismo formato que la web
 * (formatVersion 1.0.0) para que una persona pueda llevar sus datos entre ambas.
 * Las secciones que el teléfono no tiene viajan como null.
 */
export const EXPORT_FORMAT_VERSION = "1.0.0";

export interface MobileExportBundle {
  formatVersion: string;
  app: "blu";
  exportedAt: string;
  state: BluState;
  onboarding: null;
  goals: null;
  reviews: WeeklyReview[] | null;
  errors: string[];
}

export function buildMobileExport(state: BluState, now: Date): MobileExportBundle {
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    app: "blu",
    exportedAt: now.toISOString(),
    state,
    onboarding: null,
    goals: null,
    reviews: state.weeklyReviews ?? null,
    errors: [],
  };
}

/** Texto legible antes del JSON: quien lo reciba sabe qué es. */
export function exportMessage(bundle: MobileExportBundle, t: Translate = esT): string {
  const title = t("Mis datos de Blu ({date})", { date: bundle.exportedAt.slice(0, 10) });
  return `${title}\n\n${JSON.stringify(bundle, null, 2)}`;
}

/** Resumen llano de lo que Blu guarda en el teléfono. */
export function storedSummary(state: BluState, t: Translate = esT): string[] {
  const days = Object.keys(state.checkInsByDate).length;
  return [
    t("Temas elegidos: {n}", { n: state.selectedHabitIds.length }),
    t("Días con alguna marca: {n}", { n: days }),
    t("Ajustes a pasos más pequeños: {n}", { n: state.adaptations.length }),
    t("Revisiones semanales: {n}", { n: state.weeklyReviews?.length ?? 0 }),
    state.voicePreference === "device"
      ? t("Voz: solo la del teléfono")
      : t("Voz: natural (servidor de Blu)"),
    state.reminder?.enabled
      ? t("Recordatorio: activado a las {hour}:00", { hour: state.reminder.hour })
      : t("Recordatorio: apagado"),
    t("Las conversaciones con Blu no se guardan."),
  ];
}
