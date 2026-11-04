import { describe, expect, it } from "vitest";
import { validateBank } from "./bank";
import bankJson from "@/data/onboarding/bank.json";

const KNOWN_PRINCIPLES = [
  "movement", "nourishment", "rest", "family", "community", "nature", "purpose",
];

type RawPrinciple = { questions: Array<Record<string, unknown>> };
type RawBank = {
  bankVersion: string;
  locale: string;
  disclaimer: string;
  principles: unknown[];
};

function makeQuestion(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    type: "single_choice",
    text: `Pregunta de prueba ${id}`,
    skippable: false,
    options: [
      { value: 0, label: "Nunca" },
      { value: 1, label: "A veces" },
      { value: 2, label: "Siempre" },
    ],
    rationale: "rationale",
    evidence: { reference: "ref", status: "pendiente" },
    ...overrides,
  };
}

function makeBank(): RawBank {
  return {
    bankVersion: "9.9.9-test",
    locale: "es-CL",
    disclaimer: "Test",
    principles: KNOWN_PRINCIPLES.map((pid) => ({
      id: pid,
      title: pid,
      questions: [1, 2, 3, 4, 5].map((n) => makeQuestion(`${pid.slice(0, 3)}-0${n}`)),
    })),
  };
}

function principle(raw: RawBank, index: number): RawPrinciple {
  return raw.principles[index] as RawPrinciple;
}

describe("validateBank — banco real", () => {
  it("acepta el banco empaquetado con 7 principios y al menos 5 preguntas por principio", () => {
    const bank = validateBank(bankJson);
    expect(bank.principles).toHaveLength(7);
    for (const p of bank.principles) {
      expect(p.questions.length).toBeGreaterThanOrEqual(5);
    }
    const total = bank.principles.reduce((n, p) => n + p.questions.length, 0);
    expect(total).toBe(35);
    expect(bank.bankVersion).toBe("1.0.0");
  });

  it("todos los skipIf del banco real referencian preguntas existentes", () => {
    const bank = validateBank(bankJson);
    const ids = new Set(bank.principles.flatMap((p) => p.questions.map((q) => q.id)));
    for (const p of bank.principles) {
      for (const q of p.questions) {
        if (q.skipIf) {
          expect(ids.has(q.skipIf.question)).toBe(true);
        }
      }
    }
  });
});

describe("validateBank — rechazos", () => {
  it("rechaza un principio faltante", () => {
    const raw = makeBank();
    raw.principles = raw.principles.slice(1);
    expect(() => validateBank(raw)).toThrow(/principios/);
  });

  it("rechaza un principio con menos de 5 preguntas", () => {
    const raw = makeBank();
    principle(raw, 0).questions = principle(raw, 0).questions.slice(0, 4);
    expect(() => validateBank(raw)).toThrow(/5 preguntas/);
  });

  it("rechaza IDs de pregunta duplicados", () => {
    const raw = makeBank();
    const p = principle(raw, 0);
    p.questions[1] = makeQuestion(String(p.questions[0].id));
    expect(() => validateBank(raw)).toThrow(/duplicad/);
  });

  it("rechaza skipIf con referencia inexistente", () => {
    const raw = makeBank();
    principle(raw, 0).questions[2] = makeQuestion("mov-x", {
      skipIf: { question: "no-existe", in: [0] },
    });
    expect(() => validateBank(raw)).toThrow(/skipIf/);
  });

  it("rechaza ciclos de skipIf", () => {
    const raw = makeBank();
    const qs = principle(raw, 0).questions;
    qs[0] = makeQuestion("cyc-a", { skipIf: { question: "cyc-b", in: [0] } });
    qs[1] = makeQuestion("cyc-b", { skipIf: { question: "cyc-a", in: [0] } });
    expect(() => validateBank(raw)).toThrow(/ciclo/i);
  });

  it("rechaza preguntas con términos clínicos (FR-010)", () => {
    const raw = makeBank();
    principle(raw, 0).questions[0] = makeQuestion("cli-1", {
      text: "¿Qué medicación tomas para tu enfermedad?",
    });
    expect(() => validateBank(raw)).toThrow(/cl[ií]nic|médic/i);
  });

  it("rechaza likert5 sin anclas", () => {
    const raw = makeBank();
    principle(raw, 0).questions[0] = makeQuestion("lik-1", {
      type: "likert5",
      options: undefined,
      likertAnchors: undefined,
    });
    expect(() => validateBank(raw)).toThrow(/anclas|likert/i);
  });

  it("rechaza opciones con valores duplicados", () => {
    const raw = makeBank();
    principle(raw, 0).questions[0] = makeQuestion("dup-1", {
      options: [
        { value: 0, label: "a" },
        { value: 0, label: "b" },
      ],
    });
    expect(() => validateBank(raw)).toThrow(/valor/i);
  });
});
