import type { BluState } from "./blu";
import { localDateKey } from "./blu";

export interface DayCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface HistorySummary {
  days: DayCount[]; // orden cronológico, más reciente al final
  totalActions: number;
  activeDays: number;
  periodDays: number;
}

/** Resumen descriptivo de los últimos `dayCount` días (incluye hoy). Puro. */
export function summarizeDays(state: BluState, today: Date, dayCount: number): HistorySummary {
  const days: DayCount[] = [];
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = localDateKey(date);
    const count = state.checkInsByDate[key]?.length ?? 0;
    days.push({ date: key, count });
  }
  return {
    days,
    totalActions: days.reduce((n, d) => n + d.count, 0),
    activeDays: days.filter((d) => d.count > 0).length,
    periodDays: dayCount,
  };
}
