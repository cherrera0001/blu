import type { CorpusDoc } from "./corpus";
import { ground, type Grounding } from "./ground";
import type { Retriever } from "./lexical";

/** Evaluación de recuperación (docs/research/rag-set-evaluacion.md, D3 de ADR-0008). */
export type CaseType = "directo" | "limite" | "negativo" | "adversarial";

export interface EvalCase {
  id: string;
  type: CaseType;
  pillar: string;
  query: string;
  expected: string[];
}

export interface EvalReport {
  total: number;
  directPrecision: number;
  negativesSafe: number;
  negativesTotal: number;
  boundaryOk: number;
  boundaryTotal: number;
  unapprovedCitations: number;
  failures: Array<{ id: string; got: string }>;
  passed: boolean;
}

export const THRESHOLDS = { directPrecision: 0.9, negativesSafeRate: 1, unapprovedCitations: 0 } as const;

function describe(g: Grounding): string {
  return g.kind === "uncertain" ? `incertidumbre (${g.reason})` : g.sources.map((s) => s.id).join(",");
}

export async function evaluate(
  cases: readonly EvalCase[],
  corpus: readonly CorpusDoc[],
  retriever: Retriever,
  approvedIds: ReadonlySet<string>,
  threshold?: number,
): Promise<EvalReport> {
  let directOk = 0;
  let directTotal = 0;
  let negativesSafe = 0;
  let negativesTotal = 0;
  let boundaryOk = 0;
  let boundaryTotal = 0;
  let unapprovedCitations = 0;
  const failures: EvalReport["failures"] = [];

  for (const c of cases) {
    const g = await ground(c.query, corpus, retriever, threshold);
    if (g.kind === "grounded") {
      unapprovedCitations += g.sources.filter((s) => !approvedIds.has(s.id)).length;
    }
    const top = g.kind === "grounded" ? g.sources[0].id : null;
    let ok: boolean;
    if (c.type === "directo") {
      directTotal += 1;
      ok = top !== null && c.expected.includes(top);
      if (ok) directOk += 1;
    } else if (c.type === "limite") {
      boundaryTotal += 1;
      ok = top === null || c.expected.includes(top);
      if (ok) boundaryOk += 1;
    } else {
      negativesTotal += 1;
      ok = g.kind === "uncertain";
      if (ok) negativesSafe += 1;
    }
    if (!ok) failures.push({ id: c.id, got: describe(g) });
  }

  const directPrecision = directTotal ? directOk / directTotal : 0;
  return {
    total: cases.length,
    directPrecision,
    negativesSafe,
    negativesTotal,
    boundaryOk,
    boundaryTotal,
    unapprovedCitations,
    failures,
    passed:
      directPrecision >= THRESHOLDS.directPrecision &&
      negativesSafe === negativesTotal &&
      unapprovedCitations === THRESHOLDS.unapprovedCitations,
  };
}
