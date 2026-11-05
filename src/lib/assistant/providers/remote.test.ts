import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRemoteLlmConfig,
  RemoteLlmError,
  RemoteLlmProvider,
  REMOTE_SYSTEM_PROMPT,
} from "./remote";

const CONFIG = {
  baseUrl: "https://llm.test/v1",
  apiKey: "test-llm-key",
  model: "test-model",
};

function llmResponse(text: string, status = 200): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { role: "assistant", content: text } }] }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getRemoteLlmConfig", () => {
  it("devuelve null cuando faltan variables", () => {
    expect(getRemoteLlmConfig({})).toBeNull();
    expect(
      getRemoteLlmConfig({ BLU_LLM_BASE_URL: "https://x.test/v1" }),
    ).toBeNull();
  });

  it("ignora valores vacíos o solo espacios", () => {
    expect(
      getRemoteLlmConfig({
        BLU_LLM_BASE_URL: "   ",
        BLU_LLM_API_KEY: "k",
        BLU_LLM_MODEL: "m",
      }),
    ).toBeNull();
  });

  it("rechaza baseUrl inválida", () => {
    expect(
      getRemoteLlmConfig({
        BLU_LLM_BASE_URL: "no-es-una-url",
        BLU_LLM_API_KEY: "k",
        BLU_LLM_MODEL: "m",
      }),
    ).toBeNull();
  });

  it("devuelve la configuración completa y normaliza la barra final", () => {
    const config = getRemoteLlmConfig({
      BLU_LLM_BASE_URL: "https://llm.test/v1/",
      BLU_LLM_API_KEY: "k",
      BLU_LLM_MODEL: "m",
    });
    expect(config).toEqual({ baseUrl: "https://llm.test/v1", apiKey: "k", model: "m" });
  });
});

describe("RemoteLlmProvider", () => {
  it("envía el system prompt y los mensajes al endpoint chat/completions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(llmResponse("Prueba un paso de dos minutos."));
    const provider = new RemoteLlmProvider(CONFIG, fetchMock);

    const reply = await provider.respond([
      { role: "assistant", text: "Hola, soy Blu." },
      { role: "user", text: "No tengo ánimo hoy" },
    ]);

    expect(reply.text).toBe("Prueba un paso de dos minutos.");
    expect(reply.meta.providerId).toBe("remote");
    expect(reply.meta.model).toBe("test-model");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://llm.test/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-llm-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("test-model");
    expect(body.max_tokens).toBeGreaterThan(0);
    expect(body.messages[0]).toEqual({ role: "system", content: REMOTE_SYSTEM_PROMPT });
    expect(body.messages[1]).toEqual({ role: "assistant", content: "Hola, soy Blu." });
    expect(body.messages[2]).toEqual({ role: "user", content: "No tengo ánimo hoy" });
  });

  it("propaga un timeout como RemoteLlmError code=timeout", async () => {
    const fetchMock = vi.fn().mockRejectedValue(
      new DOMException("The operation timed out.", "TimeoutError"),
    );
    const provider = new RemoteLlmProvider(CONFIG, fetchMock);

    await expect(provider.respond([{ role: "user", text: "hola" }])).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("mapea AbortError del cliente como timeout", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));
    const provider = new RemoteLlmProvider(CONFIG, fetchMock);

    await expect(provider.respond([{ role: "user", text: "hola" }])).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("429 → rate_limited; 401/403 → auth_error; 5xx → provider_unavailable", async () => {
    const cases: Array<[number, string]> = [
      [429, "rate_limited"],
      [401, "auth_error"],
      [403, "auth_error"],
      [500, "provider_unavailable"],
    ];
    for (const [status, code] of cases) {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response("upstream", { status }),
      );
      const provider = new RemoteLlmProvider(CONFIG, fetchMock);
      await expect(
        provider.respond([{ role: "user", text: "hola" }]),
      ).rejects.toMatchObject({ code });
    }
  });

  it("respuesta sin choices o con contenido vacío → invalid_response", async () => {
    const noChoices = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(
      new RemoteLlmProvider(CONFIG, noChoices).respond([{ role: "user", text: "hola" }]),
    ).rejects.toMatchObject({ code: "invalid_response" });

    const emptyContent = vi.fn().mockResolvedValue(llmResponse("   "));
    await expect(
      new RemoteLlmProvider(CONFIG, emptyContent).respond([{ role: "user", text: "hola" }]),
    ).rejects.toMatchObject({ code: "invalid_response" });

    const badJson = vi.fn().mockResolvedValue(
      new Response("{no-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(
      new RemoteLlmProvider(CONFIG, badJson).respond([{ role: "user", text: "hola" }]),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("el error nunca contiene la clave ni el texto del usuario", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("boom", { status: 500 }));
    const provider = new RemoteLlmProvider(CONFIG, fetchMock);
    try {
      await provider.respond([{ role: "user", text: "secreto-personal" }]);
      expect.unreachable("debería lanzar");
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteLlmError);
      const message = String((error as Error).message);
      expect(message).not.toContain("test-llm-key");
      expect(message).not.toContain("secreto-personal");
    }
  });

  it("aborta la petición cuando vence el timeout configurado", async () => {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const provider = new RemoteLlmProvider(CONFIG, fetchMock, 20);
    await expect(provider.respond([{ role: "user", text: "hola" }])).rejects.toMatchObject({
      code: "timeout",
    });
  });
});
