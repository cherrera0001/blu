import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("manifest instalable (BLU-1503)", () => {
  const m = manifest();

  it("expone metadatos esenciales en español y modo standalone", () => {
    expect(m.name).toContain("Blu");
    expect(m.lang).toBe("es");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.id).toBe("/");
  });

  it("usa los tokens de diseño para colores", () => {
    expect(m.theme_color).toBe("#2f8fbf");
    expect(m.background_color).toBe("#faf6ef");
  });

  it("declara iconos vectoriales 192 y 512 desde la identidad propia de Blu", () => {
    const icons = m.icons ?? [];
    const sizes = icons.flatMap((i) => (i.sizes ?? "").split(" "));
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(icons.every((i) => i.src === "/blu-newspaper.png")).toBe(true);
    expect(icons.every((i) => i.type === "image/svg+xml")).toBe(true);
    expect(icons.every((i) => (i.src ?? "").startsWith("/"))).toBe(true);
  });

  it("no promete capacidades clínicas ni de eficacia en la descripción", () => {
    // La descripción NIEGA lo clínico («no es una aplicación clínica»): lo correcto.
    // Lo prohibido es PROMETER: curar, prevenir, garantizar, tratar.
    expect(m.description ?? "").not.toMatch(/cura|previene|garantiza|trata enfermedades/i);
  });
});
