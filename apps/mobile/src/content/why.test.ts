import { describe, expect, it } from "vitest";
import { HABITS } from "blu-core/blu";
import { WHY_DISCLAIMER, whyNotes } from "./why";

describe("«¿Por qué este paso?» (BLU-1304 en móvil)", () => {
  it("cada uno de los 7 temas tiene al menos una nota breve con fuente", () => {
    for (const habit of HABITS) {
      const notes = whyNotes(habit.id);
      expect(notes.length, habit.id).toBeGreaterThan(0);
      for (const n of notes) {
        expect(n.text.length).toBeLessThan(400);
        expect(n.sourceLine).toMatch(/^Fuente: .+/);
      }
    }
  });

  it("deny-by-default: sin registro de evidencia, nada aparece como verificado", () => {
    for (const habit of HABITS) {
      for (const n of whyNotes(habit.id)) {
        expect(n.sourceLine).toMatch(/\(sin evidencia verificada\)$/);
        expect(n.sourceLine).not.toMatch(/\(verificada/);
      }
    }
  });

  it("el aviso general no afirma eficacia", () => {
    expect(WHY_DISCLAIMER).toMatch(/no afirmamos eficacia/);
  });
});
