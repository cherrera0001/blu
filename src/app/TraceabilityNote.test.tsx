import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  injectRegistryForTests,
  validateEvidenceSource,
  transition,
  type EvidenceSource,
} from "@/lib/evidence/registry";
import { TraceabilityNote } from "./TraceabilityNote";
import type { EducationNote } from "@/lib/habit-education";

function note(overrides: Partial<EducationNote> = {}): EducationNote {
  return {
    id: "n-1",
    title: "Caminar suma",
    text: "Un paseo corto puede ayudarte a despejarte y moverte un poco más.",
    sourceLabel: "Guías de actividad física para adultos (OMS)",
    sourceStatus: "pendiente",
    ...overrides,
  };
}

function approvedSource(): EvidenceSource {
  const result = validateEvidenceSource({
    id: "ev-2026-001",
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
  const moved = transition(result.source, "aprobada", { reviewer: "Dra. Pérez", at: "2026-11-06T10:00:00Z" });
  if (!moved.ok) throw new Error("no se aprobó");
  return moved.source;
}

describe("TraceabilityNote — trazabilidad visible (BLU-1304)", () => {
  it("nota sin respaldo en el registro muestra «sin evidencia verificada»", () => {
    render(<TraceabilityNote note={note({ sourceStatus: "verificada" })} />);
    expect(screen.getByText(/sin evidencia verificada/i)).toBeTruthy();
    expect(screen.queryByText(/verificada el/)).toBeNull();
  });

  it("muestra la fuente y la fecha de revisión cuando el registro respalda la nota", () => {
    injectRegistryForTests({ registryVersion: "1", sources: [approvedSource()] });
    render(<TraceabilityNote note={note({ sourceStatus: "verificada", evidenceId: "ev-2026-001" })} />);
    expect(screen.getByText(/verificada el 2026-11-06 por Dra\. Pérez/)).toBeTruthy();
    expect(screen.getAllByText(/Guías de actividad física/).length).toBeGreaterThan(0);
    injectRegistryForTests(null);
  });
});
