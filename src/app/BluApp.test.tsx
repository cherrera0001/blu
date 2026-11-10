import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BluApp from "./BluApp";
import Page from "./page";
import { clearBluState, updateBluState } from "@/lib/storage";
import { invalidateReviews } from "@/lib/review";
import { invalidateGoals } from "@/lib/onboarding/goals-storage";
import { localDateKey } from "@/lib/blu";

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
  it("activa telemetría local de la lista blanca solo con consentimiento «mejora»", async () => {
    const { activeTelemetry } = await import("@/lib/observability/telemetry");
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user, { mejora: true });
    expect(activeTelemetry()?.events.some((e) => e.name === "app_opened")).toBe(true);
  });

  it("no registra eventos si no hay consentimiento «mejora»", async () => {
    const { activeTelemetry } = await import("@/lib/observability/telemetry");
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user, { mejora: false });
    expect(activeTelemetry()?.events).toHaveLength(0);
  });

  it("usa una presencia ilustrada coherente y presenta el prototipo en lenguaje claro", () => {
    render(<BluApp />);

    expect(screen.getByText("Versión de prueba")).toBeTruthy();
    expect(screen.queryByText("PROTOTIPO LOCAL")).toBeNull();
    expect(document.querySelector('img[src="/blu-newspaper.png"]')).not.toBeNull();
    expect(document.querySelector(".welcome-copy [data-testid='blu-presence'] img")).not.toBeNull();
  });

  it("offers accessible section navigation after onboarding", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);

    expect(screen.getByRole("navigation", { name: "Secciones principales" })).toBeTruthy();
    const destinations = [
      ["Pausa con Blu", "#chat-heading"],
      ["Hoy", "#habits-heading"],
      ["Tu semana", "#week-plan"],
      ["Progreso", "#review-heading"],
      ["Privacidad", "#privacy-controls"],
    ];
    for (const [label, href] of destinations) {
      expect(screen.getByRole("link", { name: label }).getAttribute("href")).toBe(href);
      expect(document.querySelector(href)).not.toBeNull();
    }

    screen.getByRole("link", { name: "Progreso" }).focus();
    await user.keyboard("{Enter}");
    expect(window.location.hash).toBe("#review-heading");
  });

  it("shows daily progress and updates it after a check-in", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);

    expect(screen.getByRole("heading", { name: "Hoy, elige un paso a tu ritmo." })).toBeTruthy();
    const progress = screen.getByRole("progressbar", { name: "Acciones de hoy" });
    expect(progress.getAttribute("aria-valuenow")).toBe("0");
    expect(progress.getAttribute("aria-valuemax")).toBe("1");
    expect(screen.getByRole("link", { name: /Ir a mis hábitos/ }).getAttribute("href"))
      .toBe("#habits-heading");

    await user.click(screen.getByRole("button", { name: "Marcar Movimiento natural" }));

    expect(progress.getAttribute("aria-valuenow")).toBe("1");
    expect(screen.getByText("Hoy hiciste espacio para ti.")).toBeTruthy();
  });

  it("uses the selected period for its summary metrics", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    await user.click(screen.getByRole("button", { name: "Marcar Movimiento natural" }));

    const olderDate = new Date();
    olderDate.setDate(olderDate.getDate() - 12);
    const olderDateKey = localDateKey(olderDate);
    updateBluState((current) => ({
      ...current,
      checkInsByDate: {
        ...current.checkInsByDate,
        [olderDateKey]: ["movement"],
      },
    }));

    await user.click(screen.getByRole("radio", { name: "30 días" }));

    const metrics = document.querySelectorAll(".review-stats strong");
    expect(metrics[0].textContent).toBe("2");
    expect(metrics[1].textContent).toBe("2 / 30");
  });

  it("does not render empty charts or repeated no-data rows", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);

    expect(screen.getByText(/Aún no hay pasos registrados en estos 7 días/i)).toBeTruthy();
    expect(screen.queryByRole("list", { name: /Acciones registradas por día/i })).toBeNull();
    expect(document.querySelector('[style*="max-height"]')).toBeNull();
  });

  it("keeps the idea of the day inside Blu's conversation area", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);

    const idea = document.querySelector(".principle-card");
    expect(idea).not.toBeNull();
    expect(idea?.closest(".chat-card")).not.toBeNull();
  });

  it("renders one visible title for the weekly plan when its details open", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    await user.click(document.querySelector("#week-plan summary") as HTMLElement);

    expect(document.querySelectorAll("#week-plan-heading")).toHaveLength(1);
  });

  it("keeps selections in memory until consent and caps onboarding at four habits", async () => {
    const user = userEvent.setup();
    render(<BluApp />);

    await user.click(screen.getByRole("button", { name: "Alimentación consciente" }));
    await user.click(screen.getByRole("button", { name: "Movimiento natural" }));
    await user.click(screen.getByRole("button", { name: "Comunidad" }));
    await user.click(screen.getByRole("button", { name: "Propósito" }));

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
    expect(saved.selectedHabitIds).toHaveLength(4);
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

  it("explains the device fallback when the BFF is unreachable (UX-03)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    render(<BluApp />);
    await completeOnboarding(user);
    await user.type(screen.getByRole("textbox", { name: "Escribe una reflexión" }), "hola");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(await screen.findByText(/El servidor no pudo responder/i)).toBeTruthy();
    expect(screen.getByText(/Tu mensaje se envió al servidor/i)).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("keeps conversation in memory and verifies data deletion", async () => {    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);

    await user.type(screen.getByRole("textbox", { name: "Escribe una reflexión" }), "Estoy ocupada");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect((await screen.findByText(/El tiempo aprieta/)).textContent).toBeTruthy();
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

      expect(await screen.findByText(/El tiempo aprieta/)).toBeTruthy();
      expect(screen.getAllByRole("button", { name: "Escuchar respuesta en voz alta" }).length)
        .toBeGreaterThanOrEqual(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("activa ElevenLabs al cargar y Escuchar pide audio al servidor", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          blob: async () => new Blob(["synthetic audio"]),
        });
      }
      return Promise.resolve(
        Response.json({ azureAvailable: false, elevenlabsAvailable: true, naturalAvailable: true }),
      );
    });
    const audio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      removeAttribute: vi.fn(),
      load: vi.fn(),
      onended: null as (() => void) | null,
      onerror: null as (() => void) | null,
    };
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("Audio", class {
      play = audio.play;
      pause = audio.pause;
      removeAttribute = audio.removeAttribute;
      load = audio.load;
      onended = audio.onended;
      onerror = audio.onerror;
      constructor(readonly src: string) {}
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:natural-audio"),
      revokeObjectURL: vi.fn(),
    });

    try {
      const user = userEvent.setup();
      render(<BluApp />);
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/voice",
          expect.objectContaining({ cache: "no-store" }),
        ),
      );
      await completeOnboarding(user);
      expect(await screen.findByText(/Voz natural activa \(ElevenLabs\)/)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Usar voz del dispositivo" })).toBeTruthy();

      const listen = screen
        .getAllByRole("button", { name: "Escuchar respuesta en voz alta" })
        .find((button) => !button.hasAttribute("disabled"));
      if (!listen) throw new Error("Falta el botón de voz natural");
      await user.click(listen);
      expect(await screen.findByRole("button", { name: "Detener lectura" })).toBeTruthy();
      const postCall = fetchMock.mock.calls.find(
        (call) => call[0] === "/api/voice" && (call[1] as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const postBody = JSON.parse(String((postCall?.[1] as RequestInit).body));
      expect(postBody.locale).toBe("es");
      expect(postBody.text).toContain("Hoy, elige un paso a tu ritmo.");
      expect(audio.play).toHaveBeenCalledOnce();
      await user.click(screen.getByRole("button", { name: "Usar voz del dispositivo" }));
      expect(audio.pause).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps local voice mode when Azure is not configured", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json({ azureAvailable: false, elevenlabsAvailable: false, naturalAvailable: false }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const user = userEvent.setup();
      render(<BluApp />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await completeOnboarding(user);
      expect(screen.getByRole("button", { name: "Activar voz natural" })).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Activar voz natural" }));
      expect(await screen.findByText(/aún no está configurada/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Activar voz natural" })).toBeTruthy();
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

  it("explains why continue is disabled (habits and/or consent missing)", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    expect(screen.getByText(/Elige al menos un hábito/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Movimiento natural" }));
    expect(screen.getByText(/aceptar el aviso/i)).toBeTruthy();
    await user.click(
      screen.getByRole("checkbox", { name: /Entiendo que esto es un prototipo/ }),
    );
    expect(screen.queryByText(/Elige al menos un hábito|acepta el aviso/i)).toBeNull();
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
    await user.click(screen.getByText("Responder cómo me sentí"));
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
    await user.click(screen.getByText("Responder cómo me sentí"));
    await user.click(screen.getByRole("radio", { name: /Se me hizo difícil/i }));
    await user.click(screen.getByRole("radio", { name: /Ajustar un hábito/i }));
    await user.click(screen.getByRole("button", { name: "Guardar revisión" }));
    expect(screen.getByText(/Elegiste ajustar un hábito/i)).toBeTruthy();
    const link = screen.getAllByRole("link", { name: /Ir a mis hábitos/i }).find(l => l.getAttribute("href") === "/");
    expect(link).toBeTruthy();
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
    await user.click(screen.getByText("Responder cómo me sentí"));
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

    await user.click(screen.getByRole("button", { name: /Borrar todos los datos/ }));
    expect(window.localStorage.getItem("blu.goals.v1")).toBeNull();
    expect(screen.queryByRole("heading", { name: /Objetivos que aceptaste/i })).toBeNull();
    expect(screen.queryByText(/Observar el entorno durante un minuto/i)).toBeNull();

    await completeOnboarding(user);
    expect(screen.queryByRole("heading", { name: /Objetivos que aceptaste/i })).toBeNull();
    expect(screen.queryByText(/Observar el entorno durante un minuto/i)).toBeNull();
  });

  it("respects the four-habit cap when including an accepted goal", async () => {
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
        selectedHabitIds: ["movement", "rest", "family", "nature"],
        checkInsByDate: {},
        adaptations: [],
      }),
    );
    render(<BluApp />);
    await screen.findByRole("region", { name: "Hábitos que elegiste" });
    await user.click(
      screen.getByRole("button", { name: /Incluir en tus hábitos: Propósito/i }),
    );
    expect(screen.getByText(/Puedes elegir hasta cuatro hábitos/i)).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem("blu.local.v1") ?? "null") as {
      selectedHabitIds: string[];
    };
    expect(saved.selectedHabitIds).toHaveLength(4);
  });

  it.each([
    ["movement", "Movimiento natural"],
    ["nourishment", "Alimentación consciente"],
    ["community", "Comunidad"],
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

  it("shows a clear empty state and adds the chart only after a check-in", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    expect(screen.queryByRole("list", { name: /Acciones registradas por día/i })).toBeNull();
    expect(screen.getByText(/Aún no hay pasos registrados en estos 7 días/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Marcar Movimiento natural" }));
    expect(screen.getByRole("list", { name: /Acciones registradas por día/i })).toBeTruthy();
    expect(screen.queryByText(/Aún no hay pasos registrados/i)).toBeNull();
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
    await user.click(screen.getByText("Tu plan de la semana"));
    await user.click(screen.getByRole("button", { name: /Sugerir mi semana/i }));
    expect(screen.getByRole("heading", { name: "Tu plan de la semana" })).toBeTruthy();
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

async function completeOnboarding(
  user: ReturnType<typeof userEvent.setup>,
  opts: { mejora?: boolean } = {},
): Promise<void> {
  await user.click(screen.getByRole("button", { name: "Movimiento natural" }));
  await user.click(
    screen.getByRole("checkbox", {
      name: /Entiendo que esto es un prototipo/,
    }),
  );
  if (opts.mejora) {
    await user.click(
      screen.getByRole("checkbox", { name: /mejora del producto/ }),
    );
  }
  await user.click(screen.getByRole("button", { name: "Empezar con lo que elegí" }));
  await screen.findByRole("region", { name: "Hábitos que elegiste" });
}


describe("chat: disclosure honesto del modo de respuesta", () => {
  it("muestra el disclosure remoto cuando el BFF responde con IA (providerId remote)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: "Prueba con un paso de dos minutos.",
        meta: { providerId: "remote", safety: { guardianAction: "none", latencyMs: 5 } },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const user = userEvent.setup();
      render(<BluApp />);
      await completeOnboarding(user);
      expect(screen.getByText(/reglas sencillas, no con IA generativa/i)).toBeTruthy();

      await user.type(
        screen.getByRole("textbox", { name: "Escribe una reflexión" }),
        "Me cuesta moverme",
      );
      await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));

      expect(await screen.findByText(/respondo con IA/i)).toBeTruthy();
      expect(screen.getByText(/evita compartir datos personales o de salud/i)).toBeTruthy();
      expect(screen.queryByText(/reglas sencillas, no con IA generativa/i)).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/assistant",
        expect.objectContaining({ method: "POST" }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("mantiene el disclosure local cuando el BFF responde en modo reglas", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: "El tiempo aprieta, lo entiendo.",
        meta: { providerId: "local-rules", safety: { guardianAction: "none", latencyMs: 2 } },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const user = userEvent.setup();
      render(<BluApp />);
      await completeOnboarding(user);
      await user.type(
        screen.getByRole("textbox", { name: "Escribe una reflexión" }),
        "Estoy ocupada",
      );
      await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));

      expect(await screen.findByText(/El tiempo aprieta/)).toBeTruthy();
      expect(screen.getByText(/reglas sencillas, no con IA generativa/i)).toBeTruthy();
      expect(screen.queryByText(/respondo con IA \(modo remoto\)/i)).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});



  it("presenta la privacidad como un panel profesional con acciones claras", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    expect(screen.getByRole("heading", { name: /Tus datos, bajo tu control/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Exportar mis datos/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Consentimientos/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Borrar todos los datos/i })).toBeTruthy();
    expect(screen.getByText(/no diagnostica ni trata/i)).toBeTruthy();
    expect(screen.queryByText(/descarga un JSON con todo/i)).toBeNull();
  });

describe("presencia expresiva de Blu (UX-07) — estados ligados a eventos reales", () => {
  it("responding mientras espera la respuesta, con equivalente textual; acknowledge al completar", async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const user = userEvent.setup();
      render(<BluApp />);
      await completeOnboarding(user);
      await user.type(screen.getByRole("textbox", { name: "Escribe una reflexión" }), "Hola Blu");
      await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));

      const thinking = await screen.findByText(/Blu está pensando/i);
      expect(thinking.getAttribute("role")).toBe("status");
      const chatAvatar = document.querySelector(".chat-card [data-testid='blu-presence']");
      expect(chatAvatar?.getAttribute("data-blu-state")).toBe("responding");

      resolveFetch?.({
        ok: true,
        json: async () => ({
          text: "Respuesta controlada de Blu.",
          meta: { providerId: "local-rules", safety: { guardianAction: "none", latencyMs: 2 } },
        }),
      });

      expect(await screen.findByText("Respuesta controlada de Blu.")).toBeTruthy();
      expect(screen.queryByText(/Blu está pensando/i)).toBeNull();
      expect(
        document.querySelector(".chat-card [data-testid='blu-presence']")?.getAttribute("data-blu-state"),
      ).toBe("acknowledge");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("unavailable honesto cuando el BFF no responde (modo local)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    try {
      const user = userEvent.setup();
      render(<BluApp />);
      await completeOnboarding(user);
      await user.type(screen.getByRole("textbox", { name: "Escribe una reflexión" }), "¿Estás ahí?");
      await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));

      expect(await screen.findByText(/El servidor no pudo responder/i)).toBeTruthy();
      expect(
        document.querySelector(".chat-card [data-testid='blu-presence']")?.getAttribute("data-blu-state"),
      ).toBe("unavailable");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("microcopy honesto por código: ante 429 explica que hay que esperar (UX-06)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    try {
      const user = userEvent.setup();
      render(<BluApp />);
      await completeOnboarding(user);
      await user.type(screen.getByRole("textbox", { name: "Escribe una reflexión" }), "hola");
      await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));

      expect(await screen.findByText(/el servidor pidió esperar/i)).toBeTruthy();
      expect(screen.getByText(/reglas sencillas en tu dispositivo/i)).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("el hero pasa a acknowledge tras el primer check-in del día", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    expect(
      document.querySelector(".dashboard-hero [data-testid='blu-presence']")?.getAttribute("data-blu-state"),
    ).toBe("welcome");

    const markButton = document.querySelector('input[aria-label^="Marcar"], button[aria-label^="Marcar"]');
    expect(markButton).not.toBeNull();
    await user.click(markButton as HTMLElement);

    expect(
      document.querySelector(".dashboard-hero [data-testid='blu-presence']")?.getAttribute("data-blu-state"),
    ).toBe("acknowledge");
  });
});


describe("agrupación del dashboard en móvil (UX-05) — secciones secundarias colapsables", () => {
  it("'Tu espacio' es un details cerrado por defecto (sin scroll extra)", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    const details = document.querySelector("details.space-details");
    expect(details).not.toBeNull();
    expect(details?.querySelector("summary")?.textContent).toMatch(/Tu espacio/i);
    expect(details?.hasAttribute("open")).toBe(false);
    // se abre con interacción real y el contenido queda accesible
    await user.click(details!.querySelector("summary") as HTMLElement);
    expect(details?.hasAttribute("open")).toBe(true);
    expect(screen.getByPlaceholderText(/Apodo/i)).toBeTruthy();
  });

  it("la revisión opcional empieza cerrada y vuelve a cerrarse tras guardarla", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    const details = document.querySelector("details.review-details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);

    await user.click(screen.getByText("Responder cómo me sentí"));
    await user.click(screen.getByRole("radio", { name: "Me sentí bien" }));
    await user.click(screen.getByRole("radio", { name: "Mantener como está" }));
    await user.click(screen.getByRole("button", { name: "Guardar revisión" }));

    expect(await screen.findByText(/Revisión de esta semana guardada/i)).toBeTruthy();
    const after = document.querySelector("details.review-details");
    expect(after?.hasAttribute("open")).toBe(false);
    // la invitación a actualizar sigue visible fuera del details
    expect(screen.getByText(/Puedes actualizarla cuando quieras/i)).toBeTruthy();
  });
});

describe("accesibilidad adicional (BLU-1501)", () => {
  it("el primer enlace del documento es 'Saltar al contenido principal' (WCAG 2.4.1)", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await completeOnboarding(user);
    const main = document.getElementById("contenido-principal");
    expect(main?.tagName).toBe("MAIN");
    const links = [...document.querySelectorAll("a")];
    expect(links[0].textContent).toMatch(/Saltar al contenido principal/i);
    expect(links[0].getAttribute("href")).toBe("#contenido-principal");
    expect(links[0].classList.contains("skip-link")).toBe(true);
  });
});

describe("presencia: disparador real del estado pause (UX-07)", () => {
  it("elegir 'Pausa con Blu' en la navegación pone al guía en estado pause", async () => {
    const user = userEvent.setup();
    render(<BluApp />);
    await completeOnboarding(user);
    expect(
      document.querySelector(".chat-card [data-testid='blu-presence']")?.getAttribute("data-blu-state"),
    ).toBe("welcome");
    await user.click(screen.getByRole("link", { name: "Pausa con Blu" }));
    expect(
      document.querySelector(".chat-card [data-testid='blu-presence']")?.getAttribute("data-blu-state"),
    ).toBe("pause");
  });
});
