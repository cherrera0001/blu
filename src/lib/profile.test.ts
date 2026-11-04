import { beforeEach, describe, expect, it } from "vitest";
import { loadProfile, saveNickname } from "./profile";

beforeEach(() => {
  window.localStorage.clear();
});

describe("perfil local mínimo (BLU-101)", () => {
  it("guarda y recupera un apodo opcional con verificación", () => {
    const saved = saveNickname("  Cris  ", "2026-11-04T12:00:00.000Z");
    expect(saved.ok).toBe(true);
    const loaded = loadProfile();
    expect(loaded.error).toBeNull();
    expect(loaded.profile?.nickname).toBe("Cris");
    expect(loaded.profile?.updatedAt).toBe("2026-11-04T12:00:00.000Z");
  });

  it("null limpia el apodo", () => {
    saveNickname("Cris", "t");
    expect(saveNickname(null, "t2").ok).toBe(true);
    expect(loadProfile().profile?.nickname).toBeNull();
  });

  it("recorta al máximo permitido", () => {
    saveNickname("x".repeat(50), "t");
    expect(loadProfile().profile?.nickname).toHaveLength(24);
  });

  it("estado corrupto produce error visible", () => {
    window.localStorage.setItem("blu.profile.v1", "{mal");
    const loaded = loadProfile();
    expect(loaded.profile).toBeNull();
    expect(loaded.error).toMatch(/no se puede leer/i);
  });

  it("sin perfil guardado no hay error", () => {
    expect(loadProfile()).toEqual({ profile: null, error: null });
  });
});
