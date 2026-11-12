# Feature Specification: Shell móvil Blu v1 (Expo)

**Feature Branch**: `021-mobile-shell-v1`

**Created**: 2026-11-12

**Status**: Draft (depende de 020)

**Input**: Primera app móvil usable: onboarding llano, check-in, resumen, borrado; dominio vía `blu-core`.

**ADR**: `docs/adr/0009-app-mobile-expo-core.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir hasta 4 de 7 temas (Priority: P1)

La persona ve los siete temas con descripción, elige entre 1 y 4, acepta el aviso y entra a “Hoy”.

**Acceptance Scenarios**:

1. **Given** instalación limpia, **When** abre la app, **Then** ve exactamente 7 temas y el contador «elige hasta 4».
2. **Given** 4 temas marcados, **When** intenta un quinto, **Then** no se añade y se explica el tope.
3. **Given** al menos 1 tema + aviso aceptado, **When** continúa, **Then** persiste en el dispositivo y muestra la pantalla Hoy.

### User Story 2 - Marcar el paso de hoy (Priority: P1)

**Acceptance Scenarios**:

1. **Given** hábitos activos, **When** marca uno, **Then** queda registrado para la fecha local y se puede desmarcar.
2. **Given** app reiniciada, **When** vuelve el mismo día, **Then** el check-in persiste.

### User Story 3 - Borrar mis datos (Priority: P1)

**Acceptance Scenarios**:

1. **Given** datos locales, **When** confirma borrado, **Then** no queda estado de Blu y vuelve al onboarding.

## Requirements

- **FR-001**: App Expo en `apps/mobile` importa solo dominio desde `blu-core`.
- **FR-002**: Persistencia vía adaptador (AsyncStorage); sin cuentas.
- **FR-003**: UI lenguaje llano (mismo criterio senior que web post-021 web).
- **FR-004**: Chat/voz fuera de esta spec (025/026).
- **FR-005**: TDD: pruebas de dominio + pruebas de pantalla onboarding (7 botones, tope 4).

## Success Criteria

- **SC-001**: Flujo elige → marca → borra en dispositivo/emulador.
- **SC-002**: Suite `blu-core` verde sin cambios semánticos.
