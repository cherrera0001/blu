import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
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
  it("sigue visible y explica si el navegador no soporta síntesis de voz", () => {
    render(<SpeakButton text="Hola" />);
    expect(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/no tiene una voz local/i)).toBeTruthy();
  });

  it("no ofrece voces remotas ni cuando son la única opción en español", () => {
    const synth = fakeSynth();
    synth.getVoices = () => [{ lang: "es-CL", name: "Voz remota", localService: false }];
    vi.stubGlobal("speechSynthesis", synth);

    render(<SpeakButton text="Hola" />);

    expect(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/no tiene una voz local/i)).toBeTruthy();
    expect(synth.speak).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("no ofrece voces en español que el navegador no clasifica como locales", () => {
    const synth = fakeSynth();
    synth.getVoices = () => [{ lang: "es-CL", name: "Voz no clasificada" }];
    vi.stubGlobal("speechSynthesis", synth);

    render(<SpeakButton text="Hola" />);

    expect(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }).hasAttribute("disabled")).toBe(true);
    expect(synth.speak).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("no ofrece voz si el idioma existe solo como servicio local no español", () => {
    const synth = fakeSynth();
    synth.getVoices = () => [{ lang: "en-US", name: "Voz local", localService: true }];
    vi.stubGlobal("speechSynthesis", synth);

    render(<SpeakButton text="Hola" />);

    expect(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }).hasAttribute("disabled")).toBe(true);
    expect(synth.speak).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("espera voiceschanged cuando las voces locales aún no están disponibles", () => {
    const synth = fakeSynth();
    synth.setVoices([]);
    vi.stubGlobal("speechSynthesis", synth);
    render(<SpeakButton text="Hola" />);

    expect(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }).hasAttribute("disabled")).toBe(true);
    act(() => {
      synth.setVoices([{ lang: "es-MX", name: "Voz local", localService: true }]);
      synth.dispatchVoicesChanged();
    });

    expect(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }).hasAttribute("disabled")).toBe(false);
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

  it("uses a slower, warmer profile by default", async () => {
    const synth = fakeSynth();
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      lang = "";
      pitch = 1;
      rate = 1;
      voice: unknown;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(readonly text: string) {}
    });
    const user = userEvent.setup();
    render(<SpeakButton text="Hola" />);

    await user.click(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }));

    const utterance = synth.speak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.rate).toBe(0.94);
    expect(utterance.pitch).toBe(1.05);
    vi.unstubAllGlobals();
  });

  it("supports a balanced voice profile when the listener prefers it", async () => {
    const synth = fakeSynth();
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      lang = "";
      pitch = 1;
      rate = 1;
      voice: unknown;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(readonly text: string) {}
    });
    const user = userEvent.setup();
    render(<SpeakButton text="Hola" profile="balanced" />);

    await user.click(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }));

    const utterance = synth.speak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.rate).toBe(0.98);
    expect(utterance.pitch).toBe(1);
    vi.unstubAllGlobals();
  });

  it("usa español de Chile cuando la app está en es-CL, aunque el navegador tenga otra voz española", async () => {
    const synth = fakeSynth();
    const voices = [
      { lang: "es-ES", name: "Spanish voice", localService: true },
      { lang: "es-CL", name: "Chilean voice", localService: true },
    ];
    synth.getVoices = () => voices;
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      lang = "";
      pitch = 1;
      rate = 1;
      voice: unknown;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(readonly text: string) {}
    });
    const language = vi.spyOn(navigator, "language", "get").mockReturnValue("es-ES");
    const user = userEvent.setup();
    render(<SpeakButton text="Hola" />);

    await user.click(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }));

    const utterance = synth.speak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.voice).toEqual(voices[1]);
    language.mockRestore();
    vi.unstubAllGlobals();
  });

  it("prefers a Latin American Spanish voice over a Spain voice when locale does not match", async () => {
    const synth = fakeSynth();
    const voices = [
      { lang: "es-ES", name: "Spanish voice", localService: true },
      { lang: "es-CL", name: "Chilean voice", localService: true },
    ];
    synth.getVoices = () => voices;
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      lang = "";
      pitch = 1;
      rate = 1;
      voice: unknown;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(readonly text: string) {}
    });
    const language = vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
    const user = userEvent.setup();
    render(<SpeakButton text="Hola" />);

    await user.click(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }));

    const utterance = synth.speak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.voice).toEqual(voices[1]);
    language.mockRestore();
    vi.unstubAllGlobals();
  });

  it("sends only the chosen reply to ElevenLabs (/api/voice) after an explicit listen action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["audio"]),
    });
    const audio = {
      pause: vi.fn(),
      removeAttribute: vi.fn(),
      load: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      onended: null as (() => void) | null,
      onerror: null as (() => void) | null,
    };
    const AudioStub = vi.fn(class {
      pause = audio.pause;
      removeAttribute = audio.removeAttribute;
      load = audio.load;
      play = audio.play;
      onended = audio.onended;
      onerror = audio.onerror;
      constructor(readonly src: string) {}
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("Audio", AudioStub);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:azure-audio"),
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();
    render(
      <SpeakButton text="Una pausa breve puede bastar." mode="natural" naturalAvailable />,
    );

    await user.click(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith("/api/voice", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ text: "Una pausa breve puede bastar.", locale: "es" }),
    }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Detener lectura" })).toBeTruthy());
    expect(audio.play).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("usa ElevenLabs por defecto si naturalAvailable sin mode explícito", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["synthetic audio"]),
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
      createObjectURL: vi.fn(() => "blob:elevenlabs-audio"),
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();
    render(<SpeakButton text="Audio natural por defecto." naturalAvailable />);

    await user.click(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/voice",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "Audio natural por defecto.", locale: "es" }),
      }),
    );
    expect(audio.play).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("surfaces Azure synthesis failures without silently using the local voice", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(),
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();
    render(<SpeakButton text="Hola" mode="natural" naturalAvailable />);

    await user.click(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }));

    expect((await screen.findByRole("status")).textContent).toMatch(/No pude generar la voz natural/);
    vi.unstubAllGlobals();
  });

  it("aborts an in-progress Azure request when the listener stops it", async () => {
    let receivedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((_url: string, options: RequestInit) => {
      receivedSignal = options.signal as AbortSignal;
      return new Promise(() => {});
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<SpeakButton text="Hola" mode="natural" naturalAvailable />);

    await user.click(screen.getByRole("button", { name: "Escuchar respuesta en voz alta" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await user.click(screen.getByRole("button", { name: "Detener lectura" }));

    expect(receivedSignal?.aborted).toBe(true);
    vi.unstubAllGlobals();
  });

  it("does not render a cloud voice button unless the server confirms availability", () => {
    render(<SpeakButton text="Hola" mode="natural" />);

    expect(screen.queryByRole("button")).toBeNull();
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
