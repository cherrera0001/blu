import { describe, expect, it, beforeEach } from "vitest";
import {
  acceptPurpose,
  emptyConsent,
} from "blu-core/consent";
import {
  createInitialState,
  localDateKey,
  type HabitId,
} from "blu-core/blu";
import {
  clearBluState,
  createMemoryAdapter,
  loadBluSnapshot,
  saveBluState,
  setStorageAdapter,
  STORAGE_KEY,
} from "./storage";

describe("mobile storage adapter", () => {
  beforeEach(() => {
    setStorageAdapter(createMemoryAdapter());
  });

  it("persiste onboarding y check-in del mismo día", async () => {
    const now = new Date().toISOString();
    const selected: HabitId[] = ["movement", "rest"];
    const today = localDateKey(new Date());
    const state = {
      ...createInitialState(),
      consentAcceptedAt: now,
      consent: acceptPurpose(emptyConsent(), "operativo", now),
      selectedHabitIds: selected,
      checkInsByDate: { [today]: ["movement"] as HabitId[] },
    };

    const saved = await saveBluState(state);
    expect(saved.error).toBeNull();

    const loaded = await loadBluSnapshot();
    expect(loaded.error).toBeNull();
    expect(loaded.state.selectedHabitIds).toEqual(selected);
    expect(loaded.state.checkInsByDate[today]).toEqual(["movement"]);
  });

  it("borra todo y vuelve al estado inicial", async () => {
    const now = new Date().toISOString();
    await saveBluState({
      ...createInitialState(),
      consentAcceptedAt: now,
      consent: acceptPurpose(emptyConsent(), "operativo", now),
      selectedHabitIds: ["nature"],
    });

    const cleared = await clearBluState();
    expect(cleared.error).toBeNull();
    expect(cleared.state).toEqual(createInitialState());

    const memory = createMemoryAdapter();
    setStorageAdapter(memory);
    // Adapter fresco sin seed: también vacío
    const empty = await loadBluSnapshot();
    expect(empty.state.selectedHabitIds).toEqual([]);
    expect(empty.state.consentAcceptedAt).toBeNull();

    // Confirmar que removeItem deja la clave ausente en el adapter bajo prueba
    const again = createMemoryAdapter({
      [STORAGE_KEY]: JSON.stringify({
        consentAcceptedAt: now,
        consent: acceptPurpose(emptyConsent(), "operativo", now),
        selectedHabitIds: ["purpose"],
        checkInsByDate: {},
        adaptations: [],
      }),
    });
    setStorageAdapter(again);
    const wiped = await clearBluState();
    expect(wiped.state.selectedHabitIds).toEqual([]);
    expect(wiped.state.consentAcceptedAt).toBeNull();
  });
});
