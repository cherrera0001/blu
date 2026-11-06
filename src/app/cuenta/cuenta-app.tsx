"use client";

import { useEffect, useState } from "react";
import {
  createAccountStore,
  type AccountError,
  type AccountStore,
  type AccountUser,
} from "@/lib/v1/account-store";
import type { V1Config } from "@/lib/v1/config";

const ERROR_TEXT: Record<AccountError, string> = {
  no_configurado: "Las cuentas aún no están activadas en esta instalación.",
  consentimiento_requerido: "Necesitamos tu consentimiento para sincronizar tus datos.",
  credenciales_invalidas: "Revisa tu correo o tu contraseña e inténtalo de nuevo.",
  email_registrado: "Ese correo ya tiene una cuenta. Prueba entrando.",
  red_no_disponible: "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.",
  sesion_invalida: "Tu sesión caducó. Vuelve a entrar cuando quieras.",
};

function errorText(error: AccountError): string {
  return ERROR_TEXT[error] ?? ERROR_TEXT.red_no_disponible;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pantalla de cuenta V1 (specs/012): correo verificado es el único dato de
 * identidad obligatorio; crear cuenta exige consentimiento específico del
 * propósito «sincronización» (independiente del consentimiento operativo).
 * El store siempre existe: sin configuración es un no-op que nunca toca la red
 * y la pantalla muestra un aviso honesto (config === null).
 */
export function CuentaApp({
  config,
  store: injectedStore,
}: {
  config: V1Config | null;
  store?: AccountStore;
}) {
  const [store] = useState<AccountStore>(() => injectedStore ?? createAccountStore(config));
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [syncConsent, setSyncConsent] = useState(false);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    store.restoreSession().then((r) => {
      if (!cancelled && r.ok) setUser(r.user);
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  if (!config) {
    return (
      <main id="contenido-principal" className="cuenta-off">
        <h1>Tu cuenta</h1>
        <p role="status">{ERROR_TEXT.no_configurado}</p>
        <p className="muted">
          Cuando el equipo active la sincronización, aquí podrás crear tu cuenta con correo
          verificado. Tus datos locales actuales no cambian ni salen de tu dispositivo.
        </p>
      </main>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!EMAIL_RE.test(email)) {
      setStatus("Escribe un correo válido, por ejemplo ana@correo.cl.");
      return;
    }
    if (password.length < 8) {
      setStatus("La contraseña necesita al menos 8 caracteres.");
      return;
    }
    if (mode === "signup" && !syncConsent) {
      setStatus(ERROR_TEXT.consentimiento_requerido);
      return;
    }
    setBusy(true);
    setStatus(mode === "signin" ? "Entrando…" : "Creando tu cuenta…");
    const r =
      mode === "signin"
        ? await store.signIn(email, password)
        : await store.signUp(email, password, { syncConsent });
    setBusy(false);
    if (r.ok) {
      setUser(r.user);
      setStatus("");
      setPassword("");
    } else {
      setStatus(errorText(r.error));
    }
  }

  if (user) {
    return (
      <main id="contenido-principal" className="cuenta-on">
        <h1>Tu cuenta</h1>
        <p role="status">Sesión iniciada como {user.email}.</p>
        <button
          type="button"
          onClick={async () => {
            await store.signOut();
            setUser(null);
            setStatus("Sesión cerrada. Tus datos locales siguen en tu dispositivo.");
          }}
        >
          Cerrar sesión
        </button>
      </main>
    );
  }

  const submitLabel = mode === "signin" ? "Entrar con correo" : "Crear mi cuenta";

  return (
    <main id="contenido-principal" className="cuenta-on">
      <h1>Tu cuenta</h1>
      <p className="muted">
        El correo es el único dato obligatorio. La sincronización entre dispositivos es opt-in y
        puedes borrar todo cuando quieras.
      </p>
      <div role="group" aria-label="Modo de cuenta">
        <button type="button" aria-pressed={mode === "signin"} onClick={() => setMode("signin")}>
          Entrar
        </button>
        <button type="button" aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>
          Crear cuenta
        </button>
      </div>
      <form onSubmit={submit} noValidate>
        <label htmlFor="cuenta-email">Correo electrónico</label>
        <input
          id="cuenta-email"
          autoComplete="email"
          inputMode="email"
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          value={email}
        />
        <label htmlFor="cuenta-password">Contraseña</label>
        <input
          id="cuenta-password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          value={password}
        />
        {mode === "signup" && (
          <label>
            <input
              checked={syncConsent}
              onChange={(e) => setSyncConsent(e.target.checked)}
              type="checkbox"
            />
            Acepto sincronizar mis datos de bienestar entre dispositivos (puedo retirar este
            consentimiento cuando quiera).
          </label>
        )}
        <p role="status" aria-live="polite">{status}</p>
        <button disabled={busy} type="submit">
          {submitLabel}
        </button>
      </form>
    </main>
  );
}
