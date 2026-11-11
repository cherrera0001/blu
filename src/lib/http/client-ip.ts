/**
 * Identificador de cliente para rate limits.
 *
 * En plataformas que anexan el IP real al final de X-Forwarded-For (p. ej. Vercel),
 * el primer hop es controlable por el cliente. Usamos el último hop no vacío y,
 * si existe, el header que la plataforma declara como IP del borde.
 */
export function clientIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const last = hops.at(-1);
    if (last) return last;
  }

  return "local";
}
