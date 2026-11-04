import type { BluState } from "./blu";
import type { Assessment } from "./onboarding/engine";
import type { GoalDecisions } from "./onboarding/goals-storage";
import type { WeeklyReview } from "./review";

export const EXPORT_FORMAT_VERSION = "1.0.0";

export interface ExportBundle {
  formatVersion: string;
  app: "blu";
  exportedAt: string;
  state: BluState | null;
  onboarding: Assessment | null;
  goals: GoalDecisions | null;
  reviews: WeeklyReview[] | null;
  errors: string[];
}

export interface ExportInputs {
  state: BluState | null;
  onboarding: Assessment | null;
  goals: GoalDecisions | null;
  reviews: WeeklyReview[] | null;
  exportedAt: string;
  errors?: string[];
}

/** Construye el bundle de exportación. Las secciones ilegibles llegan ya como null (FR-003). */
export function buildExportBundle(inputs: ExportInputs): ExportBundle {
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    app: "blu",
    exportedAt: inputs.exportedAt,
    state: inputs.state,
    onboarding: inputs.onboarding,
    goals: inputs.goals,
    reviews: inputs.reviews,
    errors: inputs.errors ?? [],
  };
}

export function exportFileName(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `blu-export-${year}-${month}-${day}.json`;
}

/** Dispara la descarga del bundle en el navegador (FR-002: solo por acción de la persona). */
export function downloadBundle(bundle: ExportBundle, fileName: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
