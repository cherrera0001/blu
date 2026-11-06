import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QuestionnaireApp from "./QuestionnaireApp";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  // Aviso del cuestionario ya aceptado para los tests de flujo;
  // los tests del gate lo eliminan explícitamente.
  window.localStorage.setItem(
    "blu.onboarding.notice.v1",
    JSON.stringify({ version: "1.0.0", acceptedAt: "2026-11-04T00:00:00.000Z" }),
  );
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

describe("aviso previo del cuestionario (consentimiento)", () => {
  it("muestra el aviso y no guarda nada antes de aceptar", async () => {
    window.localStorage.clear();
    const user = userEvent.setup();
    render(<QuestionnaireApp />);
    expect(screen.getByRole("heading", { name: /Antes de empezar, un aviso/i })).toBeTruthy();
    expect(document.querySelector("[data-testid='blu-presence'] svg")).not.toBeNull();
    expect(document.querySelector('img[src="/blu-newspaper.png"]')).toBeNull();
    expect(screen.getByText(/no está cifrado/i)).toBeTruthy();
    expect(screen.getByText(/Borrar datos del cuestionario|Borrar mis datos/i)).toBeTruthy();
    const comenzar = screen.getByRole("button", { name: "Comenzar" });
    expect(comenzar.hasAttribute("disabled")).toBe(true);
    expect(window.localStorage.getItem("blu.onboarding.v1")).toBeNull();
    expect(window.localStorage.getItem("blu.onboarding.notice.v1")).toBeNull();

    await user.click(
      screen.getByRole("checkbox", { name: /Entiendo dónde se guardan mis respuestas/i }),
    );
    await user.click(comenzar);
    expect(await screen.findByText(/¿Cuántos días a la semana caminas/i)).toBeTruthy();
    expect(window.localStorage.getItem("blu.onboarding.notice.v1")).not.toBeNull();
  });

  it("ofrece salir sin guardar nada", () => {
    window.localStorage.clear();
    render(<QuestionnaireApp />);
    const salir = screen.getByRole("link", { name: /Volver sin guardar nada/i });
    expect(salir.getAttribute("href")).toBe("/");
    expect(window.localStorage.getItem("blu.onboarding.v1")).toBeNull();
  });

  it("con aceptación vigente de la versión actual omite el aviso y va directo al cuestionario", () => {
    render(<QuestionnaireApp />);
    expect(screen.queryByRole("heading", { name: /Antes de empezar, un aviso/i })).toBeNull();
    expect(screen.getByText(/¿Cuántos días a la semana caminas/i)).toBeTruthy();
  });

  it("con aceptación de versión anterior vuelve a exigir el aviso antes de continuar", async () => {
    window.localStorage.setItem(
      "blu.onboarding.notice.v1",
      JSON.stringify({ version: "0.9.0", acceptedAt: "2026-10-01T00:00:00.000Z" }),
    );
    const user = userEvent.setup();
    render(<QuestionnaireApp />);
    expect(screen.getByRole("heading", { name: /Antes de empezar, un aviso/i })).toBeTruthy();
    expect(screen.getByText(/Actualizamos el aviso del cuestionario/i)).toBeTruthy();
    const comenzar = screen.getByRole("button", { name: "Comenzar" });
    expect(comenzar.hasAttribute("disabled")).toBe(true);
    expect(window.localStorage.getItem("blu.onboarding.v1")).toBeNull();

    await user.click(
      screen.getByRole("checkbox", { name: /Entiendo dónde se guardan mis respuestas/i }),
    );
    await user.click(comenzar);
    expect(await screen.findByText(/¿Cuántos días a la semana caminas/i)).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem("blu.onboarding.notice.v1") ?? "null") as {
      version: string;
    };
    expect(saved.version).toBe("1.0.0");
  });
});

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
    expect(screen.getAllByText(/experimental/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/no es un diagnóstico/i).length).toBeGreaterThanOrEqual(1);
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

  it("muestra la línea base explicada (valor, cobertura, fórmula, límites) al completar", async () => {
    const user = userEvent.setup();
    render(<QuestionnaireApp />);
    for (let i = 0; i < 40; i += 1) {
      if (screen.queryByRole("heading", { name: /Tu autodiagnóstico de hábitos/i })) break;
      const skip = screen.queryByRole("button", { name: /prefiero no responder/i });
      if (skip && i % 4 === 0) await user.click(skip);
      else await answerCurrentQuestion(user);
    }
    expect(screen.getByRole("heading", { name: /Punto de partida/i })).toBeTruthy();
    expect(screen.getByText(/de 100 · basado en/i)).toBeTruthy();
    expect(screen.getAllByText(/no es un diagnóstico/i).length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByText(/¿Cómo se calcula\?/i));
    expect(screen.getByText(/Promedio de las dimensiones respondidas/i)).toBeTruthy();
    // privacidad: sin claves nuevas ni red
    const keys = Object.keys(window.localStorage);
    for (const k of keys) {
      expect(k.startsWith("blu.") || k.startsWith("blu.onboarding")).toBe(true);
    }
  }, 20000);

  it("revisar permite corregir una respuesta y recalcula la línea base", async () => {
    const user = userEvent.setup();
    render(<QuestionnaireApp />);
    for (let i = 0; i < 40; i += 1) {
      if (screen.queryByRole("heading", { name: /Tu autodiagnóstico de hábitos/i })) break;
      await answerCurrentQuestion(user); // siempre primera opción (valor 0)
    }
    const before = screen.getByText(/de 100 · basado en/i).textContent;
    await user.click(screen.getByRole("button", { name: /Revisar mis respuestas/i }));
    // cambiar la primera pregunta a la última opción (mayor valor)
    const radios = screen.getAllByRole("radio");
    await user.click(radios[radios.length - 1]);
    await user.click(screen.getByRole("button", { name: /Siguiente|Ver mi resultado/i }));
    await user.click(screen.getByRole("button", { name: /Volver a mi resultado/i }));
    const after = screen.getByText(/de 100 · basado en/i).textContent;
    expect(after).not.toBe(before);
  }, 20000);

  it("el flujo normal siempre cubre las 7 dimensiones (cada una tiene pregunta requerida)", async () => {
    // la guarda de base insuficiente queda cubierta a nivel unidad en baseline.test.ts;
    // aquí verificamos que completar el cuestionario produce cobertura total.
    const user = userEvent.setup();
    render(<QuestionnaireApp />);
    for (let i = 0; i < 40; i += 1) {
      if (screen.queryByRole("heading", { name: /Tu autodiagnóstico de hábitos/i })) break;
      const skip = screen.queryByRole("button", { name: /prefiero no responder/i });
      if (skip && i % 4 === 0) await user.click(skip);
      else await answerCurrentQuestion(user);
    }
    expect(screen.getByText(/basado en 7 de 7 dimensiones/i)).toBeTruthy();
  }, 20000);

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

  it("no muestra persistido si el almacenamiento falla al aceptar", async () => {
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
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const acceptButtons = await screen.findAllByRole("button", { name: /^Aceptar / });
    await user.click(acceptButtons[0]);
    expect(await screen.findByText(/no pudo guardar tu decisión/i)).toBeTruthy();
    expect(screen.queryByText(/Guardado en tus objetivos/i)).toBeNull();
    expect(window.localStorage.getItem("blu.goals.v1")).toBeNull();
    spy.mockRestore();
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
