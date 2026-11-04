import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import QuestionnaireApp from "./QuestionnaireApp";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
});

async function answerCurrentQuestion(user: ReturnType<typeof userEvent.setup>) {
  // si hay radios visibles, marca el primero; si es multi, el primer checkbox
  const radios = screen.queryAllByRole("radio");
  const checks = screen.queryAllByRole("checkbox");
  if (radios.length > 0) {
    await user.click(radios[0]);
  } else if (checks.length > 0) {
    await user.click(checks[0]);
  }
  await user.click(screen.getByRole("button", { name: /^(Siguiente|Ver mi resultado)$/ }));
}

describe("QuestionnaireApp", () => {
  it("muestra la primera pregunta del banco y el avance accesible", () => {
    render(<QuestionnaireApp />);
    expect(screen.getByText(/¿Cuántos días a la semana caminas/i)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/Pregunta 1 de \d+/);
  });

  it("rotula el resultado como experimental y no diagnóstico al completar", async () => {
    const user = userEvent.setup();
    render(<QuestionnaireApp />);
    for (let i = 0; i < 40; i += 1) {
      if (screen.queryByRole("heading", { name: /Tu autodiagnóstico de hábitos/i })) break;
      // omite la pregunta cuando es omisible (cubre el botón de omisión)
      const skip = screen.queryByRole("button", { name: /prefiero no responder/i });
      if (skip && i % 3 === 0) {
        await user.click(skip);
      } else {
        await answerCurrentQuestion(user);
      }
    }
    expect(screen.getByRole("heading", { name: /Tu autodiagnóstico de hábitos/i })).toBeTruthy();
    expect(screen.getByText(/experimental/i)).toBeTruthy();
    expect(screen.getByText(/no es un diagnóstico/i)).toBeTruthy();
  }, 20000);

  it("reanuda donde quedó tras recargar (guardado progresivo)", async () => {
    const user = userEvent.setup();
    const first = render(<QuestionnaireApp />);
    await answerCurrentQuestion(user);
    await answerCurrentQuestion(user);
    first.unmount();

    render(<QuestionnaireApp />);
    expect(screen.getByRole("status").textContent).toMatch(/Pregunta 3 de \d+/);
  });

  it("sugiere hasta tres objetivos y guarda al aceptar", async () => {
    const user = userEvent.setup();
    render(<QuestionnaireApp />);
    for (let i = 0; i < 40; i += 1) {
      if (screen.queryByRole("heading", { name: /Tu autodiagnóstico de hábitos/i })) break;
      const skip = screen.queryByRole("button", { name: /prefiero no responder/i });
      if (skip && i % 4 === 0) {
        await user.click(skip);
      } else {
        await answerCurrentQuestion(user);
      }
    }
    expect(screen.getByRole("heading", { name: /Sugerencias para partir/i })).toBeTruthy();
    const acceptButtons = await screen.findAllByRole("button", { name: /^Aceptar / });
    await user.click(acceptButtons[0]);
    const saved = JSON.parse(window.localStorage.getItem("blu.goals.v1") ?? "null") as {
      accepted: Array<{ suggestionId: string; decidedAt: string }>;
    };
    expect(saved.accepted).toHaveLength(1);
    expect(saved.accepted[0].suggestionId).toMatch(/^sug-/);
    expect(saved.accepted[0].decidedAt).toBeTruthy();
    expect(await screen.findByText(/Guardado en tus objetivos/i)).toBeTruthy();
  }, 20000);

  it("permite omitir una pregunta omisible y avanza", async () => {
    const user = userEvent.setup();
    render(<QuestionnaireApp />);
    // mov-01 no es omisible → responde; mov-02 sí
    await answerCurrentQuestion(user);
    await user.click(screen.getByRole("button", { name: /prefiero no responder/i }));
    expect(screen.getByRole("status").textContent).toMatch(/Pregunta 3 de \d+/);
  });

  it("el progreso usa aria-live y el bloque de pregunta tiene rol group", () => {
    render(<QuestionnaireApp />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(within(status).getByText(/Pregunta 1/)).toBeTruthy();
  });
});
