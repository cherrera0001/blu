import { beforeEach, describe, expect, it } from "vitest";
import {
  ONBOARDING_NOTICE_VERSION,
  acceptNotice,
  clearNotice,
  loadNotice,
} from "./notice";

const STORAGE_KEY = "blu.onboarding.notice.v1";

beforeEach(() => {
  window.localStorage.clear();
});

describe("loadNotice", () => {
  it("sin aceptación guardada reporta ausencia sin error", () => {
    expect(loadNotice()).toEqual({ accepted: null, error: null, outdated: false });
  });

  it("acepta solo la versión vigente del aviso", () => {
    acceptNotice("2026-11-04T00:00:00.000Z");
    const snapshot = loadNotice();
    expect(snapshot.error).toBeNull();
    expect(snapshot.outdated).toBe(false);
    expect(snapshot.accepted).toEqual({
      version: ONBOARDING_NOTICE_VERSION,
      acceptedAt: "2026-11-04T00:00:00.000Z",
    });
  });

  it("trata una aceptación de versión anterior como inválida (outdated)", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: "0.9.0", acceptedAt: "2026-10-01T00:00:00.000Z" }),
    );
    const snapshot = loadNotice();
    expect(snapshot.accepted).toBeNull();
    expect(snapshot.error).toBeNull();
    expect(snapshot.outdated).toBe(true);
  });

  it("trata una aceptación de versión posterior como inválida (outdated)", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: "9.9.9", acceptedAt: "2026-11-01T00:00:00.000Z" }),
    );
    const snapshot = loadNotice();
    expect(snapshot.accepted).toBeNull();
    expect(snapshot.outdated).toBe(true);
  });

  it("reporta error visible si el aviso guardado no se puede leer", () => {
    window.localStorage.setItem(STORAGE_KEY, "{mal");
    const snapshot = loadNotice();
    expect(snapshot.accepted).toBeNull();
    expect(snapshot.error).toMatch(/no se puede leer/i);
    expect(snapshot.outdated).toBe(false);
  });

  it("reporta error visible si el formato no es el esperado", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1 }));
    expect(loadNotice().error).toMatch(/formato esperado/i);
  });
});

describe("acceptNotice", () => {
  it("guarda la aceptación con la versión vigente", () => {
    const result = acceptNotice("2026-11-04T12:00:00.000Z");
    expect(result.ok).toBe(true);
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as {
      version: string;
      acceptedAt: string;
    };
    expect(raw.version).toBe(ONBOARDING_NOTICE_VERSION);
    expect(raw.acceptedAt).toBe("2026-11-04T12:00:00.000Z");
  });
});

describe("clearNotice", () => {
  it("elimina la aceptación guardada", () => {
    acceptNotice("2026-11-04T12:00:00.000Z");
    expect(clearNotice()).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
