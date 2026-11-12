/**
 * Debe ejecutarse antes que React/red.
 * Hermes no expone SharedArrayBuffer; referencias a fetch/undici pueden tumbar la app.
 */

export const BLU_HERMES_HARDENED = true;

type GlobalBag = {
  SharedArrayBuffer?: unknown;
  fetch?: typeof fetch;
};

const root = globalThis as unknown as GlobalBag;

try {
  if (typeof root.SharedArrayBuffer === "undefined") {
    Object.defineProperty(root, "SharedArrayBuffer", {
      value: ArrayBuffer,
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }
} catch {
  try {
    root.SharedArrayBuffer = ArrayBuffer;
  } catch {
    // Hermes puede bloquear la asignación; el cinturón de fetch/XHR cubre el resto.
  }
}

const originalFetch = typeof root.fetch === "function" ? root.fetch.bind(root) : null;
if (originalFetch) {
  root.fetch = function bluSafeFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    try {
      return originalFetch(input, init).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes("SharedArrayBuffer") ||
          message.includes("fetch_unavailable_on_hermes")
        ) {
          return Promise.reject(new Error("fetch_unavailable_on_hermes"));
        }
        return Promise.reject(error);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("SharedArrayBuffer")) {
        return Promise.reject(new Error("fetch_unavailable_on_hermes"));
      }
      throw error;
    }
  };
}
