export const PLAN_STORAGE_KEY = "blu.plan.v1";
export const MAX_INTENTIONS_PER_DAY = 3;

export interface Intention {
  habitId: string;
  action: string;
}

export interface PlanDay {
  dayIndex: number; // 0 = lunes … 6 = domingo
  intentions: Intention[];
}

export interface WeeklyPlan {
  weekKey: string;
  days: PlanDay[];
  updatedAt: string;
}

export interface PlanResult {
  plan: WeeklyPlan;
  error: string | null;
}

export interface PlanSnapshot {
  plan: WeeklyPlan | null;
  error: string | null;
}

export const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function emptyPlan(weekKey: string, now: string): WeeklyPlan {
  return {
    weekKey,
    days: Array.from({ length: 7 }, (_, dayIndex) => ({ dayIndex, intentions: [] })),
    updatedAt: now,
  };
}

/** Reparte cada hábito en 2 días fijos de la semana (determinista, máx 3 por día). */
export function buildDefaultPlan(
  weekKey: string,
  habits: Intention[],
  now: string,
): WeeklyPlan {
  const plan = emptyPlan(weekKey, now);
  const slots = [
    [0, 3],
    [1, 4],
    [2, 5],
    [3, 6],
    [0, 4],
    [1, 5],
    [2, 6],
  ];
  habits.forEach((habit, index) => {
    for (const dayIndex of slots[index % slots.length]) {
      const day = plan.days[dayIndex];
      if (day.intentions.length < MAX_INTENTIONS_PER_DAY) {
        day.intentions.push(habit);
      }
    }
  });
  return plan;
}

/** Añade o quita una intención; nunca supera el máximo ni duplica (FR: sin obligatoriedad). */
export function toggleIntention(
  plan: WeeklyPlan,
  dayIndex: number,
  intention: Intention,
  now: string,
): PlanResult {
  const day = plan.days[dayIndex];
  const exists = day.intentions.some((item) => item.habitId === intention.habitId);
  if (exists) {
    return {
      plan: {
        ...plan,
        days: plan.days.map((d) =>
          d.dayIndex === dayIndex
            ? { ...d, intentions: d.intentions.filter((i) => i.habitId !== intention.habitId) }
            : d,
        ),
        updatedAt: now,
      },
      error: null,
    };
  }
  if (day.intentions.length >= MAX_INTENTIONS_PER_DAY) {
    return {
      plan,
      error: `Máximo ${MAX_INTENTIONS_PER_DAY} intenciones por día. Quitar una para agregar otra.`,
    };
  }
  return {
    plan: {
      ...plan,
      days: plan.days.map((d) =>
        d.dayIndex === dayIndex ? { ...d, intentions: [...d.intentions, intention] } : d,
      ),
      updatedAt: now,
    },
    error: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodePlan(raw: string | null): WeeklyPlan {
  if (raw === null) throw new Error("EMPTY");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("El plan guardado no se puede leer.");
  }
  if (!isRecord(value) || typeof value.weekKey !== "string" || typeof value.updatedAt !== "string") {
    throw new Error("El formato del plan no es válido.");
  }
  if (!Array.isArray(value.days) || value.days.length !== 7) {
    throw new Error("El formato del plan no es válido.");
  }
  const days: PlanDay[] = value.days.map((day, index) => {
    if (!isRecord(day) || day.dayIndex !== index || !Array.isArray(day.intentions)) {
      throw new Error("El formato del plan no es válido.");
    }
    const intentions: Intention[] = day.intentions.map((item) => {
      if (!isRecord(item) || typeof item.habitId !== "string" || typeof item.action !== "string") {
        throw new Error("Hay una intención guardada con formato inválido.");
      }
      return { habitId: item.habitId, action: item.action };
    });
    return { dayIndex: index, intentions };
  });
  return { weekKey: value.weekKey, days, updatedAt: value.updatedAt };
}

export function loadPlan(): PlanSnapshot {
  if (typeof window === "undefined") return { plan: null, error: null };
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
  } catch {
    return { plan: null, error: "No se pudo acceder al almacenamiento local de este navegador." };
  }
  if (raw === null) return { plan: null, error: null };
  try {
    return { plan: decodePlan(raw), error: null };
  } catch (error) {
    return {
      plan: null,
      error: error instanceof Error ? error.message : "El plan guardado no se puede leer.",
    };
  }
}

export function savePlan(plan: WeeklyPlan): { ok: boolean; error: string | null } {
  const raw = JSON.stringify(plan);
  try {
    window.localStorage.setItem(PLAN_STORAGE_KEY, raw);
    if (window.localStorage.getItem(PLAN_STORAGE_KEY) !== raw) {
      throw new Error("El navegador no confirmó el guardado.");
    }
    invalidatePlans();
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error: "El navegador no pudo guardar tu semana. Revisa el espacio disponible o la configuración de privacidad.",
    };
  }
}

// ---- store useSyncExternalStore ----

let cachedPlan: WeeklyPlan | null | undefined;
const planListeners = new Set<() => void>();

export function getPlanSnapshot(): WeeklyPlan | null {
  if (typeof window === "undefined") return null;
  if (cachedPlan === undefined) {
    cachedPlan = loadPlan().plan;
  }
  return cachedPlan;
}

export function getServerPlanSnapshot(): WeeklyPlan | null {
  return null;
}

export function subscribePlans(listener: () => void): () => void {
  planListeners.add(listener);
  return () => {
    planListeners.delete(listener);
  };
}

export function invalidatePlans(): void {
  cachedPlan = undefined;
  for (const listener of planListeners) listener();
}
