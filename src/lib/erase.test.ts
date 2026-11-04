import { beforeEach, describe, expect, it, vi } from "vitest";
import { BLU_STORAGE_KEYS, eraseAllLocalData } from "./erase";
import { getGoalsSnapshot, invalidateGoals } from "./onboarding/goals-storage";

function seedAllKeys() {
  window.localStorage.setItem("blu.local.v1", JSON.stringify({
    consentAcceptedAt: "2026-11-04T10:00:00.000Z",
    consent: { version: "2.0.0", purposes: {}, updatedAt: "" },
    selectedHabitIds: ["movement"],
    checkInsByDate: {},
    adaptations: [],
  }));
  window.localStorage.setItem("blu.onboarding.v1", JSON.stringify({
    bankVersion: "1.0.0", startedAt: "t", updatedAt: "t", status: "in_progress", answers: {},
  }));
  window.localStorage.setItem("blu.goals.v1", JSON.stringify({
    profileComputedAt: null, accepted: [], rejected: [], updatedAt: "",
  }));
  window.localStorage.setItem("blu.review.v1", JSON.stringify([]));
  window.localStorage.setItem("blu.onboarding.notice.v1", JSON.stringify({
    version: "1.0.0", acceptedAt: "2026-11-04T00:00:00.000Z",
  }));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("eraseAllLocalData", () => {
  it("borra y verifica todas las claves de Blu", () => {
    seedAllKeys();
    const result = eraseAllLocalData();
    expect(result.ok).toBe(true);
    expect(result.remaining).toEqual([]);
    for (const key of BLU_STORAGE_KEYS) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
  });

  it("sin datos previos también reporta éxito", () => {
    const result = eraseAllLocalData();
    expect(result.ok).toBe(true);
  });

  it("reporta fallo parcial sin afirmar éxito y lista las claves restantes", () => {
    seedAllKeys();
    const original = window.localStorage.removeItem.bind(window.localStorage);
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key: string) => {
      if (key === "blu.goals.v1") throw new Error("denied");
      return original(key);
    });
    const result = eraseAllLocalData();
    expect(result.ok).toBe(false);
    expect(result.remaining).toContain("blu.goals.v1");
    expect(window.localStorage.getItem("blu.goals.v1")).not.toBeNull();
    // las demás sí se borraron
    expect(window.localStorage.getItem("blu.local.v1")).toBeNull();
    expect(window.localStorage.getItem("blu.review.v1")).toBeNull();
    spy.mockRestore();
  });

  it("invalida el store en memoria de objetivos: tras borrar exitosamente no quedan aceptados en caché", () => {
    seedAllKeys();
    invalidateGoals();
    expect(getGoalsSnapshot()?.accepted).toHaveLength(0);
    window.localStorage.setItem(
      "blu.goals.v1",
      JSON.stringify({
        profileComputedAt: "t",
        accepted: [
          {
            suggestionId: "sug-1",
            principleId: "movement",
            habitId: "movement",
            action: "Caminar cinco minutos.",
            decidedAt: "t",
          },
        ],
        rejected: [],
        updatedAt: "t",
      }),
    );
    invalidateGoals();
    expect(getGoalsSnapshot()?.accepted).toHaveLength(1);

    const result = eraseAllLocalData();
    expect(result.ok).toBe(true);
    // el caché se invalidó: la siguiente lectura sale del almacenamiento (vacío)
    expect(getGoalsSnapshot()).toBeNull();
  });

  it("también invalida el caché de objetivos cuando el borrado es parcial", () => {
    seedAllKeys();
    invalidateGoals();
    window.localStorage.setItem(
      "blu.goals.v1",
      JSON.stringify({
        profileComputedAt: "t",
        accepted: [
          {
            suggestionId: "sug-1",
            principleId: "movement",
            habitId: "movement",
            action: "Caminar cinco minutos.",
            decidedAt: "t",
          },
        ],
        rejected: [],
        updatedAt: "t",
      }),
    );
    invalidateGoals();
    expect(getGoalsSnapshot()?.accepted).toHaveLength(1);

    const original = window.localStorage.removeItem.bind(window.localStorage);
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key: string) => {
      if (key === "blu.goals.v1") throw new Error("denied");
      return original(key);
    });
    const result = eraseAllLocalData();
    spy.mockRestore();
    expect(result.ok).toBe(false);
    expect(result.remaining).toContain("blu.goals.v1");
    // el caché se invalidó igual: se vuelve a leer desde el almacenamiento,
    // donde la clave sobrevivió.
    expect(getGoalsSnapshot()?.accepted).toHaveLength(1);
  });
});
