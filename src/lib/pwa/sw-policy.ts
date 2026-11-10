/**
 * Política de caché del service worker (specs/018, BLU-1503).
 * Módulo puro: la misma lógica vive duplicada en public/sw.js (servido verbatim,
 * sin bundler). sw-sync.test.ts exige que ambas fuentes coincidan.
 *
 * Privacidad: /api/* (asistente y voz) NUNCA es cacheable; ninguna conversación,
 * transcripción ni respuesta queda almacenada en caché.
 */

export const CACHE_NAME = "blu-shell-v5";

/** App shell mínimo para arranque sin conexión tras una visita previa online. */
export const PRECACHE_URLS = [
  "/",
  "/cuestionario",
  "/blu-newspaper.png",
  "/manifest.webmanifest",
];

export function isApiUrl(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/** ¿URL mismo-origen de la app, no-API, http(s)? Solo esas entran a caché. */
export function isCacheableAppUrl(url: URL, appOrigin: string): boolean {
  if (url.origin !== appOrigin) return false;
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  return !isApiUrl(url.pathname);
}

export function isCacheableGet(rawUrl: string, method: string, appOrigin: string): boolean {
  if (method !== "GET") return false;
  try {
    return isCacheableAppUrl(new URL(rawUrl), appOrigin);
  } catch {
    return false;
  }
}
