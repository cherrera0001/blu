# Feature Specification: Revisión semanal guiada (BLU-1202)

**Feature Branch**: `006-weekly-review`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Una revisión semanal breve con preguntas amables: cómo me sentí
(opcional) y qué mantener o ajustar. Sin texto libre sensible; omitir todo es válido; las
decisiones quedan registradas con fecha y alimentan sugerencias del motor de hábitos."

## User Scenarios & Testing

### User Story 1 - Revisión breve con listas cerradas (Priority: P1)

Cada semana la persona puede responder dos preguntas opcionales (cómo le fue; mantener o
ajustar) o omitirlas; sus decisiones se guardan con fecha.

**Acceptance Scenarios**:

1. **Given** la tarjeta de revisión, **When** responde "se me hizo difícil" y "ajustar", **Then** queda registrado con fecha y ve confirmación.
2. **Given** cualquier pregunta, **When** elige "prefiero no responder", **Then** continúa sin respuesta registrada para esa pregunta.
3. **Given** una semana sin datos, **When** abre la revisión, **Then** el texto lo declara y propone empezar pequeño (sin juicio).

### User Story 2 - Trazabilidad a sugerencias (Priority: P2)

La revisión alimenta el motor de hábitos: "ajustar" propone aplicar una versión más pequeña
(usando la adaptación existente), con acceso directo.

**Acceptance Scenarios**:

1. **Given** una revisión con decisión "ajustar", **When** la persona confirma, **Then** se propone simplificar un hábito elegido (flujo de adaptación ya existente).

### Edge Cases

- Sin registros de la semana: la revisión se ofrece igual (reflexión sin datos).
- Doble revisión en la misma semana: la segunda actualiza la primera (misma semana = misma clave).
- Estado corrupto: error visible con reinicio.

## Requirements

- **FR-001**: La revisión MUST persistir en `blu.review.v1`: `{weekKey, felt?, decision?, updatedAt}` con historial máximo 12 semanas.
- **FR-002**: Preguntas de lista cerrada únicamente (sin texto libre).
- **FR-003**: Omitir todo MUST ser válido y quedar sin registro de respuestas.
- **FR-004**: `weekKey` MUST ser semana ISO (año-semana) determinística por fecha local.
- **FR-005**: El panel MUST declarar el período revisado (últimos 7 días) y su límite autoinformado.
- **FR-006**: La tarjeta MUST ser accesible (radios etiquetados, foco visible, teclado).

## Success Criteria

- **SC-001**: Guardar una revisión con ambas respuestas persiste con fechas (prueba de integración).
- **SC-002**: Omitir todo no registra respuestas y no falla.
- **SC-003**: `weekKey` determinística: misma fecha → misma clave; lunes y domingo de la misma semana → misma clave.
- **SC-004**: CI verde con las nuevas pruebas.

## Assumptions

- "Ajustar" reutiliza el flujo de adaptación del prototipo (versión más pequeña); la revisión no cambia hábitos por sí sola.

## Estado de implementación (actualizado 2026-11-04, revisión de correcciones)

Verificado contra el código y las pruebas vigentes:

- **Aceptado con pruebas**: semana ISO determinística; persistencia `blu.review.v1` con tope 12;
  upsert por semana; listas cerradas sin texto libre; omisión válida; errores de JSON con
  mensaje estable («Las revisiones guardadas no se pueden leer.»).
- **Aceptado con pruebas (esta revisión)**: errores de lectura visibles en la interfaz
  (`role="alert"` en la tarjeta, sin ocultarse tras un estado vacío); historial visible con
  fecha tras guardar.
- **Aceptado con pruebas (esta revisión) — historia «ajustar»**: cuando la decisión es
  `adjust`, la tarjeta muestra el camino manual: en la pantalla principal, dentro de «Tus
  últimos siete días», elegir el hábito y «Probar más pequeño». **No se modifica ningún hábito
  automáticamente** ni se presupone cuál ajustar (prueba: tras decidir `adjust` no hay
  adaptaciones nuevas y el enlace «Ir a mis hábitos» apunta a `/`).
- **Pendiente (fuera de esta historia)**: métricas de retención sobre revisiones (EPIC-12,
  BLU-1203) y notificaciones de recordatorio (EPIC-15, BLU-1502).
