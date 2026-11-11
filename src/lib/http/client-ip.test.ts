import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/assistant", { headers });
}

describe("clientIp", () => {
  it("prefiere el IP de borde de Vercel sobre X-Forwarded-For spoofable", () => {
    expect(
      clientIp(
        req({
          "x-forwarded-for": "1.2.3.4, 10.0.0.1",
          "x-vercel-forwarded-for": "203.0.113.9",
        }),
      ),
    ).toBe("203.0.113.9");
  });

  it("usa el último hop de X-Forwarded-For, no el primero controlable por el cliente", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("acepta x-real-ip cuando no hay header de plataforma", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.20" }))).toBe("198.51.100.20");
  });

  it("cae a local sin headers de proxy", () => {
    expect(clientIp(req({}))).toBe("local");
  });
});
