import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cabeceras de endurecimiento para la app shell (auditoría Cloudflare security-audit).
 * No sustituyen rate limits ni el guardián del asistente; reducen framing y sniffing.
 */
export function middleware(_request: NextRequest): NextResponse {
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  // CSP sin script-src estricto: Next inyecta scripts de hidratación; frame-ancestors
  // y object-src sí cierran clickjacking y plugins sin romper el shell.
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "worker-src 'self'",
      "manifest-src 'self'",
    ].join("; "),
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
