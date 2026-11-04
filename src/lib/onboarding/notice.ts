export const ONBOARDING_NOTICE_VERSION = "1.0.0";

export interface NoticeAcceptance {
  version: string;
  acceptedAt: string;
}

export interface NoticeSnapshot {
  accepted: NoticeAcceptance | null;
  error: string | null;
}

const STORAGE_KEY = "blu.onboarding.notice.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function loadNotice(): NoticeSnapshot {
  if (typeof window === "undefined") return { accepted: null, error: null };
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { accepted: null, error: "No se pudo acceder al almacenamiento local de este navegador." };
  }
  if (raw === null) return { accepted: null, error: null };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { accepted: null, error: "El aviso de consentimiento guardado no se puede leer." };
  }
  if (
    !isRecord(value) ||
    typeof value.version !== "string" ||
    typeof value.acceptedAt !== "string"
  ) {
    return { accepted: null, error: "El aviso de consentimiento guardado no cumple el formato esperado." };
  }
  return { accepted: { version: value.version, acceptedAt: value.acceptedAt }, error: null };
}

export function acceptNotice(now: string): { ok: boolean; error: string | null } {
  const raw = JSON.stringify({ version: ONBOARDING_NOTICE_VERSION, acceptedAt: now });
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    if (window.localStorage.getItem(STORAGE_KEY) !== raw) {
      throw new Error("El navegador no confirmó el guardado.");
    }
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error: "El navegador no pudo registrar tu aceptación. Revisa la configuración de privacidad.",
    };
  }
}

export function clearNotice(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return window.localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}
