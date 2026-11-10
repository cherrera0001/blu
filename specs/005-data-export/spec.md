# Feature Specification: Exportar mis datos (BLU-103)

**Feature Branch**: `005-data-export`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Desde el panel de privacidad, exportar todo mi estado local en un
archivo JSON legible con versión de formato: hábitos, registros, adaptaciones, consentimientos,
objetivos y resultado del cuestionario. Nada sale del navegador salvo la descarga que la persona
inicia."

## User Scenarios & Testing

### User Story 1 - Exportación legible y versionada (Priority: P1)

La persona descarga un archivo JSON con todo su estado local, envuelto en un bundle con
`formatVersion` y `exportedAt`, que incluye el estado principal, el cuestionario y los objetivos.

**Acceptance Scenarios**:

1. **Given** una persona con hábitos y registros, **When** elige «Exportar mis datos», **Then** se descarga un JSON con `formatVersion`, `exportedAt` y las secciones `state`, `onboarding`, `goals`.
2. **Given** estado vacío, **When** exporta, **Then** el bundle lo declara (`state: null` cuando no hay nada) sin error.
3. **Given** el archivo, **When** se inspecciona, **Then** no contiene campos de terceros ni texto del chat (los mensajes nunca se persisten).

### Edge Cases

- Estado de onboarding/goals corrupto → exporta `null` en esa sección con `error` declarado, sin romper el resto.
- Navegador sin APIs de descarga → mensaje visible con alternativa (copiar al portapapeles no se ofrece en MVP; se indica borrar manualmente).
- Doble clic rápido → una sola descarga por clic (handler idempotente por evento).

## Requirements

- **FR-001**: El bundle MUST tener `{formatVersion: "1.0.0", exportedAt, app: "blu", state, onboarding, goals}`.
- **FR-002**: La exportación MUST ser iniciada solo por la persona (botón explícito); nada sale del navegador en otro momento.
- **FR-003**: Secciones ilegibles MUST exportarse como `null` con `errors` por sección (nunca fallar entero).
- **FR-004**: El nombre de archivo MUST incluir fecha local (`blu-export-AAAA-MM-DD.json`).
- **FR-005**: El botón MUST estar junto a «Borrar mis datos» en el dashboard (panel de privacidad mínimo).

## Success Criteria

- **SC-001**: El bundle generado contiene todas las secciones con la estructura esperada (prueba unitaria).
- **SC-002**: El clic de exportación dis exactamente una descarga con el JSON correcto (prueba de componente con URL/createObjectURL mockeados).
- **SC-003**: Estado totalmente vacío exporta sin errores.
- **SC-004**: CI verde.

## Assumptions

- El formato es JSON legible (no cifrado): el MVP ya declara que el almacenamiento local no está cifrado.
- La restauración/importación queda fuera del MVP (historia futura del backlog).
