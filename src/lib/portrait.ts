import type { BluState, HabitId } from "./blu";
import { localDateKey } from "./blu";

export const PORTRAIT_STORAGE_KEY = "blu.portrait.v1";
export const PORTRAIT_WINDOW_DAYS = 14;
export const DECLARED_LEVELS = ["cuesta", "medias", "sostengo"] as const;
export type DeclaredLevel = (typeof DECLARED_LEVELS)[number];

export const DECLARED_LABELS: Record<DeclaredLevel, string> = {
  cuesta: "Me cuesta",
  medias: "Voy a medias",
  sostengo: "Ya lo cuido",
};

export interface Portrait {
  version: 1;
  declaredAt: string;
  levels: Partial<Record<HabitId, DeclaredLevel>>;
}

export interface RefinedHabit {
  habitId: HabitId;
  declared: DeclaredLevel | null;
  marks: number;
  line: string;
}

export interface RefinedPortrait {
  windowDays: number;
  habits: RefinedHabit[];
  observedDays: number;
}

function isLevel(value: unknown): value is DeclaredLevel {
  return typeof value === "string" && (DECLARED_LEVELS as readonly string[]).includes(value);
}

export function parsePortrait(raw: unknown): Portrait | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as { version?: unknown; declaredAt?: unknown; levels?: unknown };
  if (record.version !== 1 || typeof record.declaredAt !== "string") return null;
  if (!Number.isFinite(Date.parse(record.declaredAt))) return null;
  if (typeof record.levels !== "object" || record.levels === null || Array.isArray(record.levels)) return null;
  const levels: Portrait["levels"] = {};
  for (const [key, value] of Object.entries(record.levels)) {
    if (!isLevel(value)) return null;
    levels[key as HabitId] = value;
  }
  return { version: 1, declaredAt: record.declaredAt, levels };
}

export function loadPortrait(): Portrait | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PORTRAIT_STORAGE_KEY);
    if (!raw) return null;
    return parsePortrait(JSON.parse(raw));
  } catch {
    return null;
  }
}

const portraitListeners = new Set<() => void>();
let portraitCache: Portrait | null | undefined;

function notifyPortrait(): void {
  for (const listener of portraitListeners) listener();
}

export function subscribePortrait(onStoreChange: () => void): () => void {
  portraitListeners.add(onStoreChange);
  return () => portraitListeners.delete(onStoreChange);
}

export function getPortraitSnapshot(): Portrait | null {
  if (typeof window === "undefined") return null;
  if (portraitCache === undefined) portraitCache = loadPortrait();
  return portraitCache;
}

export function getServerPortraitSnapshot(): Portrait | null {
  return null;
}

export function invalidatePortrait(): void {
  portraitCache = typeof window === "undefined" ? null : loadPortrait();
  notifyPortrait();
}

export function savePortrait(portrait: Portrait): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(PORTRAIT_STORAGE_KEY, JSON.stringify(portrait));
    const ok = window.localStorage.getItem(PORTRAIT_STORAGE_KEY) !== null;
    if (ok) {
      portraitCache = portrait;
      notifyPortrait();
    }
    return ok;
  } catch {
    return false;
  }
}

function shiftDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function refinementLine(declared: DeclaredLevel | null, marks: number, windowDays: number): string {
  if (!declared) return "Aún no hay una evaluación inicial de este hábito.";
  const label = DECLARED_LABELS[declared];
  if (marks === 0) {
    return `Declaraste «${label}». Todavía no hay práctica registrada: el retrato se afina cuando marques un paso.`;
  }
  const times = marks === 1 ? "vez" : "veces";
  return `Declaraste «${label}». En ${windowDays} días lo marcaste ${marks} ${times}. Eso actualiza el punto de partida, sin convertirlo en una nota.`;
}

/**
 * Cruza la declaración inicial con los check-ins de la ventana reciente.
 * No fabrica un puntaje: describe lo declarado y lo observado.
 */
export function refinePortrait(portrait: Portrait | null, state: BluState, today: Date): RefinedPortrait {
  const keys: string[] = [];
  for (let offset = 0; offset < PORTRAIT_WINDOW_DAYS; offset += 1) {
    keys.push(localDateKey(shiftDate(today, -offset)));
  }
  const active = new Set<string>();
  const habits = state.selectedHabitIds.map((habitId) => {
    const declared = portrait?.levels[habitId] ?? null;
    let marks = 0;
    for (const key of keys) {
      if (state.checkInsByDate[key]?.includes(habitId)) {
        marks += 1;
        active.add(key);
      }
    }
    return {
      habitId,
      declared,
      marks,
      line: refinementLine(declared, marks, PORTRAIT_WINDOW_DAYS),
    };
  });
  return { windowDays: PORTRAIT_WINDOW_DAYS, habits, observedDays: active.size };
}
