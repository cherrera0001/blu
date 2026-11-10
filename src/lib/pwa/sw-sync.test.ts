import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CACHE_NAME, PRECACHE_URLS } from "@/lib/pwa/sw-policy";

/**
 * El service worker de public/ es un archivo servido verbatim (no pasa por el bundler):
 * su lógica DUPLICA la política del módulo puro. Este test de concordancia evita que
 * ambas fuentes se desincronicen (la regla de caché de /api/* es crítica de privacidad).
 */
describe("concordancia public/sw.js ↔ src/lib/pwa/sw-policy.ts", () => {
  const sw = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

  it("usa el mismo nombre de caché versionado", () => {
    expect(sw).toContain(CACHE_NAME);
    expect(CACHE_NAME).toBe("blu-shell-v5");
  });

  it("precachea exactamente las mismas rutas del app shell", () => {
    for (const url of PRECACHE_URLS) {
      expect(sw).toContain(`"${url}"`);
    }
    // El bloque PRECACHE_URLS del SW no incluye ninguna ruta /api/ (el string
    // "/api/" aparece en el chequeo de exclusión, que es legítimo y se valida aparte).
    const block = sw.match(/PRECACHE_URLS = \[([\s\S]*?)\];/);
    expect(block).not.toBeNull();
    expect(block?.[1] ?? "").not.toContain("/api/");
  });

  it("excluye /api/ de la interceptación (nunca conversaciones en caché)", () => {
    expect(sw).toMatch(/url\.pathname\.startsWith\(["']\/api\//);
  });

  it("solo intercepta GET (no-GET va directo a red)", () => {
    expect(sw).toContain('request.method !== "GET"');
  });
});
