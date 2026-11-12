import { emptyConsent, isConsentState, migrateLegacy, type ConsentState } from "./consent";

export const HABITS = [
  {
    id: "movement",
    title: "Movimiento natural",
    description: "Pequeños momentos de movimiento que encajen en tu día.",
    action: "Elegir una pausa breve para moverte.",
    smallerAction: "Hacer una pausa de dos minutos para cambiar de postura.",
    icon: "↗",
  },
  {
    id: "nourishment",
    title: "Alimentación consciente",
    description: "Prestar atención a una comida, sin reglas rígidas.",
    action: "Hacer una pausa tranquila durante una comida.",
    smallerAction: "Tomar una respiración antes de empezar una comida.",
    icon: "◌",
  },
  {
    id: "rest",
    title: "Descanso y calma",
    description: "Crear un momento amable de pausa o descanso.",
    action: "Reservar un momento breve para bajar el ritmo.",
    smallerAction: "Tomar un minuto de pausa cuando te resulte posible.",
    icon: "☾",
  },
  {
    id: "family",
    title: "Vínculos cercanos",
    description: "Dedicar atención a una relación que te importe.",
    action: "Compartir un momento de atención con alguien cercano.",
    smallerAction: "Enviar un saludo breve a alguien importante para ti.",
    icon: "♡",
  },
  {
    id: "community",
    title: "Comunidad",
    description: "Explorar formas de sentirte parte de un grupo.",
    action: "Pensar en una actividad que te conecte con otras personas.",
    smallerAction: "Anotar una actividad o persona con quien te gustaría conectar.",
    icon: "⌂",
  },
  {
    id: "nature",
    title: "Conexión con el entorno",
    description: "Encontrar una forma posible de estar en contacto con tu entorno.",
    action: "Pasar un momento atento al aire libre o junto a una ventana.",
    smallerAction: "Observar el entorno durante un minuto.",
    icon: "❋",
  },
  {
    id: "purpose",
    title: "Propósito",
    description: "Conectar una acción pequeña con algo que te importa.",
    action: "Dedicar unos minutos a una actividad significativa para ti.",
    smallerAction: "Nombrar una cosa pequeña que hoy te importa.",
    icon: "✳",
  },
] as const;

export type HabitId = (typeof HABITS)[number]["id"];
export type Barrier = "time" | "energy" | "remembering" | "other";

/** Tope de hábitos activos que la persona puede elegir al empezar. */
export const MAX_SELECTED_HABITS = 4;

export interface Adaptation {
  habitId: HabitId;
  from: string;
  to: string;
  barrier: Barrier;
  at: string;
}

export interface BluState {
  consentAcceptedAt: string | null;
  consent: ConsentState;
  selectedHabitIds: HabitId[];
  checkInsByDate: Record<string, HabitId[]>;
  adaptations: Adaptation[];
}

export interface WeeklySummary {
  actionsCompleted: number;
  activeDays: number;
}

const HABIT_IDS = new Set<string>(HABITS.map((habit) => habit.id));
const MAX_SAVED_DAYS = 3660;
const MAX_ADAPTATIONS = 500;

export function createInitialState(): BluState {
  return {
    consentAcceptedAt: null,
    consent: emptyConsent(),
    selectedHabitIds: [],
    checkInsByDate: {},
    adaptations: [],
  };
}

export function decodeState(raw: string | null): BluState {
  if (raw === null) return createInitialState();

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Los datos guardados no se pueden leer.");
  }

  if (!isRecord(value)) throw new Error("El formato de los datos guardados no es válido.");
  const consent = value.consentAcceptedAt;
  const selected = value.selectedHabitIds;
  const checkIns = value.checkInsByDate;
  const adaptations = value.adaptations;

  if (
    (consent !== null && typeof consent !== "string") ||
    !Array.isArray(selected) ||
    selected.length > MAX_SELECTED_HABITS ||
    !selected.every(isHabitId) ||
    new Set(selected).size !== selected.length ||
    !isRecord(checkIns) ||
    Object.keys(checkIns).length > MAX_SAVED_DAYS ||
    !Array.isArray(adaptations) ||
    adaptations.length > MAX_ADAPTATIONS
  ) {
    throw new Error("Los datos guardados no cumplen el formato esperado.");
  }

  const parsedCheckIns: Record<string, HabitId[]> = {};
  for (const [date, ids] of Object.entries(checkIns)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(ids) || !ids.every(isHabitId)) {
      throw new Error("Hay un check-in guardado con formato inválido.");
    }
    parsedCheckIns[date] = [...new Set(ids)];
  }

  const parsedAdaptations = adaptations.map((item): Adaptation => {
    if (
      !isRecord(item) ||
      !isHabitId(item.habitId) ||
      typeof item.from !== "string" ||
      item.from.length > 240 ||
      typeof item.to !== "string" ||
      item.to.length > 240 ||
      typeof item.at !== "string" ||
      !Number.isFinite(Date.parse(item.at)) ||
      !isBarrier(item.barrier)
    ) {
      throw new Error("Hay una adaptación guardada con formato inválido.");
    }
    return {
      habitId: item.habitId,
      from: item.from,
      to: item.to,
      barrier: item.barrier,
      at: item.at,
    };
  });

  return {
    consentAcceptedAt: consent,
    consent: resolveConsent(value.consent, consent),
    selectedHabitIds: [...selected],
    checkInsByDate: parsedCheckIns,
    adaptations: parsedAdaptations,
  };
}

function resolveConsent(raw: unknown, consentAcceptedAt: string | null): ConsentState {
  if (raw === undefined) {
    return migrateLegacy(consentAcceptedAt);
  }
  if (!isConsentState(raw)) {
    throw new Error("El consentimiento guardado no cumple el formato esperado.");
  }
  return raw;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeeklySummary(state: BluState, today: Date): WeeklySummary {
  const dates: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    dates.push(localDateKey(date));
  }

  const actionsCompleted = dates.reduce(
    (total, date) => total + (state.checkInsByDate[date]?.length ?? 0),
    0,
  );
  const activeDays = dates.filter((date) => (state.checkInsByDate[date]?.length ?? 0) > 0).length;
  return { actionsCompleted, activeDays };
}

export function currentAction(state: BluState, habitId: HabitId): string {
  const habit = HABITS.find((item) => item.id === habitId);
  if (!habit) throw new Error("Hábito desconocido.");
  const latest = [...state.adaptations].reverse().find((item) => item.habitId === habitId);
  return latest?.to ?? habit.action;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHabitId(value: unknown): value is HabitId {
  return typeof value === "string" && HABIT_IDS.has(value);
}

export function isBarrier(value: unknown): value is Barrier {
  return value === "time" || value === "energy" || value === "remembering" || value === "other";
}
