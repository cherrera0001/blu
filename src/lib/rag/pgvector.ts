import type { V1Config } from "@/lib/v1/config";
import type { Hit, Retriever } from "./lexical";

/**
 * Recuperador de producción (#58): embeddings del proveedor intercambiable
 * (ADR-0005, API compatible OpenAI, con retención nula configurada en la
 * cuenta) + RPC match_evidence en Supabase. Solo servidor.
 */
export interface RagConfig {
  v1: V1Config;
  embedBaseUrl: string;
  embedApiKey: string;
  embedModel: string;
  /** Similitud coseno mínima; la base además impone ≥ 0,5. */
  threshold: number;
}

export const EMBEDDING_DIMENSIONS = 1536;

/** Apagado salvo BLU_RAG_ENABLED=1 con V1 y proveedor de embeddings configurados. */
export function getRagConfig(
  v1: V1Config | null,
  env: Record<string, string | undefined> = process.env,
): RagConfig | null {
  if (!v1 || (env.BLU_RAG_ENABLED ?? "").trim() !== "1") return null;
  const embedBaseUrl = env.BLU_EMBED_BASE_URL?.trim();
  const embedApiKey = env.BLU_EMBED_API_KEY?.trim();
  const embedModel = env.BLU_EMBED_MODEL?.trim();
  if (!embedBaseUrl || !embedApiKey || !embedModel) return null;
  try {
    new URL(embedBaseUrl);
  } catch {
    return null;
  }
  const raw = Number(env.BLU_RAG_THRESHOLD ?? "0.78");
  const threshold = Number.isFinite(raw) ? Math.min(0.99, Math.max(0.5, raw)) : 0.78;
  return { v1, embedBaseUrl: embedBaseUrl.replace(/\/+$/, ""), embedApiKey, embedModel, threshold };
}

type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "json">>;

export async function embed(config: RagConfig, text: string, fetchImpl: FetchLike = fetch): Promise<number[]> {
  const res = await fetchImpl(`${config.embedBaseUrl}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.embedApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.embedModel, input: text.slice(0, 2000), dimensions: EMBEDDING_DIMENSIONS }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error("embedding_unavailable");
  const body = (await res.json()) as { data?: Array<{ embedding?: unknown }> };
  const vector = body.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS || !vector.every((v) => typeof v === "number")) {
    throw new Error("embedding_invalid");
  }
  return vector as number[];
}

export class PgvectorRetriever implements Retriever {
  constructor(
    private readonly config: RagConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async search(query: string, k = 3): Promise<Hit[]> {
    const vector = await embed(this.config, query, this.fetchImpl);
    const { url, anonKey } = this.config.v1;
    const res = await this.fetchImpl(`${url}/rest/v1/rpc/match_evidence`, {
      method: "POST",
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query_embedding: vector, match_threshold: this.config.threshold, match_count: k }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error("match_unavailable");
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows)) throw new Error("match_invalid");
    return rows
      .filter(
        (r): r is { registry_id: string; similarity: number } =>
          typeof r?.registry_id === "string" && typeof r?.similarity === "number",
      )
      .map((r) => ({ id: r.registry_id, score: r.similarity }));
  }
}
