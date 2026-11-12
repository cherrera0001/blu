import { describe, expect, it } from "vitest";
import { reviewReply } from "./review-copy";

describe("respuesta de Blu a la revisión semanal", () => {
  it("saltar también recibe una respuesta amable", () => {
    expect(reviewReply({})).toMatch(/Está bien/);
  });

  it("una semana difícil se acompaña, no se evalúa", () => {
    const text = reviewReply({ felt: "harder", decision: "adjust" });
    expect(text).toMatch(/semanas difíciles también cuentan/);
    expect(text).toMatch(/Nada cambia hasta que tú lo elijas/);
  });

  it("nunca usa lenguaje de logro, puntaje ni culpa", () => {
    const all = (["better", "same", "harder"] as const).flatMap((felt) =>
      (["keep", "adjust", undefined] as const).map((decision) => reviewReply({ felt, decision })),
    );
    for (const t of all) {
      expect(t).not.toMatch(/racha|puntos|nivel|fallaste|deberías|meta cumplida|%/i);
    }
  });
});
