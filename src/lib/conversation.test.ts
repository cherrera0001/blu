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
    const text = await respondToMessage("hola");
    expect(text).toBe("Respuesta del BFF");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assistant",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("degrada al proveedor local si el BFF falla (red o error)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);
    const text = await respondToMessage("Estoy ocupada");
    expect(text).toMatch(/No asumiré qué necesitas|tiempo influya/i);
  });

  it("degrada ante respuesta no-OK (p. ej., 429)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    vi.stubGlobal("fetch", fetchMock);
    const text = await respondToMessage("dolor de pecho");
    expect(text).toMatch(/profesional|emergencia/i); // guardián local intacto
  });
});
