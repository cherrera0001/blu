import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BluApp from "./BluApp";
import { clearBluState } from "@/lib/storage";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  clearBluState();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("Blu user flows", () => {
  it("keeps selections in memory until consent and caps onboarding at three habits", async () => {
    const user = userEvent.setup();
    render(<BluApp />);

    await user.click(screen.getByRole("button", { name: "Movimiento natural" }));
    await user.click(screen.getByRole("button", { name: "Descanso y calma" }));
    await user.click(screen.getByRole("button", { name: "Propósito" }));
    await user.click(screen.getByRole("button", { name: "Alimentación consciente" }));

    expect(screen.getByRole("status").textContent).toContain("hasta tres hábitos");
    expect(window.localStorage.getItem("blu.local.v1")).toBeNull();
    expect(screen.getByRole("button", { name: "Empezar con lo que elegí" }).hasAttribute("disabled"))
      .toBe(true);

    await user.click(
      screen.getByRole("checkbox", {
        name: /Entiendo que esto es un prototipo/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Empezar con lo que elegí" }));

    expect(await screen.findByRole("region", { name: "Hábitos que elegiste" })).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem("blu.local.v1") ?? "null") as {
      consentAcceptedAt: string | null;
      selectedHabitIds: string[];
    };
    expect(saved.consentAcceptedAt).toBeTruthy();
    expect(saved.selectedHabitIds).toHaveLength(3);
  });

  it("records daily check-ins and an explicit, reversible adaptation", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);

    await user.click(screen.getByRole("button", { name: "Marcar Movimiento natural" }));
    expect(screen.getByRole("button", { name: "Desmarcar Movimiento natural" }).getAttribute("aria-pressed"))
      .toBe("true");
    expect(screen.getByText("1", { selector: ".review-stats div:first-child strong" })).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Hábito a simplificar"), "movement");
    await user.click(screen.getByRole("button", { name: "Probar más pequeño" }));
    expect(screen.getByText("Hacer una pausa de dos minutos para cambiar de postura."))
      .toBeTruthy();

    const saved = JSON.parse(window.localStorage.getItem("blu.local.v1") ?? "null") as {
      checkInsByDate: Record<string, string[]>;
      adaptations: Array<{ from: string; to: string }>;
    };
    expect(Object.values(saved.checkInsByDate).flat()).toContain("movement");
    expect(saved.adaptations).toHaveLength(1);
    expect(saved.adaptations[0].from).toBe("Elegir una pausa breve para moverte.");

    await user.click(screen.getByRole("button", { name: "Deshacer último ajuste" }));
    expect(screen.queryByText("Hacer una pausa de dos minutos para cambiar de postura."))
      .toBeNull();
    expect(
      JSON.parse(window.localStorage.getItem("blu.local.v1") ?? "null").adaptations,
    ).toHaveLength(0);
  });

  it("keeps conversation in memory and verifies data deletion", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);

    await user.type(screen.getByRole("textbox", { name: "Escribe una reflexión" }), "Estoy ocupada");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(screen.getByText(/No asumiré qué necesitas/)).toBeTruthy();
    expect(window.localStorage.getItem("blu.local.v1")).not.toContain("Estoy ocupada");

    await user.click(screen.getByRole("button", { name: "Borrar mis datos" }));
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem("blu.local.v1")).toBeNull();
    expect(await screen.findByRole("heading", { name: "Un cambio pequeño también cuenta." }))
      .toBeTruthy();
  });
});

async function completeOnboarding(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: "Movimiento natural" }));
  await user.click(
    screen.getByRole("checkbox", {
      name: /Entiendo que esto es un prototipo/,
    }),
  );
  await user.click(screen.getByRole("button", { name: "Empezar con lo que elegí" }));
  await screen.findByRole("region", { name: "Hábitos que elegiste" });
}
