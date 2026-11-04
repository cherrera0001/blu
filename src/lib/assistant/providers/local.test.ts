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

  it("responde sobre energía sin culpabilizar", async () => {
    const reply = await last("Estoy cansada, no pude");
    expect(reply.text).toMatch(/no es un fallo/i);
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
