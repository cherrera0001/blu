# Feature Specification: Consentimiento versionado y diferenciado por propósito (BLU-102)

**Feature Branch**: `004-consent-versions`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Consentimiento informado, reversible y versionado con propósitos
separados: operativo (requerido para guardar datos), mejora del producto e investigación (opt-in
independientes). Retiro en cualquier momento, re-prompt ante nueva versión del aviso, migración
del consentimiento actual (checkbox único) sin perder datos."

## User Scenarios & Testing

### User Story 1 - Propósitos separados en onboarding (Priority: P1)

La persona acepta o rechaza tres propósitos independientes antes de guardar su plan: operativo
(requerido; sin él no hay guardado), mejora del producto e investigación (opcionales).

**Independent Test**: pruebas del dominio de consentimiento + flujo de onboarding en componente.

**Acceptance Scenarios**:

1. **Given** el onboarding, **When** la persona no acepta el propósito operativo, **Then** no puede guardar su plan y el texto lo explica.
2. **Given** la persona acepta operativo e investigación, **When** guarda, **Then** el estado persiste ambos propósitos con fecha y versión del aviso.
3. **Given** la persona acepta solo operativo, **Then** puede usar Blu normalmente sin mejora ni investigación.

### User Story 2 - Versión del aviso y re-consentimiento (Priority: P1)

El aviso tiene versión semántica. Si cambia, quien ya había aceptado conserva su estado vigente
(con gracia de uso) pero ve aviso hasta renovar; el historial conserva la versión original.

**Acceptance Scenarios**:

1. **Given** consentimiento en versión anterior, **When** la app sube de versión, **Then** aparece aviso de renovación sin bloquear el uso ni borrar datos.
2. **Given** la renovación, **When** la persona acepta de nuevo, **Then** queda registrada la nueva versión con fecha.

### User Story 3 - Retiro de propósitos (Priority: P2)

Desde la app se puede retirar cualquier propósito opcional en cualquier momento; operativo se
puede retirar solo borrando todos los datos.

**Acceptance Scenarios**:

1. **Given** aceptó mejora, **When** la retira, **Then** el cambio queda registrado con fecha y el uso del producto no se ve afectado.

### Edge Cases

- Estado legacy (solo `consentAcceptedAt`): se migra a operativo@1.0.0 sin pérdida.
- JSON corrupto en la clave de consentimiento: error visible con opción de reinicio (política de errores del MVP).
- Retirar un propósito nunca elimina hábitos ni registros (solo futuros usos).

## Requirements

- **FR-001**: El estado de consentimiento MUST tener `{version, purposes, updatedAt}` con propósitos `operativo | mejora | investigacion`.
- **FR-002**: Guardar datos MUST exigir propósito operativo aceptado.
- **FR-003**: Ante versión nueva del aviso MUST avisar sin bloquear; renovación registra versión y fecha.
- **FR-004**: Retiro MUST registrar fecha y no afectar datos existentes.
- **FR-005**: Migración legacy MUST preservar `consentAcceptedAt` como operativo@1.0.0.
- **FR-006**: Errores de lectura/validación MUST ser visibles con reinicio explícito.
- **FR-007**: Ningún dato de respuestas/check-ins se usa para mejora o investigación sin su propósito aceptado (declaración de política + test de estructura).

## Success Criteria

- **SC-001**: 100% de casos legacy migrados sin error en pruebas.
- **SC-002**: Aceptar/retirar propósitos persiste con fechas en ≥99% de pruebas.
- **SC-003**: Sin operativo, el guardado se bloquea con mensaje claro (prueba de componente).
- **SC-004**: CI verde con las nuevas pruebas.

## Assumptions

- La versión vigente del aviso es `2.0.0` (la 1.0.0 fue el checkbox único del prototipo).
- Los textos del aviso viven en el código (MVP local-first); la versión los representa.
