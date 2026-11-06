# Esquema de telemetría v1 — lista blanca de eventos (BLU-1404)

**Estado:** vigente desde 2026-11-06 · **Implementación:** `src/lib/observability/telemetry.ts`
**Regla de diseño:** ningún evento lleva hábito concreto, texto de persona,
identificadores ni fechas más finas que el instante del evento (sin contenido).

| Evento | Campos permitidos | Qué registra (y qué NO) |
|---|---|---|
| `app_opened` | — | apertura de la app; sin contexto de pantalla |
| `checkin_completado` | — | que hubo un check-in; **sin hábito** (Gherkin del issue) |
| `habito_agregado` | — | que se añadió un hábito; **sin cuál** |
| `revision_semanal_vista` | — | que se abrió la revisión; sin métricas |
| `chat_mensaje_enviado` | `modo: "local" \| "remoto"` | que se envió un mensaje; **sin contenido** |
| `error_visible` | `detalle: short-text` | clase de error visible; texto corto saneado |

## Saneamiento en el borde (aplicado siempre)

1. Evento fuera de esta lista → descartado (deny-by-default), contador `dropped`.
2. Campo no listado → descartado del evento.
3. Valor fuera del enum permitido → campo descartado.
4. Valor con patrón sensible (email, RUT, URL con query, narrativa ≥8 palabras)
   en un campo listado → **evento entero descartado**.

## Consentimiento y transporte

- Los eventos solo se registran con el consentimiento «mejora» activo
  (fail-closed: sin consentimiento, `dropped += 1` y no se registra nada).
- **Sin frontera de red:** el buffer es local, en anillo (máx. 100 eventos), y
  `flush()` solo entrega el lote al llamador local. Nada sale del dispositivo.
- Revisión del esquema: cualquier evento nuevo exige PR con justificación y
  actualización de esta lista (mismo mecanismo que ADR-0007 para reglas).
