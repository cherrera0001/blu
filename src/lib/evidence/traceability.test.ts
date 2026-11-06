import { describe, expect, it } from "vitest";
import { validateEvidenceSource, transition } from "./registry";
import { resolveNoteTrace, type NoteLike } from "./traceability";

function note(overrides: Partial<NoteLike> = {}): NoteLike {
  return {
    id: "n-1",
    title: "Caminar suma",
    text: "Un paseo corto puede ayudarte a despejarte y moverte un poco más.",
    sourceLabel: "Guías de actividad física para adultos (OMS)",
    sourceStatus: "pendiente",
    ...overrides,
  };
}

function approved(id: string, at = "2026-11-06T10:00:00Z") {
  const result = validateEvidenceSource({
    id,
    claim: "Caminata y bienestar.",
    referenceType: "guideline",
    referenceValue: "OMS 2020",
    searchedAt: "2026-11-01",
    studyType: "guía",
    population: "Adultos",
    design: "recomendación de práctica",
    outcomes: "actividad física",
    magnitude: "recomendación cualitativa",
    limitations: "guía general",
    applicabilityCL: "Aplicable",
  });
  if (!result.ok) throw new Error("fixture inválida");
  const moved = transition(result.source, "aprobada", { reviewer: "Dra. Pérez", at });
  if (!moved.ok) throw new Error("no se aprobó");
  return moved.source;
}

describe("resolveNoteTrace — trazabilidad honesta de una nota", () => {
  it("nota pendiente → «sin evidencia verificada», sin fecha de revisión", () => {
    const out = resolveNoteTrace(note(), new Map());
    expect(out.kind).toBe("sin-evidencia-verificada");
    expect(out.reviewedAt).toBeNull();
  });

  it("nota «verificada» SIN respaldo en el registro → se downgrada a «sin evidencia verificada»", () => {
    const out = resolveNoteTrace(note({ sourceStatus: "verificada" }), new Map());
    expect(out.kind).toBe("sin-evidencia-verificada");
  });

  it("nota ligada (evidenceId) a fuente aprobada → cita con fecha y revisor de la revisión", () => {
    const byId = new Map([[ "ev-2026-001", approved("ev-2026-001") ]]);
    const out = resolveNoteTrace(
      note({ sourceStatus: "verificada", evidenceId: "ev-2026-001" }),
      byId,
    );
    expect(out.kind).toBe("verificada");
    if (out.kind === "verificada") {
      expect(out.citation).toContain("OMS 2020");
      expect(out.reviewedAt).toBe("2026-11-06");
      expect(out.reviewer).toBe("Dra. Pérez");
    }
  });

  it("nota ligada a fuente pendiente o retirada → «sin evidencia verificada»", () => {
    const pending = validateEvidenceSource({
      id: "ev-2026-002",
      claim: "x.",
      referenceType: "pmid",
      referenceValue: "38123456",
      searchedAt: "2026-11-01",
      studyType: "cohorte",
      population: "Adultos",
      design: "cohorte",
      outcomes: "x",
      magnitude: "x",
      limitations: "x",
      applicabilityCL: "x",
    });
    if (!pending.ok) throw new Error("fixture inválida");
    const byId = new Map([[ "ev-2026-002", pending.source ]]);
    const out = resolveNoteTrace(note({ evidenceId: "ev-2026-002" }), byId);
    expect(out.kind).toBe("sin-evidencia-verificada");
  });

  it("evidenceId inexistente en el registro → «sin evidencia verificada» (deny-by-default)", () => {
    const out = resolveNoteTrace(note({ evidenceId: "ev-2099-999" }), new Map());
    expect(out.kind).toBe("sin-evidencia-verificada");
  });
});
