import { afterEach, describe, expect, it, vi } from "vitest";
import { getV1Config, isV1Enabled } from "@/lib/v1/config";

describe("configuración V1 (activación por SUPABASE_*, ADR-0006)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sin variables: desactivado y la app conserva el comportamiento local", () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    expect(isV1Enabled()).toBe(false);
    expect(getV1Config()).toBeNull();
  });

  it("con ambas variables: activado, url normalizada sin barra final", () => {
    vi.stubEnv("SUPABASE_URL", "https://proyecto.supabase.co/");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon-publica-de-prueba");
    expect(isV1Enabled()).toBe(true);
    expect(getV1Config()).toEqual({
      url: "https://proyecto.supabase.co",
      anonKey: "anon-publica-de-prueba",
    });
  });

  it("falta una sola variable: desactivado (nunca parcial)", () => {
    vi.stubEnv("SUPABASE_URL", "https://proyecto.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    expect(isV1Enabled()).toBe(false);
  });

  it("nunca lee claves de servidor (service_role no existe en el cliente)", () => {
    vi.stubEnv("SUPABASE_URL", "https://proyecto.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("SUPABASE_SERVICE_ROLE", "no-debe-leerse");
    const config = getV1Config();
    expect(config && "serviceRole" in config).toBe(false);
    expect(JSON.stringify(config)).not.toContain("no-debe-leerse");
  });
});
