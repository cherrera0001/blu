import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BluPresence, { BLU_PRESENCE_STATES, type BluPresenceState } from "./BluPresence";

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

  it("usa una ilustración vectorial propia con silueta y rasgos definidos", () => {
    render(<BluPresence />);
    const illustration = screen.getByTestId("blu-illustration");
    expect(illustration.getAttribute("viewBox")).toBe("0 0 120 120");
    expect(illustration.querySelector(".blu-backdrop")).not.toBeNull();
    expect(illustration.querySelector(".blu-body")).not.toBeNull();
    expect(illustration.querySelectorAll(".blu-eye")).toHaveLength(2);
    expect(illustration.querySelector(".blu-mouth")).not.toBeNull();
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
