import { describe, expect, it } from "vitest";
import { describeReplySource, parseReplySource } from "./source";

describe("origen de la respuesta (specs/025 FR-005)", () => {
  it("lee providerId del contrato BFF", () => {
    expect(parseReplySource({ text: "x", meta: { providerId: "remote" } })).toBe("remote");
    expect(parseReplySource({ text: "x", meta: { providerId: "local-rules" } })).toBe("local-rules");
  });

  it("valores ausentes o desconocidos → unknown, sin etiqueta engañosa", () => {
    for (const body of [null, "x", {}, { meta: null }, { meta: { providerId: "gpt" } }]) {
      expect(parseReplySource(body)).toBe("unknown");
    }
    expect(describeReplySource("unknown")).toBeNull();
  });

  it("cada origen conocido tiene una etiqueta llana distinta", () => {
    const remote = describeReplySource("remote");
    const local = describeReplySource("local-rules");
    expect(remote).toMatch(/modelo de lenguaje/);
    expect(local).toMatch(/reglas sencillas/);
    expect(remote).not.toBe(local);
  });
});
