// Telemetría mínima sin PII (BLU-1404): lista blanca de eventos, saneamiento en
// el borde, buffer local en anillo y consentimiento «mejora» fail-closed.
// NO hay frontera de red: nada sale del dispositivo; el lote solo se expone
// localmente vía flush() para diagnóstico o exportación agregada futura.

export const EVENT_SCHEMA_VERSION = "1";

/**
 * Lista blanca v1 (docs/observability-esquema-eventos.md). Regla de diseño:
 * ningún evento lleva hábito concreto, texto de persona ni identificadores.
 */
export const EVENT_SCHEMA = {
  app_opened: {},
  checkin_completado: {},
  habito_agregado: {},
  revision_semanal_vista: {},
  "chat_mensaje_enviado": { modo: ["local", "remoto"] },
  "error_visible": { detalle: "short-text" },
} as const;

export type EventName = keyof typeof EVENT_SCHEMA;

export interface TelemetryEvent {
  name: EventName;
  at: string;
  fields: Record<string, string>;
}

export interface TelemetryBatch {
  schemaVersion: string;
  events: TelemetryEvent[];
}

export type SanitizeResult = { ok: true; event: TelemetryEvent } | { ok: false };

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const RUT_RE = /\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/;
const URL_WITH_QUERY_RE = /https?:\/\/\S+\?\S+/;

/** Heurística de narrativa: texto largo con varias palabras = posible contenido sensible. */
function looksLikeFreeNarrative(value: string): boolean {
  if (value.length <= 60) return false;
  return value.trim().split(/\s+/).length >= 8;
}

/** Un valor de campo permitido no debe transportar datos sensibles. */
export function looksSensitive(value: string): boolean {
  return (
    EMAIL_RE.test(value) ||
    RUT_RE.test(value) ||
    URL_WITH_QUERY_RE.test(value) ||
    looksLikeFreeNarrative(value)
  );
}

/**
 * Saneamiento en el borde: evento fuera de la lista blanca → descartado;
 * campos no listados → descartados; valor sensible (aun en campo listado) →
 * evento entero descartado; valor fuera de enum → campo descartado.
 */
export function sanitizeEvent(
  name: string,
  fields: Record<string, unknown> = {},
  at = "now",
): SanitizeResult {
  const schema = (EVENT_SCHEMA as Record<string, Record<string, unknown>>)[name];
  if (!schema) return { ok: false };
  const clean: Record<string, string> = {};
  for (const [key, allowed] of Object.entries(schema)) {
    const value = fields[key];
    if (typeof value !== "string") continue;
    if (Array.isArray(allowed)) {
      if ((allowed as readonly string[]).includes(value) && !looksSensitive(value)) {
        clean[key] = value;
      }
    } else if (allowed === "short-text") {
      if (!looksSensitive(value)) clean[key] = value;
      else return { ok: false };
    }
  }
  return { ok: true, event: { name: name as EventName, at, fields: clean } };
}

export interface TelemetrySink {
  record: (name: EventName, fields?: Record<string, unknown>) => void;
  flush: () => TelemetryBatch;
  readonly events: readonly TelemetryEvent[];
  readonly dropped: number;
}

export function createTelemetrySink(deps: {
  hasConsent: () => boolean;
  now: () => string;
  bufferSize?: number;
}): TelemetrySink {
  const bufferSize = deps.bufferSize ?? 100;
  let buffer: TelemetryEvent[] = [];
  let dropped = 0;

  return {
    record(name, fields = {}) {
      if (!deps.hasConsent()) {
        dropped += 1;
        return;
      }
      const out = sanitizeEvent(name, fields, deps.now());
      if (!out.ok) {
        dropped += 1;
        return;
      }
      buffer = [...buffer.slice(-(bufferSize - 1)), out.event];
    },
    flush() {
      const batch = { schemaVersion: EVENT_SCHEMA_VERSION, events: buffer };
      buffer = [];
      return batch;
    },
    get events() {
      return buffer;
    },
    get dropped() {
      return dropped;
    },
  };
}

let activeSink: TelemetrySink | null = null;

/** Instala el sink de la app (BluApp lo llama una vez al montar). */
export function initTelemetry(deps: {
  hasConsent: () => boolean;
  now: () => string;
  bufferSize?: number;
}): TelemetrySink {
  activeSink = createTelemetrySink(deps);
  return activeSink;
}

export function activeTelemetry(): TelemetrySink | null {
  return activeSink;
}
