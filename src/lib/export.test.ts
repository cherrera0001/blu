import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildExportBundle, downloadBundle, exportFileName } from "./export";
import { createInitialState, decodeState, type BluState } from "./blu";
import { createAssessment, answerQuestion } from "./onboarding/engine";
import { validateBank } from "./onboarding/bank";
import { scoreAssessment } from "./onboarding/scoring";
import { acceptSuggestion, emptyDecisions } from "./onboarding/goals-storage";
import { suggestGoals } from "./onboarding/suggestions";
import bankJson from "@/data/onboarding/bank.json";

const bank = validateBank(bankJson);

function stateWithHabits(): BluState {
  const raw = JSON.stringify({
    ...createInitialState(),
    consentAcceptedAt: "2026-11-04T10:00:00.000Z",
    selectedHabitIds: ["movement", "rest"],
    checkInsByDate: { "2026-11-04": ["movement"] },
    adaptations: [],
  });
  return decodeState(raw);
}

describe("buildExportBundle", () => {
  it("incluye formato, app y todas las categorías (FR-001)", () => {
    const bundle = buildExportBundle({
      state: stateWithHabits(),
      onboarding: null,
      goals: null,
      reviews: null,
      exportedAt: "2026-11-04T12:00:00.000Z",
    });
    expect(bundle.formatVersion).toBe("1.0.0");
    expect(bundle.app).toBe("blu");
    expect(bundle.exportedAt).toBe("2026-11-04T12:00:00.000Z");
    expect(bundle.state?.selectedHabitIds).toEqual(["movement", "rest"]);
    expect(bundle).toHaveProperty("onboarding");
    expect(bundle).toHaveProperty("goals");
    expect(bundle).toHaveProperty("reviews");
  });

  it("estado vacío exporta sin errores (SC-003)", () => {
    const bundle = buildExportBundle({ state: null, onboarding: null, goals: null, reviews: null, exportedAt: "t" });
    expect(bundle.state).toBeNull();
    expect(bundle.errors).toEqual([]);
  });

  it("incluye la revisión semanal como categoría y declara secciones ilegibles en errors", () => {
    const reviews = [
      { weekKey: "2026-W45", felt: "better" as const, decision: "keep" as const, updatedAt: "t" },
    ];
    const complete = buildExportBundle({
      state: stateWithHabits(), onboarding: null, goals: null, reviews, exportedAt: "t",
    });
    expect(complete.reviews).toHaveLength(1);
    expect(complete.errors).toEqual([]);

    const partial = buildExportBundle({
      state: stateWithHabits(), onboarding: null, goals: null, reviews: null, exportedAt: "t",
      errors: ["reviews: Las revisiones guardadas no se pueden leer."],
    });
    expect(partial.reviews).toBeNull();
    expect(partial.errors.join(" ")).toMatch(/reviews/);
  });

  it("incluye onboarding y goals cuando existen", () => {
    const assessment = answerQuestion(bank, createAssessment(bank, "t"), "mov-01", 1);
    const profile = scoreAssessment(bank, assessment);
    const suggestion = suggestGoals(bank, assessment, profile)[0];
    const goals = suggestion
      ? acceptSuggestion(suggestion, profile.computedAt, "2026-11-04T12:00:00.000Z").decisions
      : emptyDecisions();
    const bundle = buildExportBundle({
      state: stateWithHabits(),
      onboarding: assessment,
      goals,
      reviews: null,
      exportedAt: "t",
    });
    expect(bundle.onboarding?.bankVersion).toBe("1.0.0");
    expect(bundle.goals?.accepted.length).toBe(suggestion ? 1 : 0);
  });

  it("no contiene texto del chat (los mensajes nunca se persisten)", () => {
    const bundle = buildExportBundle({ state: stateWithHabits(), onboarding: null, goals: null, reviews: null, exportedAt: "t" });
    expect(JSON.stringify(bundle)).not.toContain("chatMessages");
  });
});

describe("downloadBundle", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("crea un blob y dispara exactamente una descarga (SC-002)", () => {
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");

    const bundle = buildExportBundle({ state: stateWithHabits(), onboarding: null, goals: null, reviews: null, exportedAt: "t" });
    const ok = downloadBundle(bundle, "blu-export-2026-11-04.json");

    expect(ok).toBe(true);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(appendSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
    clickSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe("exportFileName", () => {
  it("incluye la fecha local en formato ISO de día (FR-004)", () => {
    expect(exportFileName(new Date(2026, 10, 4))).toBe("blu-export-2026-11-04.json");
  });
});
