import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  acceptPurpose,
  emptyConsent,
  hasPurpose,
  migrateLegacy,
  needsReconsent,
  withdrawPurpose,
  type ConsentState,
} from "./consent";
import { decodeState, createInitialState } from "./blu";

describe("consent domain", () => {
  it("emptyConsent refleja la versión vigente sin propósitos", () => {
    const c = emptyConsent();
    expect(c.version).toBe(CONSENT_VERSION);
    expect(c.purposes).toEqual({});
  });

  it("migrateLegacy convierte consentAcceptedAt en operativo@1.0.0", () => {
    const legacy = migrateLegacy("2026-11-01T10:00:00.000Z");
    expect(legacy.version).toBe("1.0.0");
    expect(legacy.purposes.operativo?.acceptedAt).toBe("2026-11-01T10:00:00.000Z");
    expect(hasPurpose(legacy, "mejora")).toBe(false);
  });

  it("migrateLegacy sin fecha produce consentimiento vacío", () => {
    const c = migrateLegacy(null);
    expect(c.purposes.operativo).toBeUndefined();
  });

  it("acceptPurpose fija la versión vigente con fecha", () => {
    const c = acceptPurpose(emptyConsent(), "investigacion", "2026-11-04T10:00:00.000Z");
    expect(c.version).toBe(CONSENT_VERSION);
    expect(c.purposes.investigacion?.acceptedAt).toBe("2026-11-04T10:00:00.000Z");
    expect(hasPurpose(c, "mejora")).toBe(false);
  });

  it("acceptPurpose operativo habilita el guardado de datos", () => {
    const c = acceptPurpose(emptyConsent(), "operativo", "t");
    expect(hasPurpose(c, "operativo")).toBe(true);
  });

  it("withdrawPurpose retira sin borrar otros propósitos ni fechas históricas de versión", () => {
    let c = acceptPurpose(emptyConsent(), "mejora", "2026-11-04T09:00:00.000Z");
    c = acceptPurpose(c, "investigacion", "2026-11-04T09:05:00.000Z");
    c = withdrawPurpose(c, "mejora", "2026-11-04T11:00:00.000Z");
    expect(hasPurpose(c, "mejora")).toBe(false);
    expect(hasPurpose(c, "investigacion")).toBe(true);
    expect(c.updatedAt).toBe("2026-11-04T11:00:00.000Z");
  });

  it("needsReconsent solo cuando la versión difiere de la vigente", () => {
    expect(needsReconsent(migrateLegacy("2026-11-01T10:00:00.000Z"))).toBe(true);
    const vigente = acceptPurpose(emptyConsent(), "operativo", "t");
    expect(needsReconsent(vigente)).toBe(false);
  });
});

describe("decodeState — integración y migración (FR-005, FR-006)", () => {
  it("estado legacy sin campo consent migra a operativo@1.0.0", () => {
    const legacy = {
      consentAcceptedAt: "2026-11-01T10:00:00.000Z",
      selectedHabitIds: ["movement"],
      checkInsByDate: {},
      adaptations: [],
    };
    const state = decodeState(JSON.stringify(legacy));
    expect(state.consent.version).toBe("1.0.0");
    expect(state.consent.purposes.operativo?.acceptedAt).toBe("2026-11-01T10:00:00.000Z");
    expect(state.consentAcceptedAt).toBe("2026-11-01T10:00:00.000Z"); // back-compat
  });

  it("estado con consentimiento vigente se conserva tal cual", () => {
    const consent: ConsentState = {
      version: CONSENT_VERSION,
      purposes: { operativo: { acceptedAt: "2026-11-04T10:00:00.000Z" } },
      updatedAt: "2026-11-04T10:00:00.000Z",
    };
    const raw = JSON.stringify({ ...createInitialState(), consent });
    const state = decodeState(raw);
    expect(state.consent.purposes.operativo?.acceptedAt).toBe("2026-11-04T10:00:00.000Z");
  });

  it("consentimiento con estructura inválida produce error visible", () => {
    const raw = JSON.stringify({
      ...createInitialState(),
      consent: { version: 2, purposes: "x" },
    });
    expect(() => decodeState(raw)).toThrow(/consentimiento/i);
  });

  it("createInitialState incluye consentimiento vacío vigente", () => {
    const state = createInitialState();
    expect(state.consent.version).toBe(CONSENT_VERSION);
    expect(state.consent.purposes).toEqual({});
  });
});
