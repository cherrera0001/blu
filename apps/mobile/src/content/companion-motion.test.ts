import { describe, expect, it } from "vitest";
import { HOP_MS, reactionFor } from "./companion-motion";

describe("reacción de Blu (H7)", () => {
  it("salta suave cuando la persona da un paso", () => {
    expect(reactionFor("waiting", "encouraging")).toBe("hop");
    expect(reactionFor("encouraging", "celebrate")).toBe("hop");
    expect(reactionFor("resting", "celebrate")).toBe("hop");
  });

  it("al desmarcar solo cambia la frase, sin gesto que se lea como reproche", () => {
    expect(reactionFor("celebrate", "encouraging")).toBe("fade");
    expect(reactionFor("encouraging", "waiting")).toBe("fade");
  });

  it("no reacciona al abrir la app ni si el ánimo no cambia", () => {
    expect(reactionFor(null, "celebrate")).toBeNull();
    expect(reactionFor("waiting", "waiting")).toBeNull();
  });

  it("el gesto dura menos de 600 ms", () => {
    expect(HOP_MS).toBeLessThanOrEqual(600);
  });
});
