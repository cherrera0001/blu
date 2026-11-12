// @vitest-environment node
import { describe, expect, it } from "vitest";
import corpusJson from "@/data/rag-eval/corpus-sintetico.json";
import type { EvidenceSource } from "@/lib/evidence/registry";
import { indexText, isCitable, planIndex } from "../../../scripts/rag-index.mjs";
import { buildCorpus } from "./corpus";

const base = (corpusJson.sources as unknown as EvidenceSource[])[0];
const variants: EvidenceSource[] = [
  ...(corpusJson.sources as unknown as EvidenceSource[]),
  { ...base, id: "ev-2099-901", status: "pendiente" },
  { ...base, id: "ev-2099-902", status: "retirada" },
  { ...base, id: "ev-2099-903", reviewer: null },
  { ...base, id: "ev-2099-904", reviewedAt: null },
];

describe("indexador RAG (scripts/rag-index.mjs)", () => {
  it("usa exactamente la misma regla y el mismo texto que buildCorpus", () => {
    const corpus = buildCorpus(variants);
    expect(variants.filter(isCitable).map((s: EvidenceSource) => s.id)).toEqual(corpus.map((d) => d.id));
    for (const doc of corpus) expect(indexText(variants.find((s) => s.id === doc.id)!)).toBe(doc.text);
  });

  it("solo indexa lo citable aquí Y aprobado en la base", () => {
    const catalog = [
      { id: "uuid-1", source_ref: base.referenceValue, status: "approved" },
      { id: "uuid-2", source_ref: "otra", status: "pending" },
    ];
    const pending = { ...base, id: "ev-2099-905", status: "pendiente" as const };
    const notInDb = { ...base, id: "ev-2099-906", referenceValue: "10.9999/no-esta" };
    const { index, skipped } = planIndex([base, pending, notInDb], catalog);
    expect(index).toEqual([{ source_id: "uuid-1", registry_id: base.id, content: indexText(base) }]);
    expect(skipped).toEqual([
      { id: "ev-2099-905", reason: "no_citable" },
      { id: "ev-2099-906", reason: "no_aprobada_en_base" },
    ]);
  });
});
