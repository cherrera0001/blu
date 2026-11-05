import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import SpeakButton from "./SpeakButton";

afterEach(cleanup);

function fakeSynth() {
  const listeners = new Set<EventListener>();
  let voices: Array<{ lang: string; name: string; localService?: boolean }> = [
    { lang: "es-CL", name: "Voz es-CL", localService: true },
  ];
  return {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: () => voices,
    setVoices: (nextVoices: typeof voices) => {
      voices = nextVoices;
    },
    dispatchVoicesChanged: () => {
      listeners.forEach((listener) => listener(new Event("voiceschanged")));
    },
    addEventListener: vi.fn((event: string, listener: EventListener) => {
      if (event === "voiceschanged") listeners.add(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: EventListener) => {
      if (event === "voiceschanged") listeners.delete(listener);
    }),
  };
}

describe("SpeakButton — lectura en voz alta del dispositivo (specs/014)", () => {
  it("no se renderiza si el navegador no soporta síntesis de voz", () => {
    render(<SpeakButton text="Hola" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("no ofrece voces remotas ni cuando son la única opción en español", () => {
    const synth = fakeSynth();
    synth.getVoices = () => [{ lang: "es-CL", name: "Voz remota", localService: false }];
    vi.stubGlobal("speechSynthesis", synth);

    render(<SpeakButton text="Hola" />);

    expect(screen.queryByRole("button")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("no ofrece voces en español que el navegador no clasifica como locales", () => {
    const synth = fakeSynth();
    synth.getVoices = () => [{ lang: "es-CL", name: "Voz no clasificada" }];
    vi.stubGlobal("speechSynthesis", synth);

    render(<SpeakButton text="Hola" />);

    expect(screen.queryByRole("button")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("no ofrece voz si el idioma existe solo como servicio local no español", () => {
    const synth = fakeSynth();
    synth.getVoices = () => [{ lang: "en-US", name: "Voz local", localService: true }];
    vi.stubGlobal("speechSynthesis", synth);

    render(<SpeakButton text="Hola" />);

    expect(screen.queryByRole("button")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("espera voiceschanged cuando las voces locales aún no están disponibles", () => {
    const synth = fakeSynth();
    synth.setVoices([]);
    vi.stubGlobal("speechSynthesis", synth);
    render(<SpeakButton text="Hola" />);

    expect(screen.queryByRole("button")).toBeNull();
    act(() => {
      synth.setVoices([{ lang: "es-MX", name: "Voz local", localService: true }]);
      synth.dispatchVoicesChanged();
    });

    expect(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" })).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("habla la respuesta con voz en español al activar y se detiene al alternar", async () => {
    const synth = fakeSynth();
    const speakSpy = vi.fn();
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      lang = "";
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      text: string;
      constructor(text: string) {
        this.text = text;
        speakSpy(this);
      }
    });
    const user = userEvent.setup();
    render(<SpeakButton text="No asumiré qué necesitas." />);

    const button = screen.getByRole("button", { name: "Escuchar respuesta en voz alta" });
    await user.click(button);
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(speakSpy.mock.calls[0][0].text).toBe("No asumiré qué necesitas.");
    expect(speakSpy.mock.calls[0][0].lang).toBe("es-CL");
    expect(speakSpy.mock.calls[0][0].voice).toEqual(synth.getVoices()[0]);
    expect(synth.cancel).toHaveBeenCalled();

    const stop = screen.getByRole("button", { name: "Detener lectura" });
    await user.click(stop);
    expect(synth.cancel).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it("mantiene una sola lectura activa entre varias respuestas", async () => {
    const synth = fakeSynth();
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      lang = "";
      voice: unknown;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(readonly text: string) {}
    });
    const user = userEvent.setup();
    render(
      <>
        <SpeakButton text="Primera respuesta" />
        <SpeakButton text="Segunda respuesta" />
      </>,
    );

    await user.click(screen.getAllByRole("button", { name: "Escuchar respuesta en voz alta" })[0]);
    expect(screen.getAllByRole("button", { name: "Detener lectura" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }));

    expect(screen.getAllByRole("button", { name: "Detener lectura" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Escuchar respuesta en voz alta" })).toHaveLength(1);
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("cancela la lectura activa al desmontar", async () => {
    const synth = fakeSynth();
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      lang = "";
      voice: unknown;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(readonly text: string) {}
    });
    const user = userEvent.setup();
    const { unmount } = render(<SpeakButton text="Hola" />);
    await user.click(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }));
    synth.cancel.mockClear();

    unmount();

    expect(synth.cancel).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("el texto visible sigue existiendo con o sin voz (fallback completo)", () => {
    vi.stubGlobal("speechSynthesis", fakeSynth());
    render(
      <div>
        <p>No asumiré qué necesitas.</p>
        <SpeakButton text="No asumiré qué necesitas." />
      </div>,
    );
    expect(screen.getByText("No asumiré qué necesitas.")).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
