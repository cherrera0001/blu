import { describe, expect, it } from "vitest";
import { loadEducation } from "@/lib/habit-education";
import {
  REFERENCE_TYPES,
  importEducationLabels,
  isCitable,
  loadRegistry,
  transition,
  validateEvidenceSource,
  type EvidenceSource,
} from "./registry";

/** Fuente válida completa; los tests la mutan para los casos negativos. */
function validSource(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: "ev-2026-001",
    claim: "Caminar a paso vivo se asocia con mayor bienestar autoinformado en adultos.",
    referenceType: "doi",
    referenceValue: "10.1000/blu.ejemplo",
    searchedAt: "2026-11-06",
    studyType: "RCT",
    population: "Adultos de 40 a 70 años, sedentarios",
    design: "RCT paralelo, caminata 30 min vs. lista de espera, 12 semanas",
    outcomes: "Bienestar autoinformado (escala validada)",
    magnitude: "Diferencia media 0.4 (IC 95 % no calculado en el ejemplo)",
    limitations: "Muestra pequeña, seguimiento corto, sin cegamiento",
    applicabilityCL: "Aplicable a adultos urbanos chilenos sin contraindicación médica",
    ...overrides,
  };
}

describe("validateEvidenceSource — campos obligatorios", () => {
  it("acepta una fuente completa", () => {
    const result = validateEvidenceSource(validSource());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source.status).toBe("pendiente");
      expect(result.source.version).toBe(1);
      expect(result.source.reviewedAt).toBeNull();
      expect(result.source.reviewer).toBeNull();
    }
  });

  it("rechaza una fuente vacía listando TODOS los campos faltantes", () => {
    const result = validateEvidenceSource({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      for (const field of [
        "id", "claim", "referenceType", "referenceValue", "searchedAt",
        "studyType", "population", "design", "outcomes", "magnitude",
        "limitations", "applicabilityCL",
      ]) {
        expect(result.errors.some((e) => e.includes(field))).toBe(true);
      }
    }
  });

  it("exige formato de id ev-AAAA-NNN", () => {
    const bad = validateEvidenceSource(validSource({ id: "fuentecita-1" }));
    expect(bad.ok).toBe(false);
    const good = validateEvidenceSource(validSource({ id: "ev-2026-042" }));
    expect(good.ok).toBe(true);
  });
});

describe("validateEvidenceSource — formato de referencia por tipo", () => {
  it("doi: exige prefijo 10.", () => {
    const bad = validateEvidenceSource(validSource({ referenceValue: "doi:1234" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.some((e) => e.includes("referenceValue"))).toBe(true);
  });

  it("pmid: solo dígitos", () => {
    const bad = validateEvidenceSource(
      validSource({ referenceType: "pmid", referenceValue: "PMID:abc" }),
    );
    expect(bad.ok).toBe(false);
    const good = validateEvidenceSource(
      validSource({ referenceType: "pmid", referenceValue: "38123456" }),
    );
    expect(good.ok).toBe(true);
  });

  it("url: debe ser http(s) resoluble", () => {
    const bad = validateEvidenceSource(
      validSource({ referenceType: "url", referenceValue: "ftp://archivo" }),
    );
    expect(bad.ok).toBe(false);
    const good = validateEvidenceSource(
      validSource({ referenceType: "url", referenceValue: "https://ejemplo.org/estudio" }),
    );
    expect(good.ok).toBe(true);
  });

  it("guideline: exige organismo y año", () => {
    const bad = validateEvidenceSource(
      validSource({ referenceType: "guideline", referenceValue: "OMS" }),
    );
    expect(bad.ok).toBe(false);
    const good = validateEvidenceSource(
      validSource({ referenceType: "guideline", referenceValue: "OMS 2020" }),
    );
    expect(good.ok).toBe(true);
  });

  it("referenceType desconocido se rechaza", () => {
    const result = validateEvidenceSource(validSource({ referenceType: "libro" }));
    expect(result.ok).toBe(false);
  });
});

describe("transition — ciclo de vida pendiente → aprobada → retirada", () => {
  const registered = (): EvidenceSource => {
    const result = validateEvidenceSource(validSource());
    if (!result.ok) throw new Error("fixture inválida");
    return result.source;
  };

  it("pendiente → aprobada registra fecha y revisor", () => {
    const out = transition(registered(), "aprobada", { reviewer: "Dra. Pérez", at: "2026-11-06T10:00:00Z" });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.source.status).toBe("aprobada");
      expect(out.source.reviewedAt).toBe("2026-11-06T10:00:00Z");
      expect(out.source.reviewer).toBe("Dra. Pérez");
      expect(out.source.transitionLog).toHaveLength(1);
      expect(out.source.transitionLog[0]).toMatchObject({ from: "pendiente", to: "aprobada", by: "Dra. Pérez" });
    }
  });

  it("aprobar sin revisor nominado se rechaza (campos de revisión incompletos)", () => {
    const out = transition(registered(), "aprobada", { reviewer: "  " });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/revisor/i);
  });

  it("aprobada → retirada registra la transición y conserva el historial", () => {
    const approved = transition(registered(), "aprobada", { reviewer: "Dra. Pérez", at: "2026-11-06T10:00:00Z" });
    if (!approved.ok) throw new Error("no se aprobó");
    const out = transition(approved.source, "retirada", { reviewer: "Dr. Soto", at: "2026-11-10T09:00:00Z" });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.source.status).toBe("retirada");
      expect(out.source.transitionLog).toHaveLength(2);
      expect(out.source.transitionLog[1]).toMatchObject({ from: "aprobada", to: "retirada", by: "Dr. Soto" });
    }
  });

  it("transiciones inválidas se rechazan: retirada→aprobada y aprobada→pendiente", () => {
    const approved = transition(registered(), "aprobada", { reviewer: "Dra. Pérez" });
    if (!approved.ok) throw new Error("no se aprobó");
    const withdrawn = transition(approved.source, "retirada", { reviewer: "Dr. Soto" });
    if (!withdrawn.ok) throw new Error("no se retiró");
    expect(transition(withdrawn.source, "aprobada", { reviewer: "Dra. Pérez" }).ok).toBe(false);
    expect(transition(approved.source, "pendiente", { reviewer: "Dra. Pérez" }).ok).toBe(false);
  });

  it("no muta la fuente original (inmutable)", () => {
    const original = registered();
    transition(original, "aprobada", { reviewer: "Dra. Pérez" });
    expect(original.status).toBe("pendiente");
  });
});

