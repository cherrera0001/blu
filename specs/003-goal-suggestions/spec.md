# Feature Specification: Perfil y sugerencias de objetivos (BLU-205)

**Feature Branch**: `003-goal-suggestions`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Del perfil del autodiagnóstico, derivar hasta tres objetivos iniciales sugeridos con explicación comprensible y origen trazable; la persona puede aceptar, modificar o rechazar cada uno, o ignorar todo y elegir manualmente. Reglas explícitas, sin modelo opaco."

## User Scenarios & Testing

### User Story 1 - Sugerencias explicables desde el perfil (Priority: P1)

Al completar el autodiagnóstico, el resultado muestra hasta tres sugerencias de microhábitos
priorizando los principios con nivel más bajo, cada una con explicación ligada a las respuestas
(p. ej., barrera declarada de tiempo → versión mínima). Reglas determinísticas y auditables.

**Independent Test**: pruebas unitarias del motor de sugerencias con perfiles construidos a mano.

**Acceptance Scenarios**:

1. **Given** un perfil con niveles, **When** se generan sugerencias, **Then** son máximo 3, priorizan bandas bajas, y cada una incluye principio, acción y explicación.
2. **Given** barreras declaradas de tiempo/energía en un principio, **When** se sugiere, **Then** la acción es la versión mínima del hábito y la explicación lo menciona.
3. **Given** un perfil sin niveles (todo omitido), **When** se generan, **Then** no hay sugerencias y la UI invita al flujo manual.

---

### User Story 2 - Decisión de la persona: aceptar, rechazar o ignorar (Priority: P1)

Cada sugerencia tiene acciones explícitas; aceptar guarda el objetivo con fecha y origen;
rechazar queda registrado; ignorar todo y seguir manual es siempre posible.

**Independent Test**: pruebas de componente sobre la pantalla de resultado + persistencia verificada.

**Acceptance Scenarios**:

1. **Given** las sugerencias mostradas, **When** la persona acepta una, **Then** se persiste con `decidedAt` y `suggestionId` y se muestra confirmación.
2. **Given** una sugerencia rechazada, **When** se revisa el estado, **Then** figura en `rejected` y no en `accepted`.
3. **Given** la persona que no quiere sugerencias, **When** elige "elegir manualmente", **Then** va al flujo habitual sin decisiones guardadas.

### Edge Cases

- Menos de 3 principios con nivel → menos sugerencias (sin relleno artificial).
- Repetir la evaluación regenera sugerencias y marca como obsoletas las decisiones anteriores (snapshot por versión de perfil).
- Persistencia fallida → error visible; nunca se confirma sin verificación.

## Requirements

- **FR-001**: El motor MUST ser determinista y puro (misma entrada → misma salida), con reglas publicadas en este spec.
- **FR-002**: Máximo 3 sugerencias, ordenadas por nivel ascendente (banda care primero), excluyendo principios sin nivel.
- **FR-003**: La explicación MUST citar el principio y, si existen barreras declaradas (`multi_choice`), mencionarlas.
- **FR-004**: Barrera `time` u `energy` MUST seleccionar la versión mínima del hábito (`smallerAction`).
- **FR-005**: Las decisiones MUST persistirse en `blu.goals.v1` con verificación de escritura y estructura validada.
- **FR-006**: La UI MUST ofrecer siempre la salida manual (ninguna sugerencia impuesta).
- **FR-007**: Trazabilidad: cada objetivo aceptado MUST conservar `suggestionId`, principio, acción y `decidedAt`.

## Success Criteria

- **SC-001**: 100% de sugerencias con explicación no vacía y vinculada a respuestas reales.
- **SC-002**: Aceptar/rechazar persiste correctamente en ≥99% de pruebas de componente.
- **SC-003**: Perfil vacío → 0 sugerencias y flujo manual visible (prueba negativa).
- **SC-004**: `npm test` verde en CI con las nuevas pruebas.

## Assumptions

- Los IDs de principio del banco coinciden con los IDs del catálogo de hábitos (`HABITS`), lo que habilita el mapeo directo.
- "Modificar" en esta iteración se resuelve como: aceptar y luego ajustar en el flujo de hábitos (edicion plena queda para el motor de hábitos, EPIC-11); la UI lo comunica así.
