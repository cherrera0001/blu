import { describe, expect, it } from "vitest";
import { createInitialState } from "./blu";
import { parsePortrait, refinePortrait, refinementLine } from "./portrait";

describe("retrato declarativo", () => {
  it("acepta una declaración válida y rechaza niveles inventados", () => {
    expect(
      parsePortrait({
        version: 1,
        declaredAt: "2026-11-09T12:00:00.000Z",
        levels: { movement: "cuesta" },
      })?.levels.movement,
    ).toBe("cuesta");
    expect(parsePortrait({ version: 1, declaredAt: "2026-11-09T12:00:00.000Z", levels: { movement: "alto" } })).toBeNull();
  });

  it("empieza por lo declarado y se afina con los días marcados, sin puntaje", () => {
    expect(refinementLine("cuesta", 0, 14)).toMatch(/Declaraste/);
    expect(refinementLine("cuesta", 0, 14)).not.toMatch(/\d+\s*\/\s*100|diagnóstico|nota/);

    const refined = refinePortrait(
      {
        version: 1,
        declaredAt: "2026-11-01T00:00:00.000Z",
        levels: { movement: "cuesta" },
      },
      {
        ...createInitialState(),
        selectedHabitIds: ["movement"],
        checkInsByDate: { "2026-11-09": ["movement"], "2026-11-08": ["movement"] },
      },
      new Date(2026, 10, 9, 12),
    );
    expect(refined.habits[0].marks).toBe(2);
    expect(refined.habits[0].line).toMatch(/2 veces/);
    expect(refined.observedDays).toBe(2);
  });
});
