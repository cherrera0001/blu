import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAccountStore } from "@/lib/v1/account-store";

const URL = "https://proyecto.supabase.co";
const ANON = "anon-de-prueba";
const STORAGE_KEY = "blu.account.v1";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(handler(url, init));
  }));
  return calls;
}

describe("account-store V1 (cliente REST mínimo, specs/012)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sin configuración V1: no llama a la red y devuelve error estable", async () => {
    const calls = mockFetch(() => jsonResponse({}));
    const store = createAccountStore(null);
    const r = await store.signIn("a@b.cl", "clave-larga-1");
    const err = r.ok ? "inesperado" : r.error;
    expect(r.ok).toBe(false);
    expect(err).toBe("no_configurado");
    expect(calls).toHaveLength(0);
  });

  it("signIn exitoso: grant_type=password, guarda sesión y expone solo email", async () => {
    mockFetch((url, init) => {
      expect(url).toBe(`${URL}/auth/v1/token?grant_type=password`);
      expect(init?.headers).toMatchObject({ apikey: ANON, Authorization: `Bearer ${ANON}` });
      return jsonResponse({
        access_token: "tok-1",
        refresh_token: "ref-1",
        user: { id: "u1", email: "ana@blu.cl" },
      });
    });
    const store = createAccountStore({ url: URL, anonKey: ANON });
    const r = await store.signIn("ana@blu.cl", "clave-larga-1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.user.email).toBe("ana@blu.cl");
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(saved.accessToken).toBe("tok-1");
    expect(saved.email).toBe("ana@blu.cl");
    expect(JSON.stringify(saved)).not.toContain("clave-larga-1");
  });

  it("rechaza crear cuenta sin consentimiento del propósito sincronización", async () => {
    const calls = mockFetch(() => jsonResponse({}));
    const store = createAccountStore({ url: URL, anonKey: ANON });
    const r = await store.signUp("ana@blu.cl", "clave-larga-1", { syncConsent: false });
    const err = r.ok ? "inesperado" : r.error;
    expect(r.ok).toBe(false);
    expect(err).toBe("consentimiento_requerido");
    expect(calls).toHaveLength(0);
  });

  it("signUp con consentimiento: POST a /auth/v1/signup; error 400 mapeado estable", async () => {
    mockFetch((url) => {
      expect(url).toBe(`${URL}/auth/v1/signup`);
      return jsonResponse({ msg: "User already registered" }, 400);
    });
    const store = createAccountStore({ url: URL, anonKey: ANON });
    const r = await store.signUp("ana@blu.cl", "clave-larga-1", { syncConsent: true });
    const err = r.ok ? "inesperado" : r.error;
    expect(r.ok).toBe(false);
    expect(err).toBe("email_registrado");
  });

  it("credenciales inválidas → error estable (no mensaje crudo del servidor)", async () => {
    mockFetch(() => jsonResponse({ error: "invalid_grant", error_description: "x" }, 400));
    const store = createAccountStore({ url: URL, anonKey: ANON });
    const r = await store.signIn("ana@blu.cl", "mala-clave");
    const err = r.ok ? "inesperado" : r.error;
    expect(r.ok).toBe(false);
    expect(err).toBe("credenciales_invalidas");
  });

  it("restoreSession valida el token contra /auth/v1/user; inválido limpia storage", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: "viejo", refreshToken: "r", email: "a@b.cl" }));
    mockFetch((url) => {
      expect(url).toBe(`${URL}/auth/v1/user`);
      return jsonResponse({ error: "invalid token" }, 401);
    });
    const store = createAccountStore({ url: URL, anonKey: ANON });
    const r = await store.restoreSession();
    expect(r.ok).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("signOut limpia la sesión local aunque falle la llamada remota", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: "t", refreshToken: "r", email: "a@b.cl" }));
    mockFetch(() => jsonResponse({}, 500));
    const store = createAccountStore({ url: URL, anonKey: ANON });
    await store.signOut();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});


describe('caducidad y cierre de sesión seguro (BLU-105, specs/010)', () => {
  beforeEach(() => { window.localStorage.clear(); vi.unstubAllGlobals(); });

  function storeExpiredSession(refreshToken?: string) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      accessToken: 'expirado', refreshToken: refreshToken ?? '', email: 'ana@blu.cl',
      expiresAt: Date.now() - 1000,
    }));
  }

  it('restoreSession con token expirado y sin refresh: no llama a la red y limpia la sesión', async () => {
    storeExpiredSession();
    const calls = mockFetch(() => jsonResponse({}));
    const store = createAccountStore({ url: URL, anonKey: ANON });
    const r = await store.restoreSession();
    const err = r.ok ? 'inesperado' : r.error;
    expect(r.ok).toBe(false);
    expect(err).toBe('sesion_invalida');
    expect(calls).toHaveLength(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restoreSession expirado con refresh: renueva vía grant_type=refresh_token y persiste la nueva sesión', async () => {
    storeExpiredSession('ref-viejo');
    mockFetch((url, init) => {
      expect(url).toBe(`${URL}/auth/v1/token?grant_type=refresh_token`);
      expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: 'ref-viejo' });
      return jsonResponse({ access_token: 'tok-nuevo', refresh_token: 'ref-nuevo', expires_in: 3600, user: { id: 'u1', email: 'ana@blu.cl' } });
    });
    const store = createAccountStore({ url: URL, anonKey: ANON });
    const r = await store.restoreSession();
    expect(r.ok).toBe(true);
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved.accessToken).toBe('tok-nuevo');
    expect(saved.expiresAt).toBeGreaterThan(Date.now());
  });

  it('refresh rechazado: limpia la sesión y devuelve sesion_invalida', async () => {
    storeExpiredSession('ref-invalido');
    mockFetch(() => jsonResponse({ error: 'invalid_grant' }, 400));
    const store = createAccountStore({ url: URL, anonKey: ANON });
    const r = await store.restoreSession();
    const err = r.ok ? 'inesperado' : r.error;
    expect(err).toBe('sesion_invalida');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('signIn persiste expiresAt futuro (caducidad conocida, no token eterno)', async () => {
    mockFetch(() => jsonResponse({ access_token: 't', refresh_token: 'r', expires_in: 3600, user: { id: 'u1', email: 'ana@blu.cl' } }));
    const store = createAccountStore({ url: URL, anonKey: ANON });
    await store.signIn('ana@blu.cl', 'clave-larga-1');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved.expiresAt).toBeGreaterThan(Date.now() + 3590_000);
  });
});