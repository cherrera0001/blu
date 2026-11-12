import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Speech from "expo-speech";
import { BLU_API_BASE } from "../config";
import { httpJson } from "../net/http";

export type SpeakResult = "natural" | "local" | "failed";

let stopCurrent: (() => void) | null = null;

export function stopSpeaking(): void {
  stopCurrent?.();
  stopCurrent = null;
  Speech.stop();
}

/**
 * Ya no sondea en red: en Hermes el fetch nativo puede tumbar la app
 * (SharedArrayBuffer). La app asume BFF de producción con ElevenLabs.
 */
export async function probeNaturalVoice(): Promise<boolean> {
  return true;
}

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return globalThis.btoa(binary);
}

async function speakLocal(text: string): Promise<boolean> {
  return await new Promise((resolve) => {
    try {
      Speech.speak(text, {
        language: "es-ES",
        rate: 0.9,
        pitch: 1.0,
        onDone: () => resolve(true),
        onStopped: () => resolve(true),
        onError: () => resolve(false),
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Prioriza voz natural (ElevenLabs vía BFF /api/voice con XMLHttpRequest).
 * Si falla, cae a expo-speech local del dispositivo.
 */
export async function speakText(
  text: string,
  options: { preferNatural?: boolean } = {},
): Promise<SpeakResult> {
  const trimmed = text.trim();
  if (!trimmed) return "failed";
  stopSpeaking();

  const preferNatural = options.preferNatural !== false;
  if (preferNatural) {
    let sound: Audio.Sound | null = null;
    const cacheUri = `${FileSystem.cacheDirectory}blu-voice.mp3`;
    let aborted = false;
    // El audio contiene el texto hablado: no se deja en caché tras usarlo.
    const dropCache = () =>
      void FileSystem.deleteAsync(cacheUri, { idempotent: true }).catch(() => undefined);
    stopCurrent = () => {
      aborted = true;
      void sound?.stopAsync().catch(() => undefined);
      void sound?.unloadAsync().catch(() => undefined);
      dropCache();
    };
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      // Solo XMLHttpRequest — nunca fetch nativo en Hermes.
      const res = await httpJson(`${BLU_API_BASE}/api/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed.slice(0, 500), locale: "es" }),
      });
      if (!res.ok || aborted) throw new Error(`voice_${res.status}`);
      const buffer = await res.arrayBuffer();
      if (aborted) return "failed";
      await FileSystem.writeAsStringAsync(cacheUri, bytesToBase64(buffer), {
        encoding: FileSystem.EncodingType.Base64,
      });
      const created = await Audio.Sound.createAsync(
        { uri: cacheUri },
        { shouldPlay: true },
      );
      sound = created.sound;
      await new Promise<void>((resolve, reject) => {
        sound?.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            void sound?.unloadAsync().then(dropCache, dropCache);
            if (stopCurrent) stopCurrent = null;
            resolve();
          }
          if ("error" in status && status.error) {
            reject(new Error(String(status.error)));
          }
        });
      });
      return "natural";
    } catch {
      dropCache();
      if (aborted) return "failed";
    }
  }

  stopCurrent = () => {
    Speech.stop();
    stopCurrent = null;
  };
  const ok = await speakLocal(trimmed);
  stopCurrent = null;
  return ok ? "local" : "failed";
}
