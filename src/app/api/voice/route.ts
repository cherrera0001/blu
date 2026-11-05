const MAX_TEXT_LENGTH = 500;
const MAX_BODY_BYTES = 2_048;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_AUDIO_BYTES = 1_000_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const MAX_TRACKED_IPS = 1_000;

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

interface AzureConfig {
  key: string;
  region: string;
  locale: string;
  voice: string;
}

function getAzureConfig(): AzureConfig | null {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  const locale = process.env.AZURE_SPEECH_LOCALE?.trim();
  const voice = process.env.AZURE_SPEECH_VOICE?.trim();
  const enabled =
    process.env.AZURE_SPEECH_ENABLED === "true" &&
    process.env.AZURE_SPEECH_F0_CONFIRMED === "true";
  if (
    !enabled ||
    !key ||
    !region ||
    !/^[a-z0-9-]+$/i.test(region) ||
    !locale ||
    !/^es-[A-Z]{2}$/.test(locale) ||
    !voice ||
    !/^es-[A-Z]{2}-[A-Za-z]+Neural$/.test(voice) ||
    !voice.startsWith(`${locale}-`)
  ) {
    return null;
  }
  return { key, region, locale, voice };
}

function isRateLimited(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",").at(-1)?.trim() || "unknown";
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_TRACKED_IPS) {
      for (const [trackedIp, trackedBucket] of buckets) {
        if (now >= trackedBucket.resetAt) buckets.delete(trackedIp);
      }
      if (buckets.size >= MAX_TRACKED_IPS) return true;
    }
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

async function readBoundedBody(request: Request): Promise<string | null> {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    await request.body?.cancel();
    return null;
  }
  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function isTextBody(value: unknown): value is { text: string } {
  if (typeof value !== "object" || value === null || !("text" in value)) return false;
  const text = value.text;
  return typeof text === "string" && text.trim().length > 0 && text.length <= MAX_TEXT_LENGTH;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      default: return "&quot;";
    }
  });
}

async function readBoundedAudio(response: Response): Promise<ArrayBuffer | null> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_AUDIO_BYTES) {
    await response.body?.cancel();
    return null;
  }
  const reader = response.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_AUDIO_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  if (total === 0) return null;

  const audio = new ArrayBuffer(total);
  const audioBytes = new Uint8Array(audio);
  let offset = 0;
  for (const chunk of chunks) {
    audioBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return audio;
}

export async function GET(): Promise<Response> {
  return Response.json(
    { azureAvailable: getAzureConfig() !== null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  const config = getAzureConfig();
  if (!config) return Response.json({ error: "voice_unavailable" }, { status: 503 });
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return Response.json({ error: "invalid_request" }, { status: 415 });
  }

  let rawBody: string | null;
  try {
    rawBody = await readBoundedBody(request);
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (rawBody === null) return Response.json({ error: "request_too_large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isTextBody(body)) return Response.json({ error: "invalid_request" }, { status: 400 });
  if (isRateLimited(request)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const ssml = [
    `<speak version="1.0" xml:lang="${config.locale}">`,
    `<voice name="${config.voice}">`,
    escapeXml(body.text),
    "</voice></speak>",
  ].join("");

  let azureResponse: Response;
  try {
    azureResponse = await fetch(
      `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/ssml+xml",
          "Ocp-Apim-Subscription-Key": config.key,
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        body: ssml,
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
  } catch {
    return Response.json({ error: "voice_provider_unavailable" }, { status: 502 });
  }

  if (!azureResponse.ok) {
    return azureResponse.status === 429
      ? Response.json({ error: "voice_quota_exceeded" }, { status: 429 })
      : Response.json({ error: "voice_provider_unavailable" }, { status: 502 });
  }

  let audio: ArrayBuffer | null;
  try {
    audio = await readBoundedAudio(azureResponse);
  } catch {
    return Response.json({ error: "voice_provider_unavailable" }, { status: 502 });
  }
  if (!audio) {
    return Response.json({ error: "invalid_audio_response" }, { status: 502 });
  }
  return new Response(audio, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Length": String(audio.byteLength),
      "Content-Type": "audio/mpeg",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
