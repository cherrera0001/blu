/**
 * HTTP mínimo con XMLHttpRequest (Hermes no siempre expone SharedArrayBuffer,
 * y algunos polyfills de fetch lo requieren).
 */

export async function httpJson<T>(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{ ok: boolean; status: number; json: () => Promise<T>; arrayBuffer: () => Promise<ArrayBuffer> }> {
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? "GET", url);
    xhr.responseType = "arraybuffer";
    const headers = init.headers ?? {};
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.onload = () => {
      const buffer = xhr.response as ArrayBuffer;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: async () => {
          const text = new TextDecoder().decode(buffer);
          return JSON.parse(text) as T;
        },
        arrayBuffer: async () => buffer,
      });
    };
    xhr.onerror = () => reject(new Error("network_error"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.timeout = 15_000;
    xhr.send(init.body ?? null);
  });
}
