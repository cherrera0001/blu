import { describe, expect, it } from "vitest";
import {
  assertNoDirectIdentifiers,
  assertResearchExportAllowed,
  buildResearchDataset,
  createExportAccessLog,
  exportGateStatus,
  type ParticipantMetrics,
} from "./export";

function metrics(overrides: Partial<ParticipantMetrics> = {}): ParticipantMetrics {
  return {
    participantKey: "pk-1",
    week: "2026-W45",
    habitId: "movement",
    checkInsDone: 4,
    checkInsTotal: 7,
    feedbackNotUseful: 0,
    ...overrides,
  };
}

function group(n: number, prefix = "pk"): ParticipantMetrics[] {
  return Array.from({ length: n }, (_, i) => metrics({ participantKey: `${prefix}-${i + 1}` }));
}

describe("consentimiento — casos negativos adicionales", () => {
  it("retirar el consentimiento a mitad de la cohorte excluye a la persona", () => {
    const revoked = new Set<string>();
    const consent = (key: string) => !revoked.has(key);
    const data = [...group(3, "a"), ...group(3, "b"), metrics({ participantKey: "c-1" })];
    revoked.add("b-2");
    revoked.add("c-1");
    const out = buildResearchDataset(data, consent, { generatedAt: "t" });
    expect(out.includedParticipants).toBe(5);
    expect(out.excludedNoConsent).toBe(2);
    expect(JSON.stringify(out.rows)).not.toContain("b-2");
    expect(JSON.stringify(out.rows)).not.toContain("c-1");
  });

  it("callback de consentimiento que falla → fail-closed: nadie entra, nada se rompe", () => {
    const out = buildResearchDataset(group(6), () => {
      throw new Error("almacenamiento de consentimiento caído");
    }, { generatedAt: "t" });
    expect(out.includedParticipants).toBe(0);
    expect(out.rows).toHaveLength(0);
  });
});

describe("cruce entre exportaciones — riesgo de reidentificación por vinculación", () => {
  it("fusionar dos olas del piloto no habilita unión a persona: sin claves, sin identificadores", () => {
    const wave1 = buildResearchDataset(
      group(5, "w1").map((m) => ({ ...m, week: "2026-W45" })),
      () => true,
      { generatedAt: "t" },
    );
    const wave2 = buildResearchDataset(
      group(5, "w2").map((m) => ({ ...m, week: "2026-W46" })),
      () => true,
      { generatedAt: "t" },
    );
    const merged = { datasetVersion: "1", generatedAt: "t", k: 5, rows: [...wave1.rows, ...wave2.rows] };
    expect(assertNoDirectIdentifiers(merged)).toBe(true);
    expect(JSON.stringify(merged)).not.toContain("w1-");
    expect(JSON.stringify(merged)).not.toContain("w2-");
    // Las filas de distintas olas solo se distinguen por semana × hábito (agregado).
    for (const row of merged.rows) {
      expect(Object.keys(row).sort()).toEqual(
        ["checkInsDone", "checkInsTotal", "feedbackNotUseful", "habitId", "participants", "week"],
      );
    }
  });
});

describe("gate operativo — exportación bloqueada sin aprobaciones", () => {
  it("sin protocolo ni firmas: bloqueado con razones explícitas", () => {
    const status = exportGateStatus({ protocolApproved: false, privacySignoffs: false });
    expect(status.allowed).toBe(false);
    expect(status.blockedBy).toContain("protocolo_investigacion_no_aprobado");
    expect(status.blockedBy).toContain("firmas_privacidad_pendientes");
  });

  it("con protocolo aprobado pero sin firmas: sigue bloqueado", () => {
    const status = exportGateStatus({ protocolApproved: true, privacySignoffs: false });
    expect(status.allowed).toBe(false);
    expect(status.blockedBy).toEqual(["firmas_privacidad_pendientes"]);
  });

  it("assertResearchExportAllowed lanza error estable cuando el gate bloquea", () => {
    const status = exportGateStatus({ protocolApproved: false, privacySignoffs: false });
    expect(() => assertResearchExportAllowed(status)).toThrowError(/exportacion_bloqueada/);
  });

  it("con todas las aprobaciones: permitido", () => {
    const status = exportGateStatus({ protocolApproved: true, privacySignoffs: true });
    expect(status.allowed).toBe(true);
    expect(status.blockedBy).toEqual([]);
    expect(() => assertResearchExportAllowed(status)).not.toThrow();
  });
});

describe("trazabilidad de accesos a exportaciones", () => {
  it("registra actor, fecha y tamaño; rechaza entradas incompletas", () => {
    const log = createExportAccessLog();
    expect(log.record({ actor: "investigadora-a", at: "2026-11-06T10:00:00Z", rows: 3, suppressedCells: 1 }).ok).toBe(true);
    expect(log.record({ actor: "  ", at: "2026-11-06T10:00:00Z", rows: 3 }).ok).toBe(false);
    expect(log.record({ actor: "x", at: "ayer", rows: 3 }).ok).toBe(false);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ actor: "investigadora-a", rows: 3 });
  });

  it("buffer acotado: las entradas más antiguas se descartan", () => {
    const log = createExportAccessLog({ bufferSize: 2 });
    for (let i = 0; i < 4; i += 1) {
      log.record({ actor: `actor-${i}`, at: "2026-11-06T10:00:00Z", rows: 1 });
    }
    expect(log.entries).toHaveLength(2);
    expect(log.entries[0].actor).toBe("actor-2");
  });

  it("el log de accesos no contiene datos del dataset (solo metadatos)", () => {
    const log = createExportAccessLog();
    log.record({ actor: "a", at: "2026-11-06T10:00:00Z", rows: 5, suppressedCells: 0 });
    expect(JSON.stringify(log.entries)).not.toContain("habitId");
    expect(JSON.stringify(log.entries)).not.toContain("week");
  });
});
