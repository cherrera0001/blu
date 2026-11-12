import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInitialState, decodeState } from "blu-core/blu";
import { buildMobileExport, exportMessage, storedSummary } from "./export";

const NOW = new Date("2026-11-12T10:00:00.000Z");

describe("Exportar mis datos (specs/005 en móvil)", () => {
  it("usa la misma versión de formato que la web", () => {
    const web = readFileSync(join(__dirname, "../../../src/lib/export.ts"), "utf8");
    expect(web).toContain(`EXPORT_FORMAT_VERSION = "${buildMobileExport(createInitialState(), NOW).formatVersion}"`);
  });

  it("el estado exportado se puede volver a leer sin pérdida", () => {
    const state = { ...createInitialState(), selectedHabitIds: ["rest" as const], voicePreference: "device" as const };
    const bundle = buildMobileExport(state, NOW);
    const roundTrip = decodeState(JSON.stringify(JSON.parse(exportMessage(bundle).split("\n\n")[1]).state));
    expect(roundTrip.selectedHabitIds).toEqual(["rest"]);
    expect(roundTrip.voicePreference).toBe("device");
  });

  it("no incluye conversaciones ni identificadores del dispositivo", () => {
    const text = JSON.stringify(buildMobileExport(createInitialState(), NOW));
    expect(text).not.toMatch(/messages|deviceId|installationId|token/i);
  });

  it("el resumen explica en llano qué se guarda", () => {
    expect(storedSummary(createInitialState())).toContain("Las conversaciones con Blu no se guardan.");
  });
});

describe("exportación incluye revisiones semanales (ola B)", () => {
  it("las revisiones van en `reviews`, como en la web", () => {
    const weeklyReviews = [{ weekKey: "2026-W46", felt: "same" as const, updatedAt: "t" }];
    const bundle = buildMobileExport({ ...createInitialState(), weeklyReviews }, NOW);
    expect(bundle.reviews).toEqual(weeklyReviews);
  });
});
