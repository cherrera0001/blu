import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BluPresence, {
  BLU_PRESENCE_STATES,
  expressionFromPresence,
  resolveBluAsset,
  type BluPresenceState,
} from "./BluPresence";

afterEach(cleanup);

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

describe("BluPresence — presencia expresiva decorativa (UX-07)", () => {
  it("renderiza un marcador decorativo aria-hidden con el estado solicitado", () => {
    render(<BluPresence state="responding" size="sm" />);
    const marker = screen.getByTestId("blu-presence");
    expect(marker.getAttribute("aria-hidden")).toBe("true");
    expect(marker.dataset.bluState).toBe("responding");
    expect(marker.className).toContain("blu-state--responding");
    expect(marker.className).toContain("blu-presence--sm");
  });

  it("usa el avatar oficial de Blu (imagen holablu.com) por defecto", () => {
    render(<BluPresence />);
    const illustration = screen.getByTestId("blu-illustration");
    expect(illustration.tagName).toBe("IMG");
    expect(illustration.getAttribute("src")).toBe("/blu-newspaper.png");
    expect(illustration.getAttribute("alt")).toBe("");
  });

  it("el estilo companion usa SVG vivo según el estado de presencia", () => {
    render(<BluPresence pose="companion" state="responding" />);
    const marker = screen.getByTestId("blu-presence");
    expect(marker.dataset.bluPose).toBe("companion");
    expect(marker.dataset.bluExpression).toBe("surprised");
    expect(marker.dataset.bluLive).toBe("true");
    const illustration = screen.getByTestId("blu-illustration");
    expect(illustration.tagName.toLowerCase()).toBe("svg");
    expect(illustration.getAttribute("data-blu-expression")).toBe("surprised");
  });

  it("mapea estados a expresiones del sistema vectorial", () => {
    expect(expressionFromPresence("welcome")).toBe("happy");
    expect(expressionFromPresence("responding")).toBe("surprised");
    expect(expressionFromPresence("pause")).toBe("resting");
    expect(resolveBluAsset("companion", "acknowledge")).toEqual({
      src: null,
      expression: "happy",
      live: true,
    });
    expect(resolveBluAsset("builder", "idle").src).toBe("/blu-builder.png");
  });

  it.each(BLU_PRESENCE_STATES.map((state) => [state]))("soporta el estado %s", (state) => {
    render(<BluPresence state={state as BluPresenceState} />);
    expect(screen.getByTestId("blu-presence").dataset.bluState).toBe(state);
  });

  it("los tres tamaños aplican su clase", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      cleanup();
      render(<BluPresence size={size} />);
      expect(screen.getByTestId("blu-presence").className).toContain(`blu-presence--${size}`);
    }
  });

  it("un estado desconocido degrada a idle sin romper", () => {
    render(<BluPresence state={"listening" as BluPresenceState} />);
    expect(screen.getByTestId("blu-presence").dataset.bluState).toBe("idle");
  });

  it("con prefers-reduced-motion añade la clase que desactiva animaciones", () => {
    mockReducedMotion(true);
    render(<BluPresence state="responding" />);
    expect(screen.getByTestId("blu-presence").className).toContain("blu-reduced");
    vi.unstubAllGlobals();
  });

  it("sin prefers-reduced-motion no añade la clase reduced", () => {
    mockReducedMotion(false);
    render(<BluPresence state="responding" />);
    expect(screen.getByTestId("blu-presence").className).not.toContain("blu-reduced");
    vi.unstubAllGlobals();
  });

  it("nunca expone información: no hay texto accesible en el marcador", () => {
    render(<BluPresence state="unavailable" />);
    const marker = screen.getByTestId("blu-presence");
    expect(marker.textContent).toBe("");
  });
});
