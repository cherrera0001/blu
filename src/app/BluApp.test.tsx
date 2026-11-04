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

  it("keeps conversation in memory and verifies data deletion", async () => {    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);

    await user.type(screen.getByRole("textbox", { name: "Escribe una reflexión" }), "Estoy ocupada");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect((await screen.findByText(/No asumiré qué necesitas/)).textContent).toBeTruthy();
    expect(window.localStorage.getItem("blu.local.v1")).not.toContain("Estoy ocupada");

    await user.click(screen.getByRole("button", { name: "Borrar mis datos" }));
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem("blu.local.v1")).toBeNull();
    expect(await screen.findByRole("heading", { name: "Un cambio pequeño también cuenta." }))
      .toBeTruthy();
  });
  it("persists separated purposes when accepting operativo and investigacion", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await user.click(screen.getByRole("button", { name: "Movimiento natural" }));
    await user.click(
      screen.getByRole("checkbox", { name: /Entiendo que esto es un prototipo/ }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /investigación con revisión ética/i }),
    );
    await user.click(screen.getByRole("button", { name: "Empezar con lo que elegí" }));
    await screen.findByRole("region", { name: "Hábitos que elegiste" });
    const saved = JSON.parse(window.localStorage.getItem("blu.local.v1") ?? "null") as {
      consent: { version: string; purposes: Record<string, { acceptedAt: string }> };
    };
    expect(saved.consent.version).toBe("2.0.0");
    expect(saved.consent.purposes.operativo.acceptedAt).toBeTruthy();
    expect(saved.consent.purposes.investigacion.acceptedAt).toBeTruthy();
    expect(saved.consent.purposes.mejora).toBeUndefined();
  });

  it("blocks saving until the required operativo purpose is accepted", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await user.click(screen.getByRole("button", { name: "Movimiento natural" }));
    const continueButton = screen.getByRole("button", { name: "Empezar con lo que elegí" });
    expect(continueButton.hasAttribute("disabled")).toBe(true);
    expect(window.localStorage.getItem("blu.local.v1")).toBeNull();
  });

  it("exports data as a JSON bundle on explicit click", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    const createObjectURL = vi.fn(() => "blob:fake");
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    await user.click(screen.getByRole("button", { name: /Exportar mis datos/i }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByText(/Exportaste tus datos/i)).toBeTruthy();
    vi.unstubAllGlobals();
    clickSpy.mockRestore();
  });

  it("shows a renewal banner for legacy consent without blocking use", async () => {
    window.localStorage.setItem(
      "blu.local.v1",
      JSON.stringify({
        consentAcceptedAt: "2026-11-01T10:00:00.000Z",
        selectedHabitIds: ["movement"],
        checkInsByDate: {},
        adaptations: [],
      }),
    );
    render(<BluApp />);
    expect(
      screen.getByText(/Actualizamos el aviso de consentimiento/i),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Hábitos que elegiste" })).toBeTruthy();
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
