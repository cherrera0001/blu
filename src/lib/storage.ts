import { createInitialState, decodeState, type BluState } from "./blu";

const STORAGE_KEY = "blu.local.v1";

export interface BluSnapshot {
  state: BluState;
  error: string | null;
}

const INITIAL_SNAPSHOT: BluSnapshot = {
  state: createInitialState(),
  error: null,
};

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSnapshot = INITIAL_SNAPSHOT;

export function getBluSnapshot(): BluSnapshot {
  if (typeof window === "undefined") return INITIAL_SNAPSHOT;
  if (cachedSnapshot.error) return cachedSnapshot;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    cachedSnapshot = {
      state: cachedSnapshot.state,
      error: "No se pudo acceder al almacenamiento local de este navegador.",
    };
    return cachedSnapshot;
  }

  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  try {
    cachedSnapshot = { state: decodeState(raw), error: null };
  } catch (error) {
    cachedSnapshot = {
      state: createInitialState(),
      error: error instanceof Error ? error.message : "Los datos guardados no se pueden leer.",
    };
  }
  return cachedSnapshot;
}

export function getServerBluSnapshot(): BluSnapshot {
  return INITIAL_SNAPSHOT;
}

export function subscribeToBlu(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function updateBluState(update: (state: BluState) => BluState): void {
  const current = getBluSnapshot();
  if (current.error) return;

  const next = update(current.state);
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    if (window.localStorage.getItem(STORAGE_KEY) !== raw) {
      throw new Error("El navegador no confirmó el guardado.");
    }
    cachedRaw = raw;
    cachedSnapshot = { state: next, error: null };
    notifyListeners();
  } catch {
    cachedSnapshot = {
      state: current.state,
      error: "El navegador no pudo guardar los cambios. Revisa el espacio disponible o la configuración de privacidad.",
    };
    notifyListeners();
  }
}

export function clearBluState(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    if (window.localStorage.getItem(STORAGE_KEY) !== null) {
      throw new Error("El navegador no confirmó el borrado.");
    }
    cachedRaw = null;
    cachedSnapshot = INITIAL_SNAPSHOT;
  } catch {
    cachedRaw = undefined;
    cachedSnapshot = {
      state: cachedSnapshot.state,
      error: "No se pudieron borrar los datos. Inténtalo desde la configuración del navegador.",
    };
    notifyListeners();
    return false;
  }
  notifyListeners();
  return true;
}

function onStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  cachedRaw = undefined;
  notifyListeners();
}

function notifyListeners(): void {
  for (const listener of listeners) listener();
}
