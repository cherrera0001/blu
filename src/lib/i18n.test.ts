import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("translate", () => {
  it("conserva el castellano como texto fuente", () => {
    expect(translate("es", "Hoy, elige un paso a tu ritmo.")).toBe("Hoy, elige un paso a tu ritmo.");
  });

  it("traduce a inglés de Estados Unidos y a chino mandarín", () => {
    expect(translate("en-US", "Me cuesta")).toBe("This is hard for me");
    expect(translate("zh-CN", "Me cuesta")).toBe("我觉得难");
    expect(translate("en-US", "Movimiento natural")).toBe("Natural movement");
    expect(translate("zh-CN", "Propósito")).toBe("目标感");
  });

  it("si no hay entrada, deja el castellano en cualquier idioma", () => {
    expect(translate("en-US", "frase aún no catalogada")).toBe("frase aún no catalogada");
    expect(translate("zh-CN", "frase aún no catalogada")).toBe("frase aún no catalogada");
  });
});
