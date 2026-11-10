import type { V1Config } from "@/lib/v1/config";

/**
 * Cliente de cuentas V1 mínimo: Auth REST de Supabase vía fetch, cero
 * dependencias (specs/012). La seguridad de datos la garantiza RLS
 * owner-only en el servidor (specs/009), no este cliente.
 *
 * Privacidad: la contraseña viaja solo al endpoint de autenticación y nunca se
 * guarda; la sesión persiste en localStorage solo tras crear cuenta
 * (que exige consentimiento del propósito «sincronización»).
 */

export const ACCOUNT_STORAGE_KEY = "blu.account.v1";

export interface AccountUser {
  id: string;
  email: string;
}

export type AccountError =
  | "no_configurado"
  | "consentimiento_requerido"
  | "credenciales_invalidas"
  | "email_registrado"
  | "red_no_disponible"
  | "sesion_invalida";

export type AccountResult = { ok: true; user: AccountUser } | { ok: false; error: AccountError };

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  email: string;
  /** Epoch ms en que caduca el access token (specs/010). */
  expiresAt?: number;
}

export interface AccountStore {
  signIn(email: string, password: string): Promise<AccountResult>;
  signUp(email: string, password: string, opts: { syncConsent: boolean }): Promise<AccountResult>;
  signOut(): Promise<void>;
  restoreSession(): Promise<AccountResult>;
}

function authHeaders(config: V1Config): Record<string, string> {
  return { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}` };
}

function toUser(raw: unknown): AccountUser {
  const u = (raw ?? {}) as { id?: unknown; email?: unknown };
  return { id: String(u.id ?? ""), email: String(u.email ?? "") };
}

async function request(
  config: V1Config,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${config.url}${path}`, {
    ...init,
    headers: { ...authHeaders(config), ...(init.headers ?? {}) },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

function persistSession(config: V1Config, session: StoredSession): void {
  void config;
  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(session));
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<StoredSession>;
    if (!s.accessToken || !s.email) return null;
    return {
      accessToken: s.accessToken,
      refreshToken: s.refreshToken ?? "",
      email: s.email,
      expiresAt: typeof s.expiresAt === "number" ? s.expiresAt : undefined,
    };
  } catch {
    return null;
  }
}

function clearSession(): void {
  window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}

function mapAuthError(status: number, body: unknown, context: "signin" | "signup"): AccountError {
  const text = JSON.stringify(body ?? "").toLowerCase();
  if (status === 400 || status === 401 || status === 422) {
    if (context === "signup" && text.includes("already registered")) return "email_registrado";
    return "credenciales_invalidas";
  }
  return "red_no_disponible";
}

export function createAccountStore(config: V1Config | null): AccountStore {
  if (!config) {
    const disabled: AccountResult = { ok: false, error: "no_configurado" };
    return {
      signIn: async () => disabled,
      signUp: async () => disabled,
      signOut: async () => undefined,
      restoreSession: async () => disabled,
    };
  }

  return {
    async signIn(email, password) {
      try {
        const { status, body } = await request(config, "/auth/v1/token?grant_type=password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (status !== 200) {
          return { ok: false, error: mapAuthError(status, body, "signin") };
        }
        const b = (body ?? {}) as { access_token?: string; refresh_token?: string; expires_in?: number; user?: unknown };
        const user = toUser(b.user);
        persistSession(config, {
          accessToken: b.access_token ?? "",
          refreshToken: b.refresh_token ?? "",
          email: user.email,
          expiresAt: Date.now() + ((b.expires_in ?? 3600) * 1000),
        });
        return { ok: true, user };
      } catch {
        return { ok: false, error: "red_no_disponible" };
      }
    },

    async signUp(email, password, opts) {
      if (!opts.syncConsent) return { ok: false, error: "consentimiento_requerido" };
      try {
        const { status, body } = await request(config, "/auth/v1/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (status !== 200 && status !== 201) {
          return { ok: false, error: mapAuthError(status, body, "signup") };
        }
        const b = (body ?? {}) as { session?: { access_token?: string; refresh_token?: string; expires_in?: number }; user?: unknown };
        const user = toUser(b.user);
        if (b.session?.access_token) {
          persistSession(config, {
            accessToken: b.session.access_token,
            refreshToken: b.session.refresh_token ?? "",
            email: user.email,
            expiresAt: Date.now() + ((b.session.expires_in ?? 3600) * 1000),
          });
        }
        return { ok: true, user };
      } catch {
        return { ok: false, error: "red_no_disponible" };
      }
    },

    async signOut() {
      const stored = readStoredSession();
      clearSession();
      if (stored) {
        await request(config, "/auth/v1/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: stored.refreshToken }),
        }).catch(() => undefined);
      }
    },

    async restoreSession() {
      const stored = readStoredSession();
      if (!stored) return { ok: false, error: "sesion_invalida" };
      if (stored.expiresAt && Date.now() > stored.expiresAt) {
        if (!stored.refreshToken) {
          clearSession();
          return { ok: false, error: "sesion_invalida" };
        }
        try {
          const refreshed = await request(config, "/auth/v1/token?grant_type=refresh_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: stored.refreshToken }),
          });
          const rb = (refreshed.body ?? {}) as {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
            user?: unknown;
          };
          if (refreshed.status !== 200 || !rb.access_token) {
            clearSession();
            return { ok: false, error: "sesion_invalida" };
          }
          const user = toUser(rb.user ?? { email: stored.email });
          persistSession(config, {
            accessToken: rb.access_token,
            refreshToken: rb.refresh_token ?? stored.refreshToken,
            email: user.email,
            expiresAt: Date.now() + ((rb.expires_in ?? 3600) * 1000),
          });
          return { ok: true, user };
        } catch {
          clearSession();
          return { ok: false, error: "sesion_invalida" };
        }
      }
      try {
        const { status, body } = await request(config, "/auth/v1/user", {
          headers: { Authorization: `Bearer ${stored.accessToken}` },
        });
        if (status !== 200) {
          clearSession();
          return { ok: false, error: "sesion_invalida" };
        }
        return { ok: true, user: toUser(body) };
      } catch {
        return { ok: false, error: "red_no_disponible" };
      }
    },
  };
}
