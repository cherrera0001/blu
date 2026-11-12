import {
  createInitialState,
  decodeState,
  type BluState,
} from "blu-core/blu";

export const STORAGE_KEY = "blu.local.v1";

export interface BluSnapshot {
  state: BluState;
  error: string | null;
}

export type StorageAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let adapter: StorageAdapter | null = null;

async function getAdapter(): Promise<StorageAdapter> {
  if (adapter) return adapter;
  const mod = await import("@react-native-async-storage/async-storage");
  const AsyncStorage = mod.default;
  adapter = {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  };
  return adapter;
}

/** Solo para pruebas: inyectar memoria en lugar de AsyncStorage. */
export function setStorageAdapter(next: StorageAdapter | null): void {
  adapter = next;
}

export function createMemoryAdapter(seed: Record<string, string> = {}): StorageAdapter {
  const map = new Map(Object.entries(seed));
  return {
    async getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}

export async function loadBluSnapshot(): Promise<BluSnapshot> {
  try {
    const store = await getAdapter();
    const raw = await store.getItem(STORAGE_KEY);
    return { state: decodeState(raw), error: null };
  } catch (error) {
    return {
      state: createInitialState(),
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron leer los datos guardados en este dispositivo.",
    };
  }
}

export async function saveBluState(state: BluState): Promise<BluSnapshot> {
  const raw = JSON.stringify(state);
  try {
    const store = await getAdapter();
    await store.setItem(STORAGE_KEY, raw);
    const confirmed = await store.getItem(STORAGE_KEY);
    if (confirmed !== raw) {
      throw new Error("El dispositivo no confirmó el guardado.");
    }
    return { state, error: null };
  } catch {
    return {
      state,
      error:
        "No se pudieron guardar los cambios. Revisa el espacio disponible en el dispositivo.",
    };
  }
}

export async function clearBluState(): Promise<BluSnapshot> {
  try {
    const store = await getAdapter();
    await store.removeItem(STORAGE_KEY);
    const leftover = await store.getItem(STORAGE_KEY);
    if (leftover !== null) {
      throw new Error("El dispositivo no confirmó el borrado.");
    }
    return { state: createInitialState(), error: null };
  } catch {
    const current = await loadBluSnapshot();
    return {
      state: current.state,
      error: "No se pudieron borrar los datos. Inténtalo otra vez.",
    };
  }
}
