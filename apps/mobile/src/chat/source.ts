/**
 * Origen de una respuesta del BFF (specs/025 FR-005): la persona sabe si respondió
 * un modelo de lenguaje o las reglas sencillas. Ambos corren en el servidor.
 */
export type ReplySource = "remote" | "local-rules" | "unknown";

export function parseReplySource(body: unknown): ReplySource {
  if (typeof body !== "object" || body === null) return "unknown";
  const meta = (body as { meta?: unknown }).meta;
  if (typeof meta !== "object" || meta === null) return "unknown";
  const id = (meta as { providerId?: unknown }).providerId;
  return id === "remote" || id === "local-rules" ? id : "unknown";
}

export function describeReplySource(source: ReplySource): string | null {
  switch (source) {
    case "remote":
      return "Respuesta generada por un modelo de lenguaje, revisada por los filtros de Blu.";
    case "local-rules":
      return "Respuesta con reglas sencillas de Blu (sin modelo de lenguaje).";
    default:
      return null;
  }
}
