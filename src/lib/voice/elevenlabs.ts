/**
 * Voz natural preferida vía ElevenLabs (servidor).
 * La clave vive solo en el entorno (p. ej. .env.local); nunca en el cliente.
 */
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const ELEVENLABS_DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George (premade)
export const ELEVENLABS_DEFAULT_MODEL_ID = "eleven_v4";

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
}

export type AppSpeechLocale = "es" | "es-CL" | "en-US" | "zh-CN";

export function getElevenLabsConfig(): ElevenLabsConfig | null {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || ELEVENLABS_DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || ELEVENLABS_DEFAULT_MODEL_ID;
  if (!/^[A-Za-z0-9]+$/.test(voiceId)) return null;
  if (!/^[A-Za-z0-9_]+$/.test(modelId)) return null;
  return { apiKey, voiceId, modelId };
}

export function languageCodeForLocale(locale: string | undefined): "es" | "en" | "zh" {
  if (!locale) return "es";
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("en")) return "en";
  return "es";
}

export function isAppSpeechLocale(value: unknown): value is AppSpeechLocale {
  return value === "es" || value === "es-CL" || value === "en-US" || value === "zh-CN";
}

async function streamToResponse(stream: ReadableStream<Uint8Array>): Promise<Response> {
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "audio/mpeg" },
  });
}

/**
 * Sintetiza con el SDK de ElevenLabs (`textToSpeech.convert`).
 * Solo envía el texto elegido, el modelo y el idioma activo.
 */
export async function synthesizeWithElevenLabs(
  text: string,
  locale: string | undefined,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Response> {
  const config = getElevenLabsConfig();
  if (!config) {
    throw new Error("elevenlabs_unavailable");
  }
  const timeout = options.timeoutMs ?? 10_000;
  const client = new ElevenLabsClient({ apiKey: config.apiKey });
  const convert = client.textToSpeech.convert(config.voiceId, {
    text,
    modelId: config.modelId,
    languageCode: languageCodeForLocale(locale),
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
    },
  });

  const raced = await Promise.race([
    convert,
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("elevenlabs_timeout")), timeout);
      options.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("elevenlabs_aborted"));
        },
        { once: true },
      );
    }),
  ]);

  if (raced instanceof Response) return raced;
  if (raced && typeof raced === "object" && "getReader" in raced) {
    return streamToResponse(raced as ReadableStream<Uint8Array>);
  }
  // Algunos entornos del SDK ya entregan un Readable de Node: lo envolvemos.
  return new Response(raced as BodyInit, {
    status: 200,
    headers: { "Content-Type": "audio/mpeg" },
  });
}
