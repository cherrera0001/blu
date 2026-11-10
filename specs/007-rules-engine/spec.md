# Feature Specification: Motor de recomendación por reglas explícitas (BLU-1101)

**Feature Branch**: `007-rules-engine`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Motor de recomendación basado en reglas visibles y auditables:
misma entrada → misma salida; cada sugerencia cita la regla aplicada y los datos que la
dispararon; sin invención de datos; máximo 3; sin base → respuesta honesta."

## User Scenarios & Testing

### User Story 1 - Reglas con trazabilidad (Priority: P1)

Las sugerencias actuales (BLU-205) se formalizan como un catálogo de reglas versionado:
banda baja elige el principio; barreras de tiempo/energía eligen la versión mínima; si ya
está en la versión mínima se dice; sin niveles no hay sugerencias. Cada resultado incluye
`ruleId` y la explicación cita regla y datos.

**Acceptance Scenarios**:

1. **Given** un perfil con bandas, **When** se recomienda, **Then** cada sugerencia lleva `ruleId` y explicación que lo menciona.
2. **Given** barrera de tiempo, **When** aplica la regla R2, **Then** la acción es la versión mínima.
3. **Given** un hábito ya adaptado a su versión mínima, **When** se recomienda, **Then** la explicación lo declara (R3) sin proponer de nuevo lo mismo.
4. **Given** mismo perfil y respuestas, **When** se ejecuta dos veces, **Then** resultados idénticos (determinismo).

## Requirements

- **FR-001**: El motor MUST ser puro y determinista; las reglas viven en código versionado (constitución VIII).
- **FR-002**: Cada recomendación MUST incluir `ruleId` y explicación comprensible.
- **FR-003**: Máximo 3; sin niveles → lista vacía (flujo manual).
- **FR-004**: Compatibilidad: `suggestGoals` mantiene su firma y añade `ruleId`.

## Success Criteria

- SC-001: 100% de las recomendaciones con `ruleId` (prueba).
- SC-002: Pruebas de determinismo y de cada regla R1–R4 verdes en CI.
- SC-003: `suggestGoals` existentes sin regresiones.

## Assumptions

- Las reglas son funciones en código (no DSL externo) para mantener la simplicidad (constitución X); el catálogo se documenta en este spec.
