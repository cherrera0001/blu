import { describe, expect, it } from "vitest";
import { buildResearchDataset } from "./export";
import {
  runAnalysis,
  syntheticPilotDataset,
  wilsonInterval,
} from "./pipeline";

describe("wilsonInterval — IC 95 % reproducible y determinista", () => {
  it("coincide con valores de referencia", () => {
    // 20/40 = 0.5 → Wilson ≈ [0.352, 0.648]
    const [lo, hi] = wilsonInterval(20, 40);
    expect(lo).toBeCloseTo(0.3522, 3);
    expect(hi).toBeCloseTo(0.6478, 3);
  });

  it("extremos: 0/10 y 10/10 no colapsan a punto", () => {
    const [lo0, hi0] = wilsonInterval(0, 10);
    expect(lo0).toBe(0);
    expect(hi0).toBeGreaterThan(0);
    const [lo1, hi1] = wilsonInterval(10, 10);
    expect(hi1).toBe(1);
    expect(lo1).toBeLessThan(1);
  });

  it("es determinista: mismos datos, mismos números", () => {
    expect(wilsonInterval(7, 21)).toEqual(wilsonInterval(7, 21));
  });
});

describe("runAnalysis — pipeline prespecificable y reproducible", () => {
  it("produce tablas deterministas desde el dataset sintético", () => {
    const dataset = syntheticPilotDataset();
    const a1 = runAnalysis(dataset);
    const a2 = runAnalysis(dataset);
    expect(a1.schemaVersion).toBe("1");
    expect(a1.overall).toEqual(a2.overall);
    expect(a1.adherenceByWeek).toEqual(a2.adherenceByWeek);
    expect(a1.adherenceByHabit).toEqual(a2.adherenceByHabit);
    expect(a1.toMarkdown()).toBe(a2.toMarkdown());
    expect(a1.overall.adherence).toBeCloseTo(
      Math.round((a1.overall.checkInsDone / a1.overall.checkInsTotal) * 10_000) / 10_000,
      6,
    );
    expect(a1.overall.adherenceLo).toBeLessThan(a1.overall.adherence!);
    expect(a1.overall.adherenceHi).toBeGreaterThan(a1.overall.adherence!);
  });

  it("incluye adherencia por semana y por hábito (tablas del informe)", () => {
    const analysis = runAnalysis(syntheticPilotDataset());
    for (const row of analysis.adherenceByWeek) {
      expect(row.week).toMatch(/^\d{4}-W\d{2}$/);
      expect(row.adherence).toBeGreaterThanOrEqual(0);
      expect(row.adherence).toBeLessThanOrEqual(1);
    }
    for (const row of analysis.adherenceByHabit) {
      expect(row.habitId).toBeTruthy();
      expect(row.participants).toBeGreaterThanOrEqual(datasetK());
    }
  });

  it("la tendencia de participación por semana es visible (retención descriptiva)", () => {
    const analysis = runAnalysis(syntheticPilotDataset());
    expect(analysis.participantsByWeek.length).toBeGreaterThanOrEqual(2);
  });

  it("renderReport genera markdown estable con las secciones prespecificadas", () => {
    const analysis = runAnalysis(syntheticPilotDataset());
    const md = analysis.toMarkdown();
    expect(md).toContain("# Informe descriptivo del piloto");
    expect(md).toContain("## Adherencia por semana");
    expect(md).toContain("## Adherencia por hábito");
    expect(md).toContain("## Participación por semana");
    expect(md).toContain("k-anonimato");
    expect(md).not.toContain("participantKey");
    expect(md).toContain(String(analysis.overall.k));
  });

  it("dataset vacío (todo suprimido) produce análisis vacío honesto, no NaN", () => {
    const empty = buildResearchDataset([], () => true, { generatedAt: "t" });
    const analysis = runAnalysis(empty);
    expect(analysis.overall.checkInsTotal).toBe(0);
    expect(analysis.overall.adherence).toBeNull();
    expect(analysis.toMarkdown()).toContain("sin datos suficientes");
  });
});

function datasetK(): number {
  return syntheticPilotDataset().k;
}
