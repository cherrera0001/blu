import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import axe from "axe-core";
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

/** color-contrast requiere layout; jsdom no lo calcula. El resto corre completo. */
async function expectNoA11yViolations(container: HTMLElement, context: string) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  const serious = results.violations.filter((v) => v.impact !== "minor");
  const report = serious
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target).join(", ")}`)
    .join("\n");
  expect(serious, `${context}\n${report}`).toEqual([]);
}

describe("auditoría WCAG con axe-core (BLU-1501)", () => {
  it("onboarding sin violaciones serias", async () => {
    const { container } = render(<BluApp />);
    await expectNoA11yViolations(container, "onboarding");
  });

  it("dashboard sin violaciones serias", async () => {
    const user = userEvent.setup();
    const { container } = render(<BluApp />);
    await user.click(screen.getByRole("button", { name: "Movimiento natural" }));
    await user.click(
      screen.getByRole("checkbox", { name: /Entiendo que esto es un prototipo/ }),
    );
    await user.click(screen.getByRole("button", { name: "Continuar con lo que elegí" }));
    await screen.findByRole("region", { name: "Hábitos que elegiste" });
    await expectNoA11yViolations(container, "dashboard");
  });

  it("cuestionario (primera pregunta) sin violaciones serias", async () => {
    const { container } = render(<QuestionnaireApp />);
    await screen.findByText(/¿Cuántos días a la semana caminas/i);
    await expectNoA11yViolations(container, "cuestionario");
  });

  it("aviso previo del cuestionario sin violaciones serias", async () => {
    window.localStorage.clear();
    const { container } = render(<QuestionnaireApp />);
    await screen.findByRole("heading", { name: /Antes de empezar, un aviso/i });
    await expectNoA11yViolations(container, "aviso previo");
  });
});
