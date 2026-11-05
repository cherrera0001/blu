"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

let activeSpeechStop: (() => void) | null = null;

export type VoiceProfile = "warm" | "balanced";
export type VoiceMode = "local" | "azure";

export function stopActiveSpeech(): void {
  activeSpeechStop?.();
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function getLocalSpanishVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synth
    .getVoices()
    .filter((voice) => voice.localService && voice.lang.toLowerCase().startsWith("es"));
  const language = typeof navigator === "undefined" ? "" : navigator.language.toLowerCase();
  const preferred = voices.find((voice) => voice.lang.toLowerCase() === language);
  if (preferred) return preferred;
  const chilean = voices.find((voice) => voice.lang.toLowerCase() === "es-cl");
  if (chilean) return chilean;
  const latinAmerican = voices.find((voice) =>
    /^(es-419|es-(ar|bo|co|cr|cu|do|ec|gt|hn|mx|ni|pa|pe|pr|py|sv|us|uy|ve))$/i.test(voice.lang),
  );
  return latinAmerican ?? voices[0];
}

function subscribeToVoiceChanges(onStoreChange: () => void): () => void {
  const synth = getSynth();
  if (!synth) return () => {};
  synth.addEventListener("voiceschanged", onStoreChange);
  return () => synth.removeEventListener("voiceschanged", onStoreChange);
}

function hasLocalSpanishVoice(): boolean {
  const synth = getSynth();
  return synth !== null && getLocalSpanishVoice(synth) !== undefined;
}

/**
 * The local mode only uses voices the browser identifies as local. Azure mode
 * is separately gated and only sends text after an explicit listen action.
 */
export default function SpeakButton({
  text,
  profile = "warm",
  mode = "local",
  azureAvailable = false,
}: {
  text: string;
  profile?: VoiceProfile;
  mode?: VoiceMode;
  azureAvailable?: boolean;
}) {
  const supported = useSyncExternalStore(
    subscribeToVoiceChanges,
    hasLocalSpanishVoice,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const speechStop = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      const stop = speechStop.current;
      if (stop && activeSpeechStop === stop) stop();
    };
  }, []);

  if (mode === "azure" ? !azureAvailable : !supported) return null;

  function clearAudio(): void {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function makeStop(controller?: AbortController, onStop?: () => void): () => void {
    const stop = () => {
      controller?.abort();
      onStop?.();
      clearAudio();
      setSpeaking(false);
      setLoading(false);
      if (activeSpeechStop === stop) activeSpeechStop = null;
      if (speechStop.current === stop) speechStop.current = null;
    };
    return stop;
  }

  async function speakWithAzure(): Promise<void> {
    const controller = new AbortController();
    const stop = makeStop(controller);
    activeSpeechStop?.();
    speechStop.current = stop;
    activeSpeechStop = stop;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("voice_request_failed");
      const audioUrl = URL.createObjectURL(await response.blob());
      if (controller.signal.aborted) {
        URL.revokeObjectURL(audioUrl);
        return;
      }
      objectUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = stop;
      audio.onerror = () => {
        stop();
        setError("No pude reproducir el audio. Puedes volver a intentarlo o usar la voz local.");
      };
      await audio.play();
      if (!controller.signal.aborted) setSpeaking(true);
      setLoading(false);
    } catch {
      const cancelled = controller.signal.aborted;
      stop();
      if (!cancelled) {
        setError("No pude generar la voz natural. Puedes volver a intentarlo o usar la voz local.");
      }
    }
  }

  function speakLocally(): void {
    const synth = getSynth();
    if (!synth) return;
    const voice = getLocalSpanishVoice(synth);
    if (!voice) return;
    if (activeSpeechStop) activeSpeechStop();
    else synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = profile === "warm" ? 0.94 : 0.98;
    utterance.pitch = profile === "warm" ? 1.05 : 1;
    const stop = makeStop(undefined, () => synth.cancel());
    speechStop.current = stop;
    activeSpeechStop = stop;
    utterance.onend = stop;
    utterance.onerror = stop;
    synth.speak(utterance);
    setSpeaking(true);
  }

  function toggle(): void {
    if (speaking || loading) {
      speechStop.current?.();
      return;
    }
    if (mode === "azure") {
      void speakWithAzure();
    } else {
      speakLocally();
    }
  }

  return (
    <div className="speak-control">
      <button
        aria-label={speaking || loading ? "Detener lectura" : "Escuchar respuesta en voz alta"}
        aria-pressed={speaking || loading}
        className="text-button"
        onClick={toggle}
        type="button"
      >
        {loading ? "Generando audio…" : speaking ? "■ Detener" : "🔊 Escuchar"}
      </button>
      {error && <p className="speak-error" role="status">{error}</p>}
    </div>
  );
}
