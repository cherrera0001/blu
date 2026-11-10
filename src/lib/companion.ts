import { localDateKey, type BluState } from "./blu";

export const COMPANION_MOODS = ["waiting", "encouraging", "celebrate", "thriving", "resting"] as const;
export type CompanionMood = (typeof COMPANION_MOODS)[number];
export type CompanionPose = "newspaper" | "builder";

export interface CompanionView {
  mood: CompanionMood;
  pose: CompanionPose;
  /** Frase en castellano. La interfaz la pasa por `translate`. */
  line: string;
  recentActiveDays: number;
  daysSinceLast: number | null;
}

const LINES: Record<CompanionMood, string> = {
  waiting: "Blu te espera, sin prisa.",
  encouraging: "Blu se anima: ya diste un paso.",
  celebrate: "Blu celebra contigo. Hoy hubo espacio.",
  thriving: "Blu está contento de acompañarte estos días.",
  resting: "Blu descansa a tu lado. Un paso basta cuando quieras.",
};

function shiftDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Ánimo de Blu a partir de check-ins reales. No infiere salud ni culpa:
 * celebra el paso de hoy, acompaña el silencio y cambia de pose.
 */
export function readCompanion(state: BluState, today: Date): CompanionView {
  const todayKey = localDateKey(today);
  const selected = state.selectedHabitIds;
  const todayDone = selected.filter((id) => state.checkInsByDate[todayKey]?.includes(id)).length;

  let recentActiveDays = 0;
  let daysSinceLast: number | null = null;
  for (let offset = 0; offset < 7; offset += 1) {
    const key = localDateKey(shiftDate(today, -offset));
    const marked = state.checkInsByDate[key] ?? [];
    if (selected.some((id) => marked.includes(id))) {
      recentActiveDays += 1;
      if (daysSinceLast === null) daysSinceLast = offset;
    }
  }
  if (daysSinceLast === null) {
    for (const key of Object.keys(state.checkInsByDate)) {
      const marked = state.checkInsByDate[key] ?? [];
      if (!selected.some((id) => marked.includes(id))) continue;
      const [year, month, day] = key.split("-").map(Number);
      const then = new Date(year, month - 1, day);
      const diff = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - then.getTime()) / 86_400_000);
      if (diff >= 0 && (daysSinceLast === null || diff < daysSinceLast)) daysSinceLast = diff;
    }
  }

  let mood: CompanionMood;
  if (selected.length === 0 || todayDone === 0) {
    mood = daysSinceLast !== null && daysSinceLast >= 2 ? "resting" : "waiting";
  } else if (todayDone === selected.length && recentActiveDays >= 3) {
    mood = "thriving";
  } else if (todayDone === selected.length) {
    mood = "celebrate";
  } else {
    mood = "encouraging";
  }

  const pose: CompanionPose = mood === "celebrate" || mood === "thriving" ? "builder" : "newspaper";
  return { mood, pose, line: LINES[mood], recentActiveDays, daysSinceLast };
}
