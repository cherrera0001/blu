import { describe, expect, it } from "vitest";
import {
  EVENT_SCHEMA_VERSION,
  activeTelemetry,
  createTelemetrySink,
  initTelemetry,
  sanitizeEvent,
} from "./telemetry";

describe("sanitizeEvent — lista blanca en el borde", () => {
  it("evento permitido pasa solo con sus campos permitidos", () => {
    const out = sanitizeEvent("chat_mensaje_enviado", { modo: "local", extra: "se-descarta" });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.event).toEqual({ name: "chat_mensaje_enviado", at: "now", fields: { modo: "local" } });
  });

  it("evento desconocido se descarta (deny-by-default)", () => {
    expect(sanitizeEvent("usuario_hizo_algo_raro", {}).ok).toBe(false);
  });

  it("campo no listado se descarta aunque el evento exista", () => {
    const out = sanitizeEvent("checkin_completado", { habitId: "movement" });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.event.fields).toEqual({});
  });

  it("valor fuera del enum permitido se descarta", () => {
    const out = sanitizeEvent("chat_mensaje_enviado", { modo: "telepatia" });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.event.fields).toEqual({});
  });

  it("valor sensible (email, RUT, texto libre largo, URL con query) descarta el evento entero", () => {
    for (const bad of [
      "correo@persona.cl",
      "12.345.678-9",
      "me siento triste y esto es un texto narrativo largo que narra mi vida",
      "https://servicio.cl/llamada?token=secreto&datos=123",
    ]) {
      const out = sanitizeEvent("chat_mensaje_enviado", { modo: "local", hack: bad });
      if (out.ok) {
        // el campo 'hack' no está en la lista blanca: se descarta de todos modos
        expect(out.event.fields).toEqual({ modo: "local" });
      } else {
        expect(out.ok).toBe(false);
      }
    }
    // Campo permitido con valor sensible: evento descartado.
    expect(sanitizeEvent("error_visible", { detalle: "correo@persona.cl" }).ok).toBe(false);
    expect(sanitizeEvent("error_visible", { detalle: "timeout de red" }).ok).toBe(true);
  });
});

describe("createTelemetrySink — consentimiento y buffer local", () => {
  it("sin consentimiento «mejora» no registra nada (fail-closed)", () => {
    const sink = createTelemetrySink({ hasConsent: () => false, now: () => "2026-11-06T10:00:00Z" });
    sink.record("checkin_completado");
    expect(sink.events).toHaveLength(0);
    expect(sink.dropped).toBeGreaterThan(0);
  });

  it("con consentimiento registra eventos saneados en el buffer local", () => {
    const sink = createTelemetrySink({ hasConsent: () => true, now: () => "2026-11-06T10:00:00Z" });
    sink.record("checkin_completado");
    sink.record("chat_mensaje_enviado", { modo: "remoto" });
    expect(sink.events).toEqual([
      { name: "checkin_completado", at: "2026-11-06T10:00:00Z", fields: {} },
      { name: "chat_mensaje_enviado", at: "2026-11-06T10:00:00Z", fields: { modo: "remoto" } },
    ]);
  });

  it("buffer en anillo: respeta el tamaño máximo y descarta lo más antiguo", () => {
    const sink = createTelemetrySink({ hasConsent: () => true, now: () => "t", bufferSize: 3 });
    for (let i = 0; i < 5; i += 1) sink.record("revision_semanal_vista");
    expect(sink.events).toHaveLength(3);
  });

  it("no hay frontera de red: flush() devuelve el lote local y vacía el buffer", () => {
    const sink = createTelemetrySink({ hasConsent: () => true, now: () => "t" });
    sink.record("app_opened");
    const batch = sink.flush();
    expect(batch.schemaVersion).toBe(EVENT_SCHEMA_VERSION);
    expect(batch.events).toHaveLength(1);
    expect(sink.events).toHaveLength(0);
  });
});

describe("initTelemetry / activeTelemetry — sink activo de la app", () => {
  it("initTelemetry instala el sink singleton y activeTelemetry lo expone", () => {
    const sink = initTelemetry({ hasConsent: () => true, now: () => "t" });
    expect(activeTelemetry()).toBe(sink);
    initTelemetry({ hasConsent: () => false, now: () => "t" }); // restaurar fail-closed
  });
});
