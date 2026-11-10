import { beforeEach, describe, expect, it } from "vitest";
import { validateBank } from "./bank";
import { answerQuestion, createAssessment } from "./engine";
import { clearOnboarding, loadOnboarding, saveOnboarding } from "./storage";
import bankJson from "@/data/onboarding/bank.json";

const bank = validateBank(bankJson);

beforeEach(() => {
  window.localStorage.clear();
});

describe("onboarding storage", () => {
  it("guarda y recupera un assessment con su bankVersion", () => {
    const a = answerQuestion(bank, createAssessment(bank, "2026-11-04T00:00:00.000Z"), "mov-01", 2);
    const res = saveOnboarding(a);
    expect(res.ok).toBe(true);
    const loaded = loadOnboarding();
    expect(loaded.error).toBeNull();
    expect(loaded.assessment?.answers["mov-01"]).toEqual({ kind: "value", value: 2 });
    expect(loaded.assessment?.bankVersion).toBe("1.0.0");
  });

  it("estado corrupto produce error visible y assessment nulo", () => {
    window.localStorage.setItem("blu.onboarding.v1", "{no-es-json");
    const loaded = loadOnboarding();
    expect(loaded.assessment).toBeNull();
    expect(loaded.error).toMatch(/no se pueden leer/i);
  });

  it("estado con estructura inválida produce error visible", () => {
    window.localStorage.setItem("blu.onboarding.v1", JSON.stringify({ bankVersion: 1, answers: "x" }));
    const loaded = loadOnboarding();
    expect(loaded.assessment).toBeNull();
    expect(loaded.error).toMatch(/formato/i);
  });

  it("clearOnboarding elimina la clave y lo verifica", () => {
    saveOnboarding(createAssessment(bank, "t"));
    expect(clearOnboarding()).toBe(true);
    expect(window.localStorage.getItem("blu.onboarding.v1")).toBeNull();
  });

  it("sin estado guardado carga assessment nulo sin error", () => {
    const loaded = loadOnboarding();
    expect(loaded.assessment).toBeNull();
    expect(loaded.error).toBeNull();
  });
});
