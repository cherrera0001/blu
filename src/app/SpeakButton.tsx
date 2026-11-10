"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

let activeSpeechStop: (() => void) | null = null;

export type VoiceProfile = "warm" | "balanced";
export type VoiceMode = "local" | "azure";
/** `es` es el idioma de la app; la voz del dispositivo busca `es-CL`. */
export type SpeechLocale = "es" | "es-CL" | "en-US" | "zh-CN";

type UiLocale = "es" | "en-US" | "zh-CN";

function uiLocale(locale: SpeechLocale): UiLocale {
  return locale === "es-CL" ? "es" : locale;
}

function voiceTag(locale: SpeechLocale): "es-CL" | "en-US" | "zh-CN" {
  return locale === "es" ? "es-CL" : locale;
}

const SPEAK_UI: Record<UiLocale, { listen: string; stop: string; loading: string; listenName: string; stopName: string }> = {
  es: {
    listen: "Escuchar",
    stop: "Detener",
    loading: "Generando audio…",
    listenName: "Escuchar respuesta en voz alta",
    stopName: "Detener lectura",
  },
  "en-US": {
    listen: "Listen",
    stop: "Stop",
    loading: "Making audio…",
    listenName: "Listen to this aloud",
    stopName: "Stop reading",
  },
  "zh-CN": {
    listen: "朗读",
    stop: "停止",
    loading: "正在生成声音…",
    listenName: "朗读屏幕上的文字",
    stopName: "停止朗读",
  },
};

const MISSING_VOICE: Record<UiLocale, string> = {
  es: "Este dispositivo no tiene una voz local en español.",
  "en-US": "This device does not have a local English voice.",
  "zh-CN": "这台设备没有本地中文语音。",
};

const SPEAK_ERROR: Record<UiLocale, { play: string; generate: string }> = {
  es: {
    play: "No pude reproducir el audio. Puedes volver a intentarlo o usar la voz de tu dispositivo.",
    generate: "No pude generar la voz natural. Puedes volver a intentarlo o usar la voz de tu dispositivo.",
  },
  "en-US": {
    play: "I could not play the audio. You can try again, or use your device's voice.",
    generate: "I could not create the natural voice. You can try again, or use your device's voice.",
  },
  "zh-CN": {
    play: "没法播放这段声音。你可以再试一次，或用这台设备的语音。",
    generate: "没法生成自然语音。你可以再试一次，或用这台设备的语音。",
  },
};

export function stopActiveSpeech(): void {
  activeSpeechStop?.();
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function getLocalVoice(synth: SpeechSynthesis, locale: SpeechLocale): SpeechSynthesisVoice | undefined {
  const tag = voiceTag(locale);
  const prefix = tag === "en-US" ? "en" : tag === "zh-CN" ? "zh" : "es";
  const voices = synth
    .getVoices()
    .filter((voice) => voice.localService && voice.lang.toLowerCase().startsWith(prefix));
  const exact = voices.find((voice) => voice.lang.toLowerCase() === tag.toLowerCase());
  if (exact) return exact;
  if (prefix !== "es") return voices[0];
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

export function speakLocalText(text: string, locale: SpeechLocale): boolean {
  const synth = getSynth();
  if (!synth) return false;
  const voice = getLocalVoice(synth, locale);
  if (!voice) return false;
  activeSpeechStop?.();
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.94;
  synth.speak(utterance);
  return true;
}

function subscribeToVoiceChanges(onStoreChange: () => void): () => void {
  const synth = getSynth();
  if (!synth) return () => {};
  synth.addEventListener("voiceschanged", onStoreChange);
  return () => synth.removeEventListener("voiceschanged", onStoreChange);
}

function hasLocalVoice(locale: SpeechLocale): boolean {
  const synth = getSynth();
  return synth !== null && getLocalVoice(synth, locale) !== undefined;
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
  locale = "es-CL",
}: {
  text: string;
  profile?: VoiceProfile;
  mode?: VoiceMode;
  azureAvailable?: boolean;
  locale?: SpeechLocale;
}) {
  const supported = useSyncExternalStore(
    subscribeToVoiceChanges,
    () => hasLocalVoice(locale),
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

  if (mode === "azure" && !azureAvailable) return null;
  const unavailable = mode === "local" && !supported;

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
        body: JSON.stringify({ text, locale: uiLocale(locale) }),
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
        setError(SPEAK_ERROR[uiLocale(locale)].play);
      };
      await audio.play();
      if (!controller.signal.aborted) setSpeaking(true);
      setLoading(false);
    } catch {
      const cancelled = controller.signal.aborted;
      stop();
      if (!cancelled) {
        setError(SPEAK_ERROR[uiLocale(locale)].generate);
      }
    }
  }

  function speakLocally(): void {
    const synth = getSynth();
    if (!synth) return;
    const voice = getLocalVoice(synth, locale);
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
        aria-label={speaking || loading ? SPEAK_UI[uiLocale(locale)].stopName : SPEAK_UI[uiLocale(locale)].listenName}
        aria-pressed={speaking || loading}
        className="text-button"
        disabled={unavailable}
        onClick={toggle}
        type="button"
      >
        {loading ? SPEAK_UI[uiLocale(locale)].loading : speaking ? `■ ${SPEAK_UI[uiLocale(locale)].stop}` : `🔊 ${SPEAK_UI[uiLocale(locale)].listen}`}
      </button>
      {unavailable && (
        <p className="speak-status">{MISSING_VOICE[uiLocale(locale)]}</p>
      )}
      {error && <p className="speak-error" role="status">{error}</p>}
    </div>
  );
}
