import { afterEach, describe, expect, it, vi } from "vitest";
import { respondToMessage } from "./conversation";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("respondToMessage vía BFF con fallback local", () => {
  it("usa la respuesta del BFF cuando responde 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: "Respuesta del BFF",
        meta: { providerId: "local-rules", safety: { guardianAction: "none", latencyMs: 1 } },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await respondToMessage("hola");
    expect(result.text).toBe("Respuesta del BFF");
    expect(result.usedFallback).toBe(false);
    expect(result.providerId).toBe("local-rules");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assistant",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("degrada al proveedor local si el BFF falla (red o error)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await respondToMessage("Estoy ocupada");
    expect(result.text).toMatch(/El tiempo aprieta|dos minutos/i);
    expect(result.usedFallback).toBe(true);
    expect(result.providerId).toBe("local-rules");
  });

  it("degrada ante respuesta no-OK (p. ej., 429)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    vi.stubGlobal("fetch", fetchMock);
    const result = await respondToMessage("dolor de pecho");
    expect(result.text).toMatch(/profesional|emergencia/i); // guardián local intacto
    expect(result.usedFallback).toBe(true);
    expect(result.providerId).toBe("local-rules");
  });

  it("expone providerId remote cuando el BFF responde con el proveedor remoto", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: "Prueba con un paso pequeño hoy.",
        meta: { providerId: "remote", safety: { guardianAction: "none", latencyMs: 3 } },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await respondToMessage("¿por dónde parto?");
    expect(result.usedFallback).toBe(false);
    expect(result.providerId).toBe("remote");
  });

  it("distingue el motivo del fallback: 429 → rate_limited; red → network", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    const limited = await respondToMessage("hola");
    expect(limited.usedFallback).toBe(true);
    expect(limited.fallbackReason).toBe("rate_limited");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));
    const offline = await respondToMessage("hola");
    expect(offline.fallbackReason).toBe("network");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const server = await respondToMessage("hola");
    expect(server.fallbackReason).toBe("http_error");
  });

  it("sin fallback: fallbackReason es null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: "ok",
        meta: { providerId: "local-rules", safety: { guardianAction: "none", latencyMs: 1 } },
      }),
    }));
    const result = await respondToMessage("hola");
    expect(result.fallbackReason).toBeNull();
  });
});
