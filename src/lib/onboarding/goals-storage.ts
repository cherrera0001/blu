export interface AcceptedGoal {
  suggestionId: string;
  principleId: string;
  habitId: string;
  action: string;
  decidedAt: string;
}

export interface GoalDecisions {
  profileComputedAt: string | null;
  accepted: AcceptedGoal[];
  rejected: string[];
  updatedAt: string;
}

export interface GoalDecisionsSnapshot {
  decisions: GoalDecisions | null;
  error: string | null;
}

const STORAGE_KEY = "blu.goals.v1";

export function emptyDecisions(): GoalDecisions {
  return { profileComputedAt: null, accepted: [], rejected: [], updatedAt: "" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decode(raw: string | null): GoalDecisions {
  if (raw === null) throw new Error("EMPTY");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Las decisiones guardadas no se pueden leer.");
  }
  if (!isRecord(value)) throw new Error("El formato de las decisiones no es válido.");
  if (
    !(value.profileComputedAt === null || typeof value.profileComputedAt === "string") ||
    !Array.isArray(value.accepted) ||
    !Array.isArray(value.rejected) ||
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("El formato de las decisiones no es válido.");
  }
  const accepted: AcceptedGoal[] = value.accepted.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.suggestionId !== "string" ||
      typeof item.principleId !== "string" ||
      typeof item.habitId !== "string" ||
      typeof item.action !== "string" ||
      typeof item.decidedAt !== "string"
    ) {
      throw new Error("Hay un objetivo guardado con formato inválido.");
    }
    return {
      suggestionId: item.suggestionId,
      principleId: item.principleId,
      habitId: item.habitId,
      action: item.action,
      decidedAt: item.decidedAt,
    };
  });
  if (!value.rejected.every((id) => typeof id === "string")) {
    throw new Error("Hay un rechazo guardado con formato inválido.");
  }
  return {
    profileComputedAt: value.profileComputedAt,
    accepted,
    rejected: value.rejected as string[],
    updatedAt: value.updatedAt,
  };
}

export function loadGoalDecisions(): GoalDecisionsSnapshot {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { decisions: null, error: "No se pudo acceder al almacenamiento local de este navegador." };
  }
  if (raw === null) return { decisions: null, error: null };
  try {
    return { decisions: decode(raw), error: null };
  } catch (error) {
    return {
      decisions: null,
      error: error instanceof Error ? error.message : "Las decisiones guardadas no se pueden leer.",
    };
  }
}

export function saveGoalDecisions(decisions: GoalDecisions): { ok: boolean; error: string | null } {
  const raw = JSON.stringify(decisions);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    if (window.localStorage.getItem(STORAGE_KEY) !== raw) {
      throw new Error("El navegador no confirmó el guardado.");
    }
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error: "El navegador no pudo guardar tu decisión. Revisa el espacio disponible o la configuración de privacidad.",
    };
  }
}

export function clearGoalDecisions(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return window.localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}

export interface SuggestionLike {
  id: string;
  principleId: string;
  habitId: string;
  action: string;
}

export function acceptSuggestion(
  suggestion: SuggestionLike,
  profileComputedAt: string,
  now: string,
): GoalDecisions {
  const current = loadGoalDecisions().decisions ?? emptyDecisions();
  const accepted = [
    ...current.accepted.filter((goal) => goal.suggestionId !== suggestion.id),
    {
      suggestionId: suggestion.id,
      principleId: suggestion.principleId,
      habitId: suggestion.habitId,
      action: suggestion.action,
      decidedAt: now,
    },
  ];
  const next: GoalDecisions = {
    profileComputedAt,
    accepted,
    rejected: current.rejected.filter((id) => id !== suggestion.id),
    updatedAt: now,
  };
  saveGoalDecisions(next);
  return next;
}

export function rejectSuggestion(
  decisions: GoalDecisions,
  suggestionId: string,
  profileComputedAt: string,
  now: string,
): GoalDecisions {
  const next: GoalDecisions = {
    profileComputedAt,
    accepted: decisions.accepted.filter((goal) => goal.suggestionId !== suggestionId),
    rejected: decisions.rejected.includes(suggestionId)
      ? decisions.rejected
      : [...decisions.rejected, suggestionId],
    updatedAt: now,
  };
  saveGoalDecisions(next);
  return next;
}
