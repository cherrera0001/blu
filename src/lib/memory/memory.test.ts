// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { acceptPurpose, emptyConsent } from "@/lib/consent";
import { canRemember, decodeRows, getMemoryConfig, MEMORY_MAX_CHARS, MEMORY_PURPOSE, minimize } from "./policy";
import { createMemoryStore } from "./store";

const v1 = { url: "https://x.supabase.co", anonKey: "anon" };
const consented = acceptPurpose(emptyConsent(), MEMORY_PURPOSE, "2026-11-12T10:00:00Z");

type Call = { url: string; init: RequestInit };
function fakeFetch(responses: Array<{ ok: boolean; status?: number; body: unknown }>) {
  const calls: Call[] = [];
  const impl = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = responses.shift() ?? { ok: false, body: null };
    return { ok: r.ok, status: r.status ?? (r.ok ? 200 : 500), json: async () => r.body };
  };
  return { calls, impl };
}

afterEach(() => vi.restoreAllMocks());

describe("memoria conversacional — activación (#43)", () => {
  it("apagada por defecto: requiere V1 + BLU_MEMORY_ENABLED=1", () => {
    expect(getMemoryConfig(null, { BLU_MEMORY_ENABLED: "1" })).toBeNull();
    expect(getMemoryConfig(v1, {})).toBeNull();
    expect(getMemoryConfig(v1, { BLU_MEMORY_ENABLED: "true" })).toBeNull();
    expect(getMemoryConfig(v1, { BLU_MEMORY_ENABLED: "1" })).toEqual(v1);
  });

  it("sin consentimiento o sin sesión no hay memoria", () => {
    expect(canRemember(v1, "tok", emptyConsent())).toBe(false);
    expect(canRemember(v1, null, consented)).toBe(false);
    expect(canRemember(null, "tok", consented)).toBe(false);
    expect(canRemember(v1, "tok", consented)).toBe(true);
  });

  it("minimiza: roles cerrados, sin vacíos y texto acotado", () => {
    const long = "a".repeat(MEMORY_MAX_CHARS + 50);
    expect(minimize([{ role: "user", body: "  " }, { role: "assistant", body: long }])).toEqual([
      { role: "assistant", body: "a".repeat(MEMORY_MAX_CHARS) },
    ]);
    expect(decodeRows([{ role: "system", body: "x" }, { role: "user", body: 3 }, { role: "user", body: "hola" }])).toEqual([
      { role: "user", body: "hola" },
    ]);
    expect(decodeRows("nope")).toEqual([]);
  });
});

describe("memoria conversacional — store", () => {
  it("escribe con el token de la persona y sin owner_id (lo fija la base)", async () => {
    const { calls, impl } = fakeFetch([{ ok: true, status: 201, body: null }]);
    const store = createMemoryStore(v1, "user-token", impl);
    expect(await store.append([{ role: "user", body: "hola" }])).toBe(true);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer user-token");
    expect(JSON.parse(String(calls[0].init.body))).toEqual([{ role: "user", body: "hola" }]);
    expect(calls[0].url).toBe("https://x.supabase.co/rest/v1/conversation_memory");
  });

  it("carga en orden cronológico y acota a 40", async () => {
    const rows = [{ role: "assistant", body: "dos" }, { role: "user", body: "uno" }];
    const { calls, impl } = fakeFetch([{ ok: true, body: rows }]);
    expect(await createMemoryStore(v1, "t", impl).load()).toEqual([
      { role: "user", body: "uno" },
      { role: "assistant", body: "dos" },
    ]);
    expect(calls[0].url).toContain("order=created_at.desc&limit=40");
    expect(calls[0].url).toContain("deleted_at=is.null&expires_at=gt.");
  });

  it("olvidar se verifica con una lectura nueva vacía", async () => {
    const ok = fakeFetch([{ ok: true, body: 3 }, { ok: true, body: [] }]);
    expect(await createMemoryStore(v1, "t", ok.impl).forget()).toEqual({ verified: true, marked: 3 });
    expect(ok.calls[0].url).toBe("https://x.supabase.co/rest/v1/rpc/memory_forget");

    const leftover = fakeFetch([{ ok: true, body: 1 }, { ok: true, body: [{ role: "user", body: "quedó" }] }]);
    expect((await createMemoryStore(v1, "t", leftover.impl).forget()).verified).toBe(false);

    const failed = fakeFetch([{ ok: false, body: null }]);
    expect(await createMemoryStore(v1, "t", failed.impl).forget()).toEqual({ verified: false, marked: 0 });
  });

  it("los fallos de red no lanzan ni registran el texto", async () => {
    const spies = [vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn")];
    const store = createMemoryStore(v1, "t", async () => {
      throw new Error("offline");
    });
    expect(await store.append([{ role: "user", body: "secreto personal" }])).toBe(false);
    expect(await store.load()).toEqual([]);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
