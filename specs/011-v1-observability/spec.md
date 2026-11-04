# Spec de diseño V1: Observabilidad y telemetría sin PII (BLU-1404) — gated

**Estado:** diseño preparatorio · **Fase:** V1 · **Relaciona:** constitución II · THREAT_MODEL (divulgación)

> Diseño, no implementación. Principio rector: **si un evento puede contener datos personales,
> no se registra; si se registra, solo con campos de la lista blanca.**

## Lista blanca de eventos (esquema `product_event`)

```ts
interface ProductEvent {
  name: string;        // de la lista cerrada (abajo)
  at: string;          // ISO
  sessionHash: string; // sha256(sessionId): correlaciona sin identificar
  variant?: string;    // A/B del copy, nunca del contenido
}
```

Eventos permitidos (cierre de lista): `onboarding_completed`, `habit_added`,
`checkin_toggled`, `adaptation_applied`, `review_saved`, `goal_accepted`, `export_downloaded`,
`data_erased`, `assistant_guardian_action` (categoría del guardián, sin texto).

**Prohibidos explícitamente**: contenido de mensajes, hábitos seleccionados, respuestas del
cuestionario, texto libre, nicknames, fechas de check-in por hábito, `consent` detallado.

## Filtrado en el borde

1. El cliente emite solo eventos de la lista (validación por esquema en build + runtime).
2. El pipeline de ingreso **descarta** cualquier campo fuera del esquema (drop, no log del payload).
3. Retención: 90 días rolling, agregación diaria para métricas (conteos), luego purga.
4. Acceso: solo rol `analyst` con lectura de agregados; raw events requieren doble aprobación.

## Separación uso vs. eficacia (BLU-1204)

- Telemetría de producto = los eventos anteriores (uso).
- Resultados de salud = **nunca** en este pipeline; viven solo en estudios con consentimiento
  de investigación (EPIC-16), nunca en analítica de producto.

## Plan de pruebas (al implementar)

1. Payload con campo extra ⇒ descartado en el borde (test de contrato).
2. Ningún evento transporta valores de `habitId` ni texto (inspección de esquema + snapshot).
3. Purga: eventos de más de 90 días inaccesibles.
4. `security_event` (BLU-105) nunca incluye IP completa ni user-agent completo
   (hash + truncado a categoría).

## Preguntas para aprobadores

1. ¿Proveedor de telemetría (o self-host) conforme a residencia y EIPD?
2. ¿Necesidad institucional de retención mayor a 90 días (justificar)?
