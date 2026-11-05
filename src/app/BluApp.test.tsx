import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BluApp from "./BluApp";
import { clearBluState } from "@/lib/storage";
import { invalidateReviews } from "@/lib/review";
import { invalidateGoals } from "@/lib/onboarding/goals-storage";

// El optimizer de next/image no corre en jsdom: se renderiza un <img> plano.
vi.mock("next/image", () => ({
  default: (props: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.src}
      alt={props.alt}
      width={props.width}
      height={props.height}
      className={props.className}
    />
  ),
}));

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  clearBluState();
  invalidateReviews();
  invalidateGoals();
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

    for (const key of [
      "blu.onboarding.v1",
      "blu.goals.v1",
      "blu.review.v1",
      "blu.onboarding.notice.v1",
    ]) {
      window.localStorage.setItem(key, '"x"');
    }
    await user.click(screen.getByRole("button", { name: "Borrar mis datos" }));
    expect(window.confirm).toHaveBeenCalledOnce();
    for (const key of [
      "blu.local.v1",
      "blu.onboarding.v1",
      "blu.goals.v1",
      "blu.review.v1",
      "blu.onboarding.notice.v1",
    ]) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
    expect(await screen.findByRole("heading", { name: "Un cambio pequeño también cuenta." }))
      .toBeTruthy();
  });

  it("offers read-aloud on assistant replies when a local Spanish voice is available", async () => {
    vi.stubGlobal("speechSynthesis", {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: () => [{ lang: "es-CL", name: "Voz local", localService: true }],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    try {
      const user = userEvent.setup();
      render(<BluApp />);
      await completeOnboarding(user);

      await user.type(screen.getByRole("textbox", { name: "Escribe una reflexión" }), "Estoy ocupada");
      await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));

      expect(await screen.findByText(/No asumiré qué necesitas/)).toBeTruthy();
      expect(screen.getAllByRole("button", { name: "Escuchar respuesta en voz alta" }))
        .toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
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
    window.localStorage.setItem(
      "blu.review.v1",
      JSON.stringify([{ weekKey: "2026-W45", updatedAt: "t" }]),
    );
    let captured = "";
    const OriginalBlob = Blob;
    vi.stubGlobal(
      "Blob",
      class extends OriginalBlob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          captured = String(parts[0]);
          super(parts, options);
        }
      },
    );
    const createObjectURL = vi.fn(() => "blob:fake");
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    await user.click(screen.getByRole("button", { name: /Exportar mis datos/i }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByText(/Exportaste tus datos/i)).toBeTruthy();
    const bundle = JSON.parse(captured) as Record<string, unknown>;
    for (const category of ["state", "onboarding", "goals", "reviews"]) {
      expect(bundle).toHaveProperty(category);
    }
    expect((bundle.reviews as unknown[]).length).toBe(1);
    vi.unstubAllGlobals();
    clickSpy.mockRestore();
  });

  it("marks the export as incomplete when a category cannot be read, in both the JSON and the message", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    window.localStorage.setItem("blu.review.v1", "{mal");
    let captured = "";
    const OriginalBlob = Blob;
    vi.stubGlobal(
      "Blob",
      class extends OriginalBlob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          captured = String(parts[0]);
          super(parts, options);
        }
      },
    );
    const createObjectURL = vi.fn(() => "blob:fake");
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    await user.click(screen.getByRole("button", { name: /Exportar mis datos/i }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByText(/exportación (quedó )?incompleta/i)).toBeTruthy();
    expect(screen.queryByText(/Exportaste tus datos/i)).toBeNull();
    const bundle = JSON.parse(captured) as {
      reviews: unknown;
      errors: string[];
    };
    expect(bundle.reviews).toBeNull();
    expect(bundle.errors.join(" ")).toMatch(/reviews/);
    vi.unstubAllGlobals();
    clickSpy.mockRestore();
  });

  it("saves a weekly review with closed-list answers and date", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    expect(screen.getByRole("heading", { name: /Revisión de tu semana/i })).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: /Se me hizo difícil/i }));
    await user.click(screen.getByRole("radio", { name: /Ajustar un hábito/i }));
    await user.click(screen.getByRole("button", { name: "Guardar revisión" }));
    expect(screen.getByText(/Revisión guardada/i)).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem("blu.review.v1") ?? "null") as Array<{
      weekKey: string;
      felt: string;
      decision: string;
      updatedAt: string;
    }>;
    expect(saved).toHaveLength(1);
    expect(saved[0].weekKey).toMatch(/^\d{4}-W\d{2}$/);
    expect(saved[0].felt).toBe("harder");
    expect(saved[0].decision).toBe("adjust");
    expect(saved[0].updatedAt).toBeTruthy();
  });

  it("offers the manual adjust flow when the review decision is adjust", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    await user.click(screen.getByRole("radio", { name: /Se me hizo difícil/i }));
    await user.click(screen.getByRole("radio", { name: /Ajustar un hábito/i }));
    await user.click(screen.getByRole("button", { name: "Guardar revisión" }));
    expect(screen.getByText(/Elegiste ajustar un hábito/i)).toBeTruthy();
    const link = screen.getByRole("link", { name: /Ir a mis hábitos/i });
    expect(link.getAttribute("href")).toBe("/");
    // la UI no modifica hábitos por sí sola: no hay adaptaciones nuevas
    const saved = JSON.parse(window.localStorage.getItem("blu.local.v1") ?? "null") as {
      adaptations: unknown[];
    };
    expect(saved.adaptations).toHaveLength(0);
  });

  it("surfaces a review storage error instead of showing an empty state", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("blu.review.v1", "{mal");
    render(<BluApp />);
    await completeOnboarding(user);
    expect((await screen.findByRole("alert")).textContent).toMatch(/revisiones guardadas/i);
  });

  it("skip records an empty review without answers", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    await user.click(screen.getByRole("button", { name: /Prefiero no responder/i }));
    const saved = JSON.parse(window.localStorage.getItem("blu.review.v1") ?? "null") as Array<{
      weekKey: string;
      felt?: string;
    }>;
    expect(saved).toHaveLength(1);
    expect(saved[0].felt).toBeUndefined();
    expect(screen.getByText(/omitiste esta semana/i)).toBeTruthy();
  });

  it("shows accepted questionnaire goals and includes them in the plan", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "blu.goals.v1",
      JSON.stringify({
        profileComputedAt: "2026-11-04T12:00:00.000Z",
        accepted: [
          {
            suggestionId: "sug-nature",
            principleId: "nature",
            habitId: "nature",
            action: "Observar el entorno durante un minuto.",
            decidedAt: "2026-11-04T12:05:00.000Z",
          },
        ],
        rejected: [],
        updatedAt: "2026-11-04T12:05:00.000Z",
      }),
    );
    render(<BluApp />);
    await completeOnboarding(user);
    expect(screen.getByRole("heading", { name: /Objetivos que aceptaste/i })).toBeTruthy();
    expect(screen.getByText(/Observar el entorno durante un minuto/i)).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: /Incluir en tus hábitos: Conexión con el entorno/i }),
    );
    const saved = JSON.parse(window.localStorage.getItem("blu.local.v1") ?? "null") as {
      selectedHabitIds: string[];
    };
    expect(saved.selectedHabitIds).toContain("nature");
    expect(screen.getByRole("button", { name: /Ya está en tu plan: Conexión con el entorno/i })).toBeTruthy();
  });

  it("does not bring back accepted goals after erasing all data, even when restarting onboarding in the same session", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "blu.goals.v1",
      JSON.stringify({
        profileComputedAt: "2026-11-04T12:00:00.000Z",
        accepted: [
          {
            suggestionId: "sug-nature",
            principleId: "nature",
            habitId: "nature",
            action: "Observar el entorno durante un minuto.",
            decidedAt: "2026-11-04T12:05:00.000Z",
          },
        ],
        rejected: [],
        updatedAt: "2026-11-04T12:05:00.000Z",
      }),
    );
    render(<BluApp />);
    await completeOnboarding(user);
    expect(screen.getByRole("heading", { name: /Objetivos que aceptaste/i })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Borrar todos los datos" }));
    expect(window.localStorage.getItem("blu.goals.v1")).toBeNull();
    expect(screen.queryByRole("heading", { name: /Objetivos que aceptaste/i })).toBeNull();
    expect(screen.queryByText(/Observar el entorno durante un minuto/i)).toBeNull();

    await completeOnboarding(user);
    expect(screen.queryByRole("heading", { name: /Objetivos que aceptaste/i })).toBeNull();
    expect(screen.queryByText(/Observar el entorno durante un minuto/i)).toBeNull();
  });

  it("respects the three-habit cap when including an accepted goal", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "blu.goals.v1",
      JSON.stringify({
        profileComputedAt: "t",
        accepted: [
          {
            suggestionId: "sug-purpose",
            principleId: "purpose",
            habitId: "purpose",
            action: "Nombrar una cosa que hoy te importa.",
            decidedAt: "t",
          },
        ],
        rejected: [],
        updatedAt: "t",
      }),
    );
    window.localStorage.setItem(
      "blu.local.v1",
      JSON.stringify({
        consentAcceptedAt: "2026-11-04T10:00:00.000Z",
        consent: { version: "2.0.0", purposes: {}, updatedAt: "" },
        selectedHabitIds: ["movement", "rest", "family"],
        checkInsByDate: {},
        adaptations: [],
      }),
    );
    render(<BluApp />);
    await screen.findByRole("region", { name: "Hábitos que elegiste" });
    await user.click(
      screen.getByRole("button", { name: /Incluir en tus hábitos: Propósito/i }),
    );
    expect(screen.getByText(/Puedes elegir hasta tres hábitos/i)).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem("blu.local.v1") ?? "null") as {
      selectedHabitIds: string[];
    };
    expect(saved.selectedHabitIds).toHaveLength(3);
  });

  it.each([
    ["movement", "Movimiento natural"],
    ["nourishment", "Alimentación consciente"],
    ["rest", "Descanso y calma"],
    ["family", "Vínculos cercanos"],
    ["community", "Comunidad"],
    ["nature", "Conexión con el entorno"],
    ["purpose", "Propósito"],
  ])("check-in works for %s (%s) and persists", async (habitId, habitName) => {
    const user = userEvent.setup();
    render(<BluApp />);
    await user.click(screen.getByRole("button", { name: habitName }));
    await user.click(
      screen.getByRole("checkbox", { name: /Entiendo que esto es un prototipo/ }),
    );
    await user.click(screen.getByRole("button", { name: "Empezar con lo que elegí" }));
    await screen.findByRole("region", { name: "Hábitos que elegiste" });
    await user.click(screen.getByRole("button", { name: `Marcar ${habitName}` }));
    const saved = JSON.parse(window.localStorage.getItem("blu.local.v1") ?? "null") as {
      checkInsByDate: Record<string, string[]>;
    };
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`; // fecha LOCAL, como localDateKey de la app
    expect(Object.values(saved.checkInsByDate).flat()).toContain(habitId);
    expect(saved.checkInsByDate[today]).toContain(habitId);
  });

  it("optional nickname: minimal local profile, no email requested", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    expect(screen.queryByRole("textbox", { name: /correo/i })).toBeNull();
    await user.type(screen.getByRole("textbox", { name: "Apodo (opcional)" }), "Cris");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByText(/Tu espacio quedó guardado/i)).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem("blu.profile.v1") ?? "null") as {
      nickname: string;
    };
    expect(saved.nickname).toBe("Cris");
  });

  it("catalog: shows alternatives and applies one as an adaptation", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    await user.click(screen.getByText("Otras versiones"));
    expect(screen.getAllByText(/sin evidencia verificada/i).length).toBeGreaterThanOrEqual(2);
    await user.click(
      screen.getByRole("button", { name: /Pausa postura: Cambiar de postura ahora mismo/i }),
    );
    const saved = JSON.parse(window.localStorage.getItem("blu.local.v1") ?? "null") as {
      adaptations: Array<{ habitId: string; to: string }>;
    };
    expect(saved.adaptations).toHaveLength(1);
    expect(saved.adaptations[0].to).toBe("Cambiar de postura ahora mismo.");
    expect(screen.getByText(/quedó como tu versión actual/i)).toBeTruthy();
  });

  it("week bars with accessible labels and a gentle empty state that clears on check-in", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    expect(screen.getByRole("list", { name: /Acciones registradas por día/i })).toBeTruthy();
    expect(screen.getByText(/tu primer paso puede ser pequeñísimo/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Marcar Movimiento natural" }));
    expect(screen.queryByText(/tu primer paso puede ser pequeñísimo/i)).toBeNull();
  });

  it("history panel: switch period to 30 days and shows usage-not-efficacy label", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    expect(screen.getByText(/Métricas de uso del producto/i)).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "30 días" }));
    expect(screen.getByRole("status").textContent).toMatch(/Últimos 30 días/i);
    expect(screen.getByText(/no miden salud ni eficacia/i)).toBeTruthy();
  });

  it("suggests a weekly plan, shows intentions and removes them", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    await user.click(screen.getAllByText(/Intenciones sugeridas/i)[0]);
    await user.click(screen.getByRole("button", { name: /Sugerir mi semana/i }));
    expect(screen.getAllByRole("heading", { name: /Intenciones sugeridas/i }).length).toBeGreaterThan(0);
    const removeButtons = screen.getAllByRole("button", { name: /^Quitar / });
    expect(removeButtons.length).toBeGreaterThan(0);
    await user.click(removeButtons[0]);
    expect(screen.getAllByRole("button", { name: /^Quitar / }).length).toBe(removeButtons.length - 1);
    const saved = JSON.parse(window.localStorage.getItem("blu.plan.v1") ?? "null") as {
      weekKey: string;
      days: Array<{ intentions: unknown[] }>;
    };
    expect(saved.weekKey).toMatch(/^\d{4}-W\d{2}$/);
    expect(saved.days).toHaveLength(7);
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
