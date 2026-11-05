import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const URL = "http://localhost/api/voice";
let requestId = 0;

function request(body: unknown, ip = `192.0.2.${++requestId}`): Request {
  return new Request(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function enableAzure(): void {
  vi.stubEnv("AZURE_SPEECH_ENABLED", "true");
  vi.stubEnv("AZURE_SPEECH_F0_CONFIRMED", "true");
  vi.stubEnv("AZURE_SPEECH_KEY", "synthetic-test-key");
  vi.stubEnv("AZURE_SPEECH_REGION", "eastus");
  vi.stubEnv("AZURE_SPEECH_LOCALE", "es-CL");
  vi.stubEnv("AZURE_SPEECH_VOICE", "es-CL-CatalinaNeural");
}

describe("/api/voice Azure speech", () => {
  beforeEach(() => {
    vi.stubEnv("AZURE_SPEECH_ENABLED", "");
    vi.stubEnv("AZURE_SPEECH_F0_CONFIRMED", "");
    vi.stubEnv("AZURE_SPEECH_KEY", "");
    vi.stubEnv("AZURE_SPEECH_REGION", "");
    vi.stubEnv("AZURE_SPEECH_LOCALE", "");
    vi.stubEnv("AZURE_SPEECH_VOICE", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports unavailable unless explicitly enabled with a confirmed F0 resource", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "synthetic-test-key");
    vi.stubEnv("AZURE_SPEECH_REGION", "eastus");

    const response = await GET();

    expect(await response.json()).toEqual({ azureAvailable: false });
  });

  it("reports availability without exposing the server key", async () => {
    enableAzure();

    const response = await GET();
    const raw = await response.text();

    expect(raw).toBe('{"azureAvailable":true}');
    expect(raw).not.toContain("synthetic-test-key");
  });

  it("does not call Azure when the feature is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ text: "Hola" }));

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid region before making any upstream request", async () => {
    enableAzure();
    vi.stubEnv("AZURE_SPEECH_REGION", "eastus.example.com");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ text: "Hola" }));

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a voice that is not valid for the configured Spanish locale", async () => {
    enableAzure();
    vi.stubEnv("AZURE_SPEECH_VOICE", "en-US-AriaNeural");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ text: "Hola" }));

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("synthesizes bounded text with the server key and returns uncached audio", async () => {
    enableAzure();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ text: "Hola <Blu> & compañía" }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://eastus.tts.speech.microsoft.com/cognitiveservices/v1");
    expect(new Headers(options.headers).get("Ocp-Apim-Subscription-Key"))
      .toBe("synthetic-test-key");
    expect(options.body).toContain('xml:lang="es-CL"');
    expect(options.body).toContain('<voice name="es-CL-CatalinaNeural">');
    expect(options.body).toContain("Hola &lt;Blu&gt; &amp; compañía");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it("rejects malformed, empty, and oversized text before contacting Azure", async () => {
    enableAzure();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const empty = await POST(request({ text: " " }));
    const oversized = await POST(request({ text: "x".repeat(501) }));

    expect(empty.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps provider quota errors without returning upstream details", async () => {
    enableAzure();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("secret upstream detail", { status: 429 })),
    );

    const response = await POST(request({ text: "Hola" }));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "voice_quota_exceeded" });
  });

  it("rejects oversized upstream audio without buffering it into the response", async () => {
    enableAzure();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array(1_000_001), { status: 200 }),
      ),
    );

    const response = await POST(request({ text: "Hola" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "invalid_audio_response" });
  });

  it("rate limits synthesis requests", async () => {
    enableAzure();
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(new Uint8Array([1]), { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchMock);

    let response: Response | undefined;
    for (let index = 0; index < 11; index += 1) {
      response = await POST(request({ text: "Hola" }, "198.51.100.10"));
    }

    expect(response?.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("returns a safe gateway error when Azure is unavailable", async () => {
    enableAzure();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("synthetic provider failure")));

    const response = await POST(request({ text: "Hola" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "voice_provider_unavailable" });
  });
});
