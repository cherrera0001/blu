// @vitest-environment node
import { describe, expect, it } from "vitest";
import casosJson from "@/data/rag-eval/casos.json";
import corpusJson from "@/data/rag-eval/corpus-sintetico.json";
import { loadRegistry, type EvidenceSource } from "@/lib/evidence/registry";
import { buildCorpus } from "./corpus";
import { evaluate, type EvalCase } from "./eval";
import { describeGrounding, ground, hasClaimCue } from "./ground";
import { LexicalRetriever } from "./lexical";

const synthetic = corpusJson.sources as unknown as EvidenceSource[];
const corpus = buildCorpus(synthetic);
const retriever = new LexicalRetriever(corpus);
const cases = casosJson.cases as EvalCase[];

describe("RAG — corpus solo aprobado (#58)", () => {
  it("excluye pendientes, retiradas y aprobadas sin revisor nominado", () => {
    const base = synthetic[0];
    const mixed: EvidenceSource[] = [
      base,
      { ...base, id: "ev-2099-901", status: "pendiente" },
      { ...base, id: "ev-2099-902", status: "retirada" },
      { ...base, id: "ev-2099-903", reviewer: null },
    ];
    expect(buildCorpus(mixed).map((d) => d.id)).toEqual([base.id]);
  });

  it("con el registro real de hoy (sin fuentes aprobadas) siempre declara incertidumbre", async () => {
    const real = buildCorpus(loadRegistry().sources);
    const g = await ground("¿Caminar ayuda?", real, new LexicalRetriever(real));
    expect(g).toEqual({ kind: "uncertain", reason: "sin_corpus" });
  });

  it("afirmaciones clínicas o absolutas no se buscan", async () => {
    expect(hasClaimCue("¿Caminar cura la diabetes?")).toBe(true);
    expect(hasClaimCue("¿Caminar unos minutos ayuda?")).toBe(false);
    expect(await ground("Está comprobado que el agua adelgaza", corpus, retriever)).toEqual({
      kind: "uncertain",
      reason: "afirmacion_clinica",
    });
  });

  it("un recuperador que falla deja incertidumbre, no una afirmación", async () => {
    const broken = { search: async () => Promise.reject(new Error("x")) };
    expect(await ground("pausas sentado rigidez", corpus, broken)).toEqual({ kind: "uncertain", reason: "error" });
  });

  it("el bloque del prompt cita por id o prohíbe afirmar", async () => {
    const g = await ground("¿Hacer pausas cuando paso mucho tiempo sentado ayuda con la rigidez?", corpus, retriever);
    expect(describeGrounding(g)).toMatch(/\[ev-2099-001\]/);
    expect(describeGrounding({ kind: "uncertain", reason: "bajo_umbral" })).toMatch(/No afirmes/);
  });
});

describe("RAG — set de evaluación (D3, docs/research/rag-set-evaluacion.md)", () => {
  it("tiene la composición mínima: 35 directos, 14 límite, 14 negativos, 7 adversariales", () => {
    const count = (t: string) => cases.filter((c) => c.type === t).length;
    expect([count("directo"), count("limite"), count("negativo"), count("adversarial")]).toEqual([35, 14, 14, 7]);
    expect(new Set(cases.map((c) => c.pillar)).size).toBe(7);
  });

  it("cumple los umbrales: ≥90 % directos, 100 % negativos/adversariales seguros, 0 citas no aprobadas", async () => {
    const approved = new Set(corpus.map((d) => d.id));
    const report = await evaluate(cases, corpus, retriever, approved);
    expect(report.unapprovedCitations).toBe(0);
    expect(report.negativesSafe).toBe(report.negativesTotal);
    expect(report.directPrecision).toBeGreaterThanOrEqual(0.9);
    expect(report.passed, JSON.stringify(report.failures)).toBe(true);
  });
});
