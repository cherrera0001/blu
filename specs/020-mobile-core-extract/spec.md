# Feature Specification: Extracción del núcleo de dominio para móvil (`blu-core`)

**Feature Branch**: `020-mobile-core-extract`

**Created**: 2026-11-12

**Status**: Active

**Input**: Preparar la migración a una app Expo v1 extrayendo el dominio puro compartible, sin cambiar la semántica web.

**ADR**: `docs/adr/0009-app-mobile-expo-core.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Núcleo puro instalable (Priority: P1)

El equipo dispone de un paquete `packages/blu-core` con hábitos, consentimiento, companion,
historial y motor de onboarding **sin dependencias de navegador**, importable desde web y móvil.

**Why this priority**: sin frontera de dominio estable, la app móvil duplicará reglas y romperá TDD.

**Independent Test**: importar `blu-core` en Vitest y ejecutar la suite de dominio; cero referencias a `window`/`localStorage` en el grafo del paquete.

**Acceptance Scenarios**:

1. **Given** el repositorio, **When** se inspecciona `packages/blu-core`, **Then** existe `package.json` con nombre `blu-core` y un `src/index.ts` que exporta la API pública.
2. **Given** un módulo de `blu-core`, **When** se busca `window|document|localStorage|react|expo`, **Then** no hay coincidencias.
3. **Given** la app web, **When** corre `npm test` sobre suites de dominio, **Then** siguen verdes vía reexportaciones compatibles (`@/lib/...`).

---

### User Story 2 - Semántica idéntica a la web (Priority: P1)

Seleccionar hábitos, tope de 4, companion y decodificación de estado producen el mismo resultado
que antes de la extracción.

**Why this priority**: la migración no puede alterar el producto ya validado.

**Independent Test**: tests existentes de `blu`, `consent`, `companion`, `history`, `habit-catalog`, onboarding engine/scoring.

**Acceptance Scenarios**:

1. **Given** `HABITS`, **When** se cuenta, **Then** hay exactamente 7 ids conocidos.
2. **Given** `MAX_SELECTED_HABITS`, **When** se lee, **Then** vale 4.
3. **Given** un estado con check-ins, **When** `readCompanion` / `summarizeDays`, **Then** coinciden con la baseline previa (suite verde).

---

### User Story 3 - Contenido versionado junto al núcleo (Priority: P2)

Catálogo de hábitos, educación y banco de onboarding viven junto a `blu-core` y se validan al cargar.

**Why this priority**: móvil y web deben leer la misma fuente de verdad de contenido.

**Independent Test**: `validateCatalog` / `loadBank` desde rutas del paquete.

**Acceptance Scenarios**:

1. **Given** `catalog.json` en el paquete, **When** se valida, **Then** carga 7 principios.
2. **Given** un banco corrupto, **When** se valida, **Then** falla de forma visible (sin carga parcial).

---

## Edge Cases

- Reexportaciones en `src/lib/*` no deben romper imports `@/lib/...` de la UI web.
- JSON debe resolverse con `resolveJsonModule` en el paquete y en Next.
- No mover aún storage/reminders/conversation (adaptadores de plataforma).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Crear `packages/blu-core` con API pública documentada en `src/index.ts`.
- **FR-002**: Trasladar dominio puro: `blu`, `consent`, `companion`, `history`, `habit-catalog`, `habit-education`, onboarding (`bank`, `engine`, `scoring`, `baseline`, `rules`, `suggestions`, `bank-loader`).
- **FR-003**: Mantener `src/lib/<módulo>.ts` como reexportaciones estables hacia `blu-core`.
- **FR-004**: La suite Vitest de dominio permanece verde sin reducir cobertura intencional.
- **FR-005**: Prohibido introducir React/Expo/DOM en `blu-core`.

### Key Entities

- `BluState`, `ConsentState`, `CompanionView`, `HabitCatalog`, `Assessment`, `QuestionBank`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm test` verde en CI/local tras la extracción.
- **SC-002**: `npm run build` (Next) verde.
- **SC-003**: Escaneo estático sin APIs de navegador en `packages/blu-core/src`.
- **SC-004**: ADR-0009 referenciado desde la spec y la constitución actualizada.
