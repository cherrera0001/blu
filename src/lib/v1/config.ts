/**
 * Configuración V1 (ADR-0006): activación exclusiva por variables del servidor.
 * Sin SUPABASE_URL + SUPABASE_ANON_KEY, la app conserva el comportamiento local
 * actual. La anon key es pública por diseño (la seguridad la pone RLS en el
 * servidor, specs/009); la service_role jamás existe en el cliente.
 */
export interface V1Config {
  url: string;
  anonKey: string;
}

export function getV1Config(): V1Config | null {
  const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const anonKey = (process.env.SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isV1Enabled(): boolean {
  return getV1Config() !== null;
}
