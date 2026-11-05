"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

let activeSpeechStop: (() => void) | null = null;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function getLocalSpanishVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  return synth.getVoices().find(
    (voice) => voice.localService && voice.lang.toLowerCase().startsWith("es"),
  );
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
 * Only offers voices the browser identifies as a local service. Remote and
 * unclassified voices are not used; the visible response remains the fallback.
 */
export default function SpeakButton({ text }: { text: string }) {
  const supported = useSyncExternalStore(
    subscribeToVoiceChanges,
    hasLocalSpanishVoice,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);
  const speechStop = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      const stop = speechStop.current;
      if (stop && activeSpeechStop === stop) {
        getSynth()?.cancel();
        stop();
      }
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const synth = getSynth();
    if (!synth) return;
    if (speaking) {
      const stop = speechStop.current;
      synth.cancel();
      stop?.();
      return;
    }
    const voice = getLocalSpanishVoice(synth);
    if (!voice) return;
    activeSpeechStop?.();
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    const stop = () => {
      setSpeaking(false);
      if (activeSpeechStop === stop) activeSpeechStop = null;
      if (speechStop.current === stop) speechStop.current = null;
    };
    speechStop.current = stop;
    activeSpeechStop = stop;
    utterance.onend = stop;
    utterance.onerror = stop;
    synth.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button
      aria-label={speaking ? "Detener lectura" : "Escuchar respuesta en voz alta"}
      aria-pressed={speaking}
      className="text-button"
      onClick={toggle}
      type="button"
    >
      {speaking ? "■ Detener" : "🔊 Escuchar"}
    </button>
  );
}
