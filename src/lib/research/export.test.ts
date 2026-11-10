import { describe, expect, it } from "vitest";
import {
  assertNoDirectIdentifiers,
  buildResearchDataset,
  type ParticipantMetrics,
} from "./export";

function metrics(overrides: Partial<ParticipantMetrics> = {}): ParticipantMetrics {
  return {
    participantKey: "pk-1",
    week: "2026-W45",
    habitId: "movement",
    checkInsDone: 4,
    checkInsTotal: 7,
    feedbackNotUseful: 1,
    ...overrides,
  };
}

/** n personas consentidas con la misma semana/hábito. */
function consentedGroup(n: number, keyPrefix = "pk"): ParticipantMetrics[] {
  return Array.from({ length: n }, (_, i) =>
    metrics({ participantKey: `${keyPrefix}-${i + 1}` }),
  );
}

describe("buildResearchDataset — solo consentido y agregado", () => {
  it("excluye a las personas sin consentimiento de investigación", () => {
    const out = buildResearchDataset(
      [...consentedGroup(6), metrics({ participantKey: "pk-sin-consentimiento" })],
      (key) => key !== "pk-sin-consentimiento",
      { generatedAt: "2026-11-06T10:00:00Z" },
    );
    expect(out.excludedNoConsent).toBe(1);
    expect(out.includedParticipants).toBe(6);
    // Las filas agregadas no contienen participantKey.
    expect(JSON.stringify(out.rows)).not.toContain("pk-");
  });

  it("agrega por semana × hábito: conteos, nunca eventos individuales", () => {
    const out = buildResearchDataset(
      consentedGroup(5),
      () => true,
      { generatedAt: "2026-11-06T10:00:00Z" },
    );
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]).toMatchObject({
      week: "2026-W45",
      habitId: "movement",
      participants: 5,
      checkInsDone: 20,
      checkInsTotal: 35,
      feedbackNotUseful: 5,
    });
  });

  it("k-anonimato mínimo: celda con menos de k participantes se suprime", () => {
    const out = buildResearchDataset(
      [...consentedGroup(6, "grande"), ...consentedGroup(3, "chica").map((m) => ({ ...m, habitId: "rest" }))],
      () => true,
      { k: 5, generatedAt: "2026-11-06T10:00:00Z" },
    );
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].habitId).toBe("movement");
    expect(out.suppressedCells).toBe(1);
  });

  it("dos semanas distintas producen filas separadas", () => {
    const out = buildResearchDataset(
      [
        ...consentedGroup(5, "a").map((m) => ({ ...m, week: "2026-W44" })),
        ...consentedGroup(5, "b").map((m) => ({ ...m, week: "2026-W45" })),
      ],
      () => true,
      { generatedAt: "2026-11-06T10:00:00Z" },
    );
    expect(out.rows).toHaveLength(2);
  });
});

describe("assertNoDirectIdentifiers — guard de reidentificación", () => {
  it("rechaza cualquier campo tipo email, nombre, RUT, teléfono o IP", () => {
    for (const bad of ["email", "name", "nombre", "rut", "phone", "telefono", "ip", "deviceId", "address"]) {
      const bundle = { datasetVersion: "1", rows: [{ [bad]: "x" }] };
      expect(assertNoDirectIdentifiers(bundle)).toBe(false);
    }
  });

  it("acepta el bundle del dataset agregado", () => {
    const out = buildResearchDataset(
      consentedGroup(5),
      () => true,
      { generatedAt: "2026-11-06T10:00:00Z" },
    );
    expect(assertNoDirectIdentifiers(out)).toBe(true);
  });
});
