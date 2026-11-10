import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import BluApp from "./BluApp";
import QuestionnaireApp from "./cuestionario/QuestionnaireApp";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(
    "blu.onboarding.notice.v1",
    JSON.stringify({ version: "1.0.0", acceptedAt: "2026-11-04T00:00:00.000Z" }),
  );
});

function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria && aria.trim()) return aria.trim();
  if (el instanceof HTMLInputElement) {
    const viaLabels = el.labels ? Array.from(el.labels).map((l) => l.textContent ?? "").join(" ") : "";
    if (viaLabels.trim()) return viaLabels.trim();
    return "";
  }
  return (el.textContent ?? "").trim();
}

function expectControlsLabeled(container: HTMLElement) {
  const controls = container.querySelectorAll("button, a[href], input, select, textarea");
  const unnamed: string[] = [];
  controls.forEach((el) => {
    if (!accessibleName(el)) unnamed.push(el.outerHTML.slice(0, 120));
  });
  expect(unnamed).toEqual([]);
}

function expectSingleH1(container: HTMLElement) {
  expect(container.querySelectorAll("h1")).toHaveLength(1);
}

async function completeOnboarding(user: ReturnType<typeof userEvent.setup>) {
  const view = render(<BluApp />);
  await user.click(screen.getByRole("button", { name: "Movimiento natural" }));
  await user.click(
    screen.getByRole("checkbox", { name: /Entiendo que esto es un prototipo/ }),
  );
  await user.click(screen.getByRole("button", { name: "Empezar con lo que elegí" }));
  await screen.findByRole("region", { name: "Hábitos que elegiste" });
  return view;
}

describe("accesibilidad — smoke (BLU-1501, auditoría completa pendiente)", () => {
  it("onboarding: controles etiquetados y un solo h1", () => {
    const { container } = render(<BluApp />);
    expectControlsLabeled(container);
    expectSingleH1(container);
  });

  it("dashboard: controles etiquetados, jerarquía de títulos y región de estado", async () => {
    const user = userEvent.setup();
    const { container } = await completeOnboarding(user);
    expectControlsLabeled(container);
    expectSingleH1(container);
    expect(container.querySelectorAll("h2").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('[role="log"]')).not.toBeNull();
  });

  it("cuestionario: controles etiquetados y progreso anunciado", () => {
    const { container } = render(<QuestionnaireApp />);
    expectControlsLabeled(container);
    expectSingleH1(container);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toMatch(/Pregunta 1 de/);
  });

  it("cuestionario — aviso previo: controles etiquetados y salida sin guardar", () => {
    window.localStorage.clear();
    const { container } = render(<QuestionnaireApp />);
    expectControlsLabeled(container);
    expectSingleH1(container);
    expect(screen.getByRole("link", { name: /Volver sin guardar nada/i })).toBeTruthy();
  });
});
