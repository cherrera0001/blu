import {
  decodeRows,
  MEMORY_MAX_MESSAGES,
  minimize,
  type MemoryConfig,
  type MemoryMessage,
} from "./policy";

/**
 * Cliente PostgREST de la memoria. Usa la anon key + el token de la persona:
 * el aislamiento lo pone RLS (0003_conversation_memory.sql). Nunca registra
 * el texto en consola, telemetría ni errores.
 */
export interface ForgetResult {
  /** true solo si, tras olvidar, una lectura nueva devuelve cero filas. */
  verified: boolean;
  marked: number;
}

export interface MemoryStore {
  load(): Promise<MemoryMessage[]>;
  append(messages: MemoryMessage[]): Promise<boolean>;
  forget(): Promise<ForgetResult>;
}

type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

export function createMemoryStore(
  config: MemoryConfig,
  accessToken: string,
  fetchImpl: FetchLike = (url, init) => fetch(url, init),
): MemoryStore {
  const headers = {
    apikey: config.anonKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const table = `${config.url}/rest/v1/conversation_memory`;

  async function readAll(): Promise<MemoryMessage[] | null> {
    try {
      const res = await fetchImpl(
        `${table}?select=role,body&order=created_at.desc&limit=${MEMORY_MAX_MESSAGES}`,
        { method: "GET", headers },
      );
      if (!res.ok) return null;
      return decodeRows(await res.json()).reverse();
    } catch {
      return null;
    }
  }

  return {
    async load() {
      return (await readAll()) ?? [];
    },

    async append(messages) {
      // Sin owner_id: lo fija la base con auth.uid() (0003).
      const rows = minimize(messages).map((m) => ({ role: m.role, body: m.body }));
      if (rows.length === 0) return true;
      try {
        const res = await fetchImpl(table, {
          method: "POST",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify(rows),
        });
        return res.ok;
      } catch {
        return false;
      }
    },

    async forget() {
      let marked = 0;
      try {
        const res = await fetchImpl(`${config.url}/rest/v1/rpc/memory_forget`, {
          method: "POST",
          headers,
          body: "{}",
        });
        if (!res.ok) return { verified: false, marked: 0 };
        const n = await res.json();
        marked = typeof n === "number" ? n : 0;
      } catch {
        return { verified: false, marked: 0 };
      }
      const after = await readAll();
      return { verified: after !== null && after.length === 0, marked };
    },
  };
}
