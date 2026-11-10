"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LanguageControl, useLocale } from "@/app/LanguageControl";
import { translate } from "@/lib/i18n";
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
  const locale = useLocale();
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

  function say(key: string): string {
    return translate(locale, key);
  }

  if (!config) {
    return (
      <main id="contenido-principal" className="cuenta-off">
        <LanguageControl locale={locale} />
        <h1>{say("Tu cuenta")}</h1>
        <p role="status">{say(ERROR_TEXT.no_configurado)}</p>
        <p className="muted">
          {say("Cuando el equipo active la sincronización, aquí podrás crear tu cuenta con correo verificado. Tus datos locales actuales no cambian ni salen de tu dispositivo.")}
        </p>
      </main>
    );
  }

  async function submit(event: FormEvent) {
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
      setStatus(ERROR_TEXT[r.error] ?? ERROR_TEXT.red_no_disponible);
    }
  }

  if (user) {
    const session = say("Sesión iniciada como {email}.").split("{email}").join(user.email);
    return (
      <main id="contenido-principal" className="cuenta-on">
        <LanguageControl locale={locale} />
        <h1>{say("Tu cuenta")}</h1>
        <p role="status">{session}</p>
        <button
          type="button"
          onClick={async () => {
            await store.signOut();
            setUser(null);
            setStatus("Sesión cerrada. Tus datos locales siguen en tu dispositivo.");
          }}
        >
          {say("Cerrar sesión")}
        </button>
        {status && <p role="status">{say(status)}</p>}
      </main>
    );
  }

  const submitLabel = mode === "signin" ? say("Entrar con correo") : say("Crear mi cuenta");

  return (
    <main id="contenido-principal" className="cuenta-on">
      <LanguageControl locale={locale} />
      <h1>{say("Tu cuenta")}</h1>
      <p className="muted">
        {say("El correo es el único dato obligatorio. La sincronización entre dispositivos es opt-in y puedes borrar todo cuando quieras.")}
      </p>
      <div role="group" aria-label={say("Modo de cuenta")}>
        <button type="button" aria-pressed={mode === "signin"} onClick={() => setMode("signin")}>
          {say("Entrar")}
        </button>
        <button type="button" aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>
          {say("Crear cuenta")}
        </button>
      </div>
      <form onSubmit={submit} noValidate>
        <label htmlFor="cuenta-email">{say("Correo electrónico")}</label>
        <input
          id="cuenta-email"
          autoComplete="email"
          inputMode="email"
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          value={email}
        />
        <label htmlFor="cuenta-password">{say("Contraseña")}</label>
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
            {say("Acepto sincronizar mis datos de bienestar entre dispositivos (puedo retirar este consentimiento cuando quiera).")}
          </label>
        )}
        <p role="status" aria-live="polite">{status ? say(status) : ""}</p>
        <button disabled={busy} type="submit">
          {submitLabel}
        </button>
      </form>
    </main>
  );
}
