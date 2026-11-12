import type { BluState } from "blu-core/blu";
import type { WeeklyReview } from "blu-core/review";

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
export function exportMessage(bundle: MobileExportBundle): string {
  return `Mis datos de Blu (${bundle.exportedAt.slice(0, 10)})\n\n${JSON.stringify(bundle, null, 2)}`;
}

/** Resumen llano de lo que Blu guarda en el teléfono. */
export function storedSummary(state: BluState): string[] {
  const days = Object.keys(state.checkInsByDate).length;
  return [
    `Temas elegidos: ${state.selectedHabitIds.length}`,
    `Días con alguna marca: ${days}`,
    `Ajustes a pasos más pequeños: ${state.adaptations.length}`,
    `Revisiones semanales: ${state.weeklyReviews?.length ?? 0}`,
    `Voz: ${state.voicePreference === "device" ? "solo la del teléfono" : "natural (servidor de Blu)"}`,
    "Las conversaciones con Blu no se guardan.",
  ];
}
