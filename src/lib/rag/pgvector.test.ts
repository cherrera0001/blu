// @vitest-environment node
import { describe, expect, it } from "vitest";
import { composeRemotePrompt } from "@/lib/assistant/providers/remote";
import { EMBEDDING_DIMENSIONS, getRagConfig, PgvectorRetriever } from "./pgvector";

const v1 = { url: "https://x.supabase.co", anonKey: "anon" };
const env = { BLU_RAG_ENABLED: "1", BLU_EMBED_BASE_URL: "https://emb.example/v1", BLU_EMBED_API_KEY: "k", BLU_EMBED_MODEL: "m" };

describe("RAG pgvector — activación y contrato (#58)", () => {
  it("apagado por defecto y con configuración incompleta", () => {
    expect(getRagConfig(null, env)).toBeNull();
    expect(getRagConfig(v1, { ...env, BLU_RAG_ENABLED: "" })).toBeNull();
    expect(getRagConfig(v1, { ...env, BLU_EMBED_API_KEY: "" })).toBeNull();
    expect(getRagConfig(v1, { ...env, BLU_EMBED_BASE_URL: "no-url" })).toBeNull();
  });

  it("el umbral nunca baja de 0,5 aunque se configure", () => {
    expect(getRagConfig(v1, { ...env, BLU_RAG_THRESHOLD: "0.1" })?.threshold).toBe(0.5);
    expect(getRagConfig(v1, env)?.threshold).toBe(0.78);
  });

  it("embeddings → match_evidence con anon key; devuelve solo id y similitud", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      if (url.endsWith("/embeddings")) {
        return { ok: true, json: async () => ({ data: [{ embedding: new Array(EMBEDDING_DIMENSIONS).fill(0.01) }] }) };
      }
      return { ok: true, json: async () => [{ registry_id: "ev-2099-001", similarity: 0.9 }, { bad: true }] };
    };
    const retriever = new PgvectorRetriever(getRagConfig(v1, env)!, fetchImpl);
    expect(await retriever.search("pausas", 3)).toEqual([{ id: "ev-2099-001", score: 0.9 }]);
    expect(calls[1].url).toBe("https://x.supabase.co/rest/v1/rpc/match_evidence");
    expect(calls[1].body).toMatchObject({ match_threshold: 0.78, match_count: 3 });
  });

  it("un embedding con dimensión inválida falla (y ground lo convierte en incertidumbre)", async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ data: [{ embedding: [1, 2] }] }) });
    await expect(new PgvectorRetriever(getRagConfig(v1, env)!, fetchImpl).search("x")).rejects.toThrow("embedding_invalid");
  });

  it("el prompt remoto solo cambia si hay fundamentación", () => {
    expect(composeRemotePrompt(null)).not.toMatch(/Evidencia aprobada/);
    expect(composeRemotePrompt(null, { kind: "uncertain", reason: "sin_corpus" })).toMatch(/No afirmes/);
  });
});
