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
  });

  it("degrada ante respuesta no-OK (p. ej., 429)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    vi.stubGlobal("fetch", fetchMock);
    const result = await respondToMessage("dolor de pecho");
    expect(result.text).toMatch(/profesional|emergencia/i); // guardián local intacto
    expect(result.usedFallback).toBe(true);
  });
});
