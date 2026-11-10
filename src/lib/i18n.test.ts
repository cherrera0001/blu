import { describe, expect, it } from "vitest";
import { translate } from "./i18n";
import bank from "../data/onboarding/bank.json";
import catalog from "../data/habits/catalog.json";
import education from "../data/habits/education.json";
import { HABITS } from "./blu";

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

  it("traduce el cuestionario, el catálogo y las acciones que se ven en pantalla", () => {
    const sources = visibleCopy();
    const missing = sources.filter(
      (source) => translate("en-US", source) === source || translate("zh-CN", source) === source,
    );
    expect(missing).toEqual([]);
  });
});

function visibleCopy(): string[] {
  const found = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && value.trim()) found.add(value);
  };
  add(bank.disclaimer);
  for (const principle of bank.principles) {
    add(principle.title);
    add(principle.subtitle);
    for (const question of principle.questions) {
      add(question.text);
      add(question.likertAnchors?.low);
      add(question.likertAnchors?.high);
      for (const option of question.options ?? []) add(option.label);
    }
  }
  add(catalog.disclaimer);
  for (const principle of catalog.principles) {
    for (const item of principle.items) {
      add(item.title);
      add(item.action);
      add(item.smallerAction);
    }
  }
  add(education.disclaimer);
  for (const principle of education.principles) {
    for (const note of principle.notes) {
      add(note.title);
      add(note.text);
      add(note.sourceLabel);
    }
  }
  for (const habit of HABITS) {
    add(habit.description);
    add(habit.action);
    add(habit.smallerAction);
  }
  return [...found];
}
