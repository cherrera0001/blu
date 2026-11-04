import { describe, expect, it } from "vitest";
import {
  loadEducation,
  validateEducation,
  type HabitEducation,
} from "./habit-education";
import educationJson from "@/data/habits/education.json";

describe("validateEducation — política editorial (BLU-303/403/503/603/703/803/903)", () => {
  it("acepta el contenido empaquetado: 7 principios con >= 2 notas y fuente declarada", () => {
    const education = loadEducation();
    expect(education.principles).toHaveLength(7);
    for (const p of education.principles) {
      expect(p.notes.length).toBeGreaterThanOrEqual(2);
      for (const note of p.notes) {
        expect(note.sourceLabel.length).toBeGreaterThan(0);
        expect(["pendiente", "verificada"]).toContain(note.sourceStatus);
      }
    }
  });

  it("todas las fuentes inician como pendientes (honestidad BLU-303)", () => {
    const education = loadEducation();
    for (const p of education.principles) {
      for (const note of p.notes) {
        expect(note.sourceStatus).toBe("pendiente");
      }
    }
  });

  it("rechaza afirmaciones de eficacia o causalidad", () => {
    const raw = JSON.parse(JSON.stringify(educationJson)) as HabitEducation;
    raw.principles[0].notes[0].text = "Caminar previene enfermedades y te hará vivir más años.";
    expect(() => validateEducation(raw)).toThrow(/afirmación prohibida/);
  });

  it("rechaza menos de 2 notas por principio", () => {
    const raw = JSON.parse(JSON.stringify(educationJson)) as HabitEducation;
    raw.principles[0].notes = raw.principles[0].notes.slice(0, 1);
    expect(() => validateEducation(raw)).toThrow(/2 notas/);
  });

  it("rechaza fuente sin etiqueta o estado inválido", () => {
    const raw = JSON.parse(JSON.stringify(educationJson)) as HabitEducation;
    raw.principles[0].notes[0].sourceLabel = "";
    expect(() => validateEducation(raw)).toThrow(/fuente/);
    const raw2 = JSON.parse(JSON.stringify(educationJson)) as HabitEducation;
    (raw2.principles[0].notes[0] as { sourceStatus: string }).sourceStatus = "magic";
    expect(() => validateEducation(raw2)).toThrow(/estado de fuente inválido/);
  });

  it("rechaza texto fuera de rango", () => {
    const raw = JSON.parse(JSON.stringify(educationJson)) as HabitEducation;
    raw.principles[0].notes[0].text = "corto";
    expect(() => validateEducation(raw)).toThrow(/texto inválido/);
  });
});
