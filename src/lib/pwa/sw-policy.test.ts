import { describe, expect, it } from "vitest";
import {
  CACHE_NAME,
  PRECACHE_URLS,
  isApiUrl,
  isCacheableGet,
} from "@/lib/pwa/sw-policy";

describe("política de caché del service worker (BLU-1503)", () => {
  const ORIGIN = "https://blu-bay-kappa.vercel.app";

  it("nunca considera cacheables las rutas /api/* (ninguna conversación queda en caché)", () => {
    expect(isApiUrl("/api/assistant")).toBe(true);
    expect(isApiUrl("/api/voice")).toBe(true);
    expect(isCacheableGet(`${ORIGIN}/api/assistant`, "GET", ORIGIN)).toBe(false);
  });

  it("solo cachea GET mismo-origen: rechaza cross-origin y no-GET", () => {
    expect(isCacheableGet(`${ORIGIN}/`, "GET", ORIGIN)).toBe(true);
    expect(isCacheableGet(`${ORIGIN}/cuestionario`, "GET", ORIGIN)).toBe(true);
    expect(isCacheableGet("https://otro-dominio.cl/app.js", "GET", ORIGIN)).toBe(false);
    expect(isCacheableGet(`${ORIGIN}/api/assistant`, "POST", ORIGIN)).toBe(false);
    expect(isCacheableGet(`${ORIGIN}/`, "HEAD", ORIGIN)).toBe(false);
  });

  it("el precache cubre el app shell mínimo y nada del BFF", () => {
    expect(PRECACHE_URLS).toContain("/");
    expect(PRECACHE_URLS).toContain("/cuestionario");
    expect(PRECACHE_URLS).toContain("/blu-newspaper.png");
    expect(PRECACHE_URLS).not.toContain("/admin");
    expect(PRECACHE_URLS.some((u) => u.startsWith("/api/"))).toBe(false);
    expect(CACHE_NAME).toMatch(/^blu-shell-v\d+$/);
  });

  it("la versión del caché está centralizada (una sola fuente)", () => {
    expect(CACHE_NAME).toBe("blu-shell-v4");
  });
});