describe("isCitable — deny-by-default", () => {
  it("solo aprobada es citable; pendiente y retirada no", () => {
    const base = validateEvidenceSource(validSource());
    if (!base.ok) throw new Error("fixture inválida");
    expect(isCitable(base.source)).toBe(false);
    const approved = transition(base.source, "aprobada", { reviewer: "Dra. Pérez" });
    if (!approved.ok) throw new Error("no se aprobó");
    expect(isCitable(approved.source)).toBe(true);
    const withdrawn = transition(approved.source, "retirada", { reviewer: "Dr. Soto" });
    if (!withdrawn.ok) throw new Error("no se retiró");
    expect(isCitable(withdrawn.source)).toBe(false);
  });
});

describe("importEducationLabels — importación en lote con reporte", () => {
  it("genera un borrador por sourceLabel único y reporta que ninguno es registrable aún", () => {
    const education = loadEducation();
    const report = importEducationLabels(education);
    const labels = new Set(
      education.principles.flatMap((p) => p.notes.map((n) => n.sourceLabel)),
    );
    expect(report.drafts).toHaveLength(labels.size);
    expect(report.drafts.length).toBeGreaterThanOrEqual(10);
    // Ningún borrador es registrable: las etiquetas no son referencias persistentes.
    expect(report.registrable).toHaveLength(0);
    expect(report.pendingReference).toHaveLength(labels.size);
    // Cada borrador expone los campos que le faltan para registrarse.
    for (const draft of report.drafts) {
      expect(draft.errors.some((e) => e.includes("referenceValue"))).toBe(true);
    }
  });

  it("los ids de borrador son secuenciales ev-AAAA-NNN sin duplicados", () => {
    const report = importEducationLabels(loadEducation());
    const ids = report.drafts.map((d) => d.draft.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^ev-\d{4}-\d{3}$/);
  });
});

describe("loadRegistry — datos versionados", () => {
  it("carga el registro empaquetado vacío (deny-by-default desde el día 1)", () => {
    const registry = loadRegistry();
    expect(registry.registryVersion).toBe("1");
    expect(registry.sources).toEqual([]);
  });
});

describe("REFERENCE_TYPES", () => {
  it("fija los cuatro tipos del spec", () => {
    expect(REFERENCE_TYPES).toEqual(["doi", "pmid", "url", "guideline"]);
  });
});
