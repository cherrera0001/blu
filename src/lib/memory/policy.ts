import { hasPurpose, type ConsentState } from "blu-core/consent";
import type { V1Config } from "@/lib/v1/config";

/**
 * Memoria conversacional (#43, ADR-0008 D-1). Reglas puras:
 * existe solo si (1) V1 está configurado, (2) el servidor la activó con
 * BLU_MEMORY_ENABLED=1, (3) hay sesión y (4) la persona aceptó el propósito
 * «memoria_conversacional». Faltando cualquiera, la conversación vive solo en
 * la sesión (comportamiento invariante).
 */
export const MEMORY_PURPOSE = "memoria_conversacional" as const;
export const MEMORY_RETENTION_DAYS = 30;
export const MEMORY_MAX_MESSAGES = 40;
export const MEMORY_MAX_CHARS = 2000;

export type MemoryConfig = V1Config;
export type MemoryRole = "user" | "assistant";

export interface MemoryMessage {
  role: MemoryRole;
  body: string;
}

/** Lado servidor: devuelve la config solo si la memoria está activada explícitamente. */
export function getMemoryConfig(v1: V1Config | null, env: Record<string, string | undefined> = process.env): MemoryConfig | null {
  if (!v1) return null;
  return (env.BLU_MEMORY_ENABLED ?? "").trim() === "1" ? v1 : null;
}

export function canRemember(
  config: MemoryConfig | null,
  accessToken: string | null,
  consent: ConsentState,
): boolean {
  return Boolean(config && accessToken && hasPurpose(consent, MEMORY_PURPOSE));
}

/** Minimización: rol cerrado, texto recortado y sin vacíos. */
export function minimize(messages: MemoryMessage[]): MemoryMessage[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.body.trim().length > 0)
    .map((m) => ({ role: m.role, body: m.body.trim().slice(0, MEMORY_MAX_CHARS) }));
}

/** Decodifica filas del servidor sin confiar en su forma. */
export function decodeRows(raw: unknown): MemoryMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: MemoryMessage[] = [];
  for (const row of raw) {
    const r = row as { role?: unknown; body?: unknown };
    if ((r.role === "user" || r.role === "assistant") && typeof r.body === "string") {
      out.push({ role: r.role, body: r.body });
    }
  }
  return minimize(out).slice(-MEMORY_MAX_MESSAGES);
}
