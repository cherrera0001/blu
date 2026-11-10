import { describe, expect, it } from "vitest";
import { validateBank } from "./bank";
import {
  answerQuestion,
  createAssessment,
  getEffectiveQuestions,
  isAssessmentComplete,
  skipQuestion,
  type Assessment,
} from "./engine";
import bankJson from "@/data/onboarding/bank.json";

const bank = validateBank(bankJson);

function answerAll(bankQ: typeof bank, assessment: Assessment): Assessment {
  let a = assessment;
  for (const q of getEffectiveQuestions(bankQ, a)) {
    if (!a.answers[q.id]) {
      a = answerQuestion(bankQ, a, q.id, q.type === "multi_choice" ? [q.options![0].value] : (q.options?.[0].value ?? 0));
    }
  }
  return a;
}

describe("createAssessment", () => {
  it("crea un assessment vacío en progreso con la versión del banco", () => {
    const a = createAssessment(bank, "2026-11-04T00:00:00.000Z");
    expect(a.bankVersion).toBe("1.0.0");
    expect(a.status).toBe("in_progress");
    expect(a.answers).toEqual({});
    expect(a.startedAt).toBe("2026-11-04T00:00:00.000Z");
  });
});

describe("answerQuestion", () => {
  it("registra una respuesta válida y actualiza updatedAt", () => {
    const a = createAssessment(bank, "2026-11-04T00:00:00.000Z");
    const next = answerQuestion(bank, a, "mov-01", 2);
    expect(next.answers["mov-01"]).toEqual({ kind: "value", value: 2 });
    expect(next.updatedAt >= a.updatedAt).toBe(true);
    expect(a.answers["mov-01"]).toBeUndefined(); // inmutable
  });

  it("rechaza un valor fuera de las alternativas", () => {
    const a = createAssessment(bank, "2026-11-04T00:00:00.000Z");
    expect(() => answerQuestion(bank, a, "mov-01", 99)).toThrow(/alternativas/);
  });

  it("rechaza responder una pregunta que el banco omite por regla", () => {
    const a = answerQuestion(bank, createAssessment(bank, "t"), "vin-01", 3);
    expect(() => answerQuestion(bank, a, "vin-04", ["time"])).toThrow(/omitida/);
  });

  it("rechaza array vacío en multi_choice", () => {
    const a = createAssessment(bank, "t");
    expect(() => answerQuestion(bank, a, "mov-03", [])).toThrow(/vací/);
  });

  it("permite corregir una respuesta previa", () => {
    let a = answerQuestion(bank, createAssessment(bank, "t"), "mov-01", 0);
    a = answerQuestion(bank, a, "mov-01", 3);
    expect(a.answers["mov-01"]).toEqual({ kind: "value", value: 3 });
  });
});

describe("skipIf — recorrido efectivo", () => {
  it("omite vin-04 cuando vin-01 = 3 (regla del banco real)", () => {
    const a = answerQuestion(bank, createAssessment(bank, "t"), "vin-01", 3);
    const ids = getEffectiveQuestions(bank, a).map((q) => q.id);
    expect(ids).not.toContain("vin-04");
  });

  it("incluye vin-04 cuando vin-01 ≠ 3", () => {
    const a = answerQuestion(bank, createAssessment(bank, "t"), "vin-01", 1);
    const ids = getEffectiveQuestions(bank, a).map((q) => q.id);
    expect(ids).toContain("vin-04");
  });

  it("una pregunta omitida por regla no se exige para completar", () => {
    const a = answerAll(bank, answerQuestion(bank, createAssessment(bank, "t"), "vin-01", 3));
    expect(isAssessmentComplete(bank, a)).toBe(true);
    expect(a.status).toBe("completed");
  });
});

describe("skipQuestion y completitud", () => {
  it("marcar omitida permite completar sin valor", () => {
    let a = createAssessment(bank, "t");
    for (const q of getEffectiveQuestions(bank, a)) {
      const value = q.type === "likert5" ? 0 : (q.options?.[0].value ?? 0);
      a = q.skippable ? skipQuestion(bank, a, q.id) : answerQuestion(bank, a, q.id, value);
    }
    expect(isAssessmentComplete(bank, a)).toBe(true);
  });

  it("no permite omitir una pregunta no omisible", () => {
    const a = createAssessment(bank, "t");
    expect(() => skipQuestion(bank, a, "mov-01")).toThrow(/omisible/);
  });
});
