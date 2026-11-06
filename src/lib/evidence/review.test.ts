import { describe, expect, it } from "vitest";
import { validateEvidenceSource, transition, type EvidenceSource } from "./registry";
import {
  citationFor,
  resolvePublication,
  withdrawWithCascade,
  type Recommendation,
} from "./review";

function approvedSource(overrides: Partial<Record<string, unknown>> = {}): EvidenceSource {
  const result = validateEvidenceSource({
    id: "ev-2026-001",
    claim: "Caminar a paso vivo se asocia con mayor bienestar autoinformado.",
    referenceType: "doi",
    referenceValue: "10.1000/blu.ejemplo",
    searchedAt: "2026-11-06",
    studyType: "RCT",
    population: "Adultos",
    design: "RCT paralelo",
    outcomes: "Bienestar autoinformado",
    magnitude: "DM 0.4",
    limitations: "Muestra pequeña",
    applicabilityCL: "Aplicable",
    ...overrides,
  });
  if (!result.ok) throw new Error("fixture inválida");
  return result.source;
}

function approve(source: EvidenceSource, reviewer = "Dra. Pérez", at = "2026-11-06T10:00:00Z"): EvidenceSource {
  const out = transition(source, "aprobada", { reviewer, at });
  if (!out.ok) throw new Error("no se aprobó");
  return out.source;
}

describe("citationFor — solo evidencia aprobada es citable", () => {
  it("fuente aprobada: referencia con fecha y revisor de la revisión", () => {
    const citation = citationFor(approve(approvedSource()));
    expect(citation).not.toBeNull();
    expect(citation).toContain("10.1000/blu.ejemplo");
    expect(citation).toContain("2026-11-06");
    expect(citation).toContain("Dra. Pérez");
  });

  it("fuente pendiente o retirada: null (deny-by-default)", () => {
    expect(citationFor(approvedSource())).toBeNull();
    const withdrawn = transition(approve(approvedSource()), "retirada", { reviewer: "Dr. Soto" });
    if (!withdrawn.ok) throw new Error("no se retiró");
    expect(citationFor(withdrawn.source)).toBeNull();
  });
});

describe("resolvePublication — recomendación ligada a evidencia", () => {
  const rec: Recommendation = { id: "rec-1", claim: "Da un paseo de 10 minutos.", sourceId: "ev-2026-001" };
  const byId = new Map<string, EvidenceSource>();

  it("fuente aprobada → publicable con cita visible", () => {
    byId.set("ev-2026-001", approve(approvedSource()));
    const out = resolvePublication(rec, byId);
    expect(out.state).toBe("publicable");
    if (out.state === "publicable") expect(out.citation).toContain("10.1000/blu.ejemplo");
  });

  it("fuente pendiente → sin evidencia verificada (no publica cita)", () => {
    byId.set("ev-2026-001", approvedSource());
    const out = resolvePublication(rec, byId);
    expect(out.state).toBe("sin-evidencia-verificada");
  });

  it("fuente retirada → oculta con aviso (en revisión)", () => {
    const withdrawn = transition(approve(approvedSource()), "retirada", { reviewer: "Dr. Soto" });
    if (!withdrawn.ok) throw new Error("no se retiró");
    byId.set("ev-2026-001", withdrawn.source);
    const out = resolvePublication(rec, byId);
    expect(out.state).toBe("en-revision");
  });

  it("fuente inexistente o sin ligar → sin evidencia verificada", () => {
    expect(resolvePublication(rec, new Map()).state).toBe("sin-evidencia-verificada");
    expect(resolvePublication({ ...rec, sourceId: null }, byId).state).toBe("sin-evidencia-verificada");
  });
});

describe("withdrawWithCascade — retiro con cascada explícita", () => {
  const recs: Recommendation[] = [
    { id: "rec-1", claim: "Da un paseo.", sourceId: "ev-2026-001" },
    { id: "rec-2", claim: "Bebe agua.", sourceId: "ev-2026-001" },
    { id: "rec-3", claim: "Otro hábito.", sourceId: "ev-2026-002" },
  ];

  it("retira la fuente y lista las recomendaciones afectadas en revisión", () => {
    const source = approve(approvedSource());
    const out = withdrawWithCascade([source], recs, "ev-2026-001", { reviewer: "Dr. Soto", at: "2026-11-10T09:00:00Z" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.source.status).toBe("retirada");
    const affected = out.affected.map((a) => a.recommendationId).sort();
    expect(affected).toEqual(["rec-1", "rec-2"]);
    for (const a of out.affected) expect(a.to).toBe("en-revision");
    expect(out.affected.find((a) => a.recommendationId === "rec-3")).toBeUndefined();
  });

  it("las recomendaciones afectadas quedan ocultas con aviso al resolver su publicación", () => {
    const source = approve(approvedSource());
    const out = withdrawWithCascade([source], recs, "ev-2026-001", { reviewer: "Dr. Soto" });
    if (!out.ok) throw new Error("no se retiró");
    const byId = new Map([[out.source.id, out.source]]);
    for (const id of ["rec-1", "rec-2"]) {
      const rec = recs.find((r) => r.id === id)!;
      expect(resolvePublication(rec, byId).state).toBe("en-revision");
    }
  });

  it("retirar una fuente pendiente se rechaza (ciclo de vida: solo aprobada → retirada)", () => {
    const out = withdrawWithCascade([approvedSource()], recs, "ev-2026-001", { reviewer: "Dr. Soto" });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/ciclo de vida/i);
  });

  it("transición registrada con fecha y revisor en la fuente", () => {
    const source = approve(approvedSource());
    const out = withdrawWithCascade([source], recs, "ev-2026-001", { reviewer: "Dr. Soto", at: "2026-11-10T09:00:00Z" });
    if (!out.ok) throw new Error("no se retiró");
    const last = out.source.transitionLog.at(-1);
    expect(last).toMatchObject({ from: "aprobada", to: "retirada", by: "Dr. Soto", at: "2026-11-10T09:00:00Z" });
  });
});
