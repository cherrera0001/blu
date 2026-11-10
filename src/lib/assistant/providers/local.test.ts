import { describe, expect, it } from "vitest";
import { LocalRuleProvider } from "./local";

const provider = new LocalRuleProvider();

function last(text: string) {
  return provider.respond([{ role: "user", text }]);
}

describe("LocalRuleProvider", () => {
  it("responde sobre tiempo con empatía y opciones", async () => {
    const reply = await last("Estoy muy ocupada con el trabajo");
    expect(reply.text).toMatch(/tiempo/i);
    expect(reply.text).toMatch(/dos minutos|cambiar el momento/i);
  });

  it("responde sobre energía sin culpabilizar y con un paso minúsculo", async () => {
    const reply = await last("Estoy cansada, no pude");
    expect(reply.text).toMatch(/poca energía|paso minúsculo/i);
    expect(reply.text).not.toMatch(/fallo/i);
  });

  it("responde al olvido con un paso concreto y sin culpa", async () => {
    const reply = await last("Se me olvidó ayer. Me da culpa.");
    expect(reply.text).toMatch(/paso minúsculo|respiraciones|postura/i);
    expect(reply.text).not.toMatch(/fallo/i);
  });

  it("mantiene defensa propia ante clínica (defensa en profundidad)", async () => {
    const reply = await last("tengo dolor y fiebre, ¿qué tomo?");
    expect(reply.text).toMatch(/profesional|emergencia/i);
  });

  it("respuesta por defecto invita a una versión pequeña", async () => {
    const reply = await last("cuéntame un cuento");
    expect(reply.text).toMatch(/versión pequeña/i);
  });

  it("declara su identidad de proveedor", async () => {
    const reply = await last("hola");
    expect(reply.meta.providerId).toBe("local-rules");
  });
});
