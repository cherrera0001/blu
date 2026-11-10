export const PROFILE_STORAGE_KEY = "blu.profile.v1";
export const NICKNAME_MAX_LENGTH = 24;

export interface LocalProfile {
  nickname: string | null;
  updatedAt: string;
}

export interface ProfileSnapshot {
  profile: LocalProfile | null;
  error: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeProfile(raw: string | null): LocalProfile {
  if (raw === null) throw new Error("EMPTY");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("El perfil guardado no se puede leer.");
  }
  if (
    !isRecord(value) ||
    !(value.nickname === null || typeof value.nickname === "string") ||
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("El formato del perfil no es válido.");
  }
  if (value.nickname !== null && value.nickname.length > NICKNAME_MAX_LENGTH) {
    throw new Error("El apodo guardado excede el máximo permitido.");
  }
  return { nickname: value.nickname, updatedAt: value.updatedAt };
}

export function loadProfile(): ProfileSnapshot {
  if (typeof window === "undefined") return { profile: null, error: null };
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return { profile: null, error: "No se pudo acceder al almacenamiento local de este navegador." };
  }
  if (raw === null) return { profile: null, error: null };
  try {
    return { profile: decodeProfile(raw), error: null };
  } catch (error) {
    return {
      profile: null,
      error: error instanceof Error ? error.message : "El perfil guardado no se puede leer.",
    };
  }
}

export function saveNickname(
  nickname: string | null,
  now: string,
): { ok: boolean; error: string | null } {
  const trimmed = nickname === null ? null : nickname.trim().slice(0, NICKNAME_MAX_LENGTH);
  const raw = JSON.stringify({ nickname: trimmed, updatedAt: now });
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, raw);
    if (window.localStorage.getItem(PROFILE_STORAGE_KEY) !== raw) {
      throw new Error("El navegador no confirmó el guardado.");
    }
    invalidateProfile();
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error: "El navegador no pudo guardar tu espacio. Revisa la configuración de privacidad.",
    };
  }
}

let cachedProfile: LocalProfile | null | undefined;
const profileListeners = new Set<() => void>();

export function getProfileSnapshot(): LocalProfile | null {
  if (typeof window === "undefined") return null;
  if (cachedProfile === undefined) {
    cachedProfile = loadProfile().profile;
  }
  return cachedProfile;
}

export function getServerProfileSnapshot(): LocalProfile | null {
  return null;
}

export function subscribeProfile(listener: () => void): () => void {
  profileListeners.add(listener);
  return () => {
    profileListeners.delete(listener);
  };
}

export function invalidateProfile(): void {
  cachedProfile = undefined;
  for (const listener of profileListeners) listener();
}
