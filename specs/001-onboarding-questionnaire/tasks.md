---

description: "Task list for 001-onboarding-questionnaire"
---

# Tasks: Onboarding con autodiagnóstico de hábitos

**Input**: Design documents from `/specs/001-onboarding-questionnaire/`

**Prerequisites**: plan.md, spec.md (user stories), `src/data/onboarding/bank.json`

**Tests**: Tests included — constitución III (TDD obligatorio).

**Organization**: Tasks grouped by user story; cada historia se implementa y prueba de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: US1, US2, US3
- Rutas exactas en cada descripción

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: estructura base del feature

- [ ] T001 Crear `src/lib/onboarding/` y `src/app/cuestionario/` según plan.md
- [ ] T002 [P] Crear `specs/001-onboarding-questionnaire/data-model.md` con entidades Assessment/PrincipleResult/Profile

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos y validación del banco — base de TODAS las historias

**⚠️ CRITICAL**: ninguna historia de usuario puede avanzar sin esta fase

- [ ] T003 [P] [US1] Definir tipos `QuestionBank`, `Principle`, `Question`, `Option`, `SkipIf` en `src/lib/onboarding/bank.ts`
- [ ] T004 [US1] Implementar `validateBank(raw: unknown): QuestionBank` con todas las reglas FR-001 y FR-010 en `src/lib/onboarding/bank.ts`

**Checkpoint**: banco validado y tipado; errores descriptivos.

---

## Phase 3: User Story 1 - Validar y recorrer el banco (Priority: P1) 🎯 MVP

**Goal**: motor que carga el banco, valida respuestas y resuelve el recorrido con `skipIf`.

**Independent Test**: pruebas unitarias del motor con el banco real y con bancos inválidos.

### Tests for User Story 1 ⚠️ (RED primero)

- [ ] T005 [P] [US1] Tests de `validateBank`: banco real OK; principio faltante; <5 preguntas; `skipIf` roto; ciclo de saltos; tipo inválido; pregunta con término clínico (FR-010) — en `src/lib/onboarding/bank.test.ts`
- [ ] T006 [P] [US1] Tests del recorrido: orden efectivo; omisión por `skipIf` (vin-04 con vin-01=3); respuesta fuera de alternativas rechazada; recorrido completo con el banco real — en `src/lib/onboarding/engine.test.ts`

### Implementation for User Story 1

- [ ] T007 [US1] Implementar `createAssessment(bank)`, `answerQuestion(assessment, questionId, value)`, `getEffectiveQuestions(bank, assessment)` en `src/lib/onboarding/engine.ts`
- [ ] T008 [US1] Cargar y validar el banco desde `src/data/onboarding/bank.json` en `src/lib/onboarding/bank-loader.ts` (error visible si falla)

**Checkpoint**: US1 funcional de forma aislada con pruebas verdes.

---

## Phase 4: User Story 2 - Guardado progresivo y reanudación (Priority: P2)

**Goal**: persistencia por pregunta con `bankVersion` y reanudación tras recarga.

**Independent Test**: test de componente que avanza, desmonta, remonta y retoma.

### Tests for User Story 2 ⚠️

- [ ] T009 [P] [US2] Tests de `src/lib/onboarding/storage.ts`: guardar respuesta verifica escritura; estado corrupto produce error visible; versión distinta se conserva y avisa — en `src/lib/onboarding/storage.test.ts`
- [ ] T010 [P] [US2] Test de reanudación en `src/app/cuestionario/QuestionnaireApp.test.tsx`: responde 2 preguntas, remonta, retoma en la 3ª

### Implementation for User Story 2

- [ ] T011 [US2] Implementar persistencia `blu.onboarding.v1` en `src/lib/onboarding/storage.ts` (mismas convenciones que `src/lib/storage.ts`: verificación de escritura, errores visibles)
- [ ] T012 [US2] UI progresiva en `src/app/cuestionario/QuestionnaireApp.tsx`: una pregunta por pantalla, progreso accesible, botón «prefiero no responder» en `skippable`, guardado por respuesta
- [ ] T013 [US2] Ruta `src/app/cuestionario/page.tsx` + enlace desde onboarding en `src/app/page.tsx`

**Checkpoint**: US2 funcional: reanudación real tras recarga con teclado/lector.

---

## Phase 5: User Story 3 - Puntuación orientativa experimental (Priority: P3)

**Goal**: perfil por principio con bandas, confianza y rotulado experimental.

**Independent Test**: pruebas del cálculo con casos de ejemplo y casos límite.

### Tests for User Story 3 ⚠️

- [ ] T014 [P] [US3] Tests de `src/lib/onboarding/scoring.ts`: bandas 0–39/40–69/70–100; confianza reducida >30% omisiones; sin respuestas → sin nivel; `multi_choice` excluida — en `src/lib/onboarding/scoring.test.ts`
- [ ] T015 [US3] Test de UI: resultado renderiza rotulo «experimental, no diagnóstico» y niveles por principio

### Implementation for User Story 3

- [ ] T016 [US3] Implementar `scoreAssessment(bank, assessment): Profile` en `src/lib/onboarding/scoring.ts`
- [ ] T017 [US3] Pantalla de resultado en `QuestionnaireApp.tsx` con rotulado FR-007 y confianza

**Checkpoint**: las 3 historias funcionan de forma independiente y en conjunto.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Ejecutar lint, pruebas y build completos; capturar salida en `evidence/2026-11-04-onboarding-questionnaire.md`
- [ ] T019 Actualizar README con la ruta `/cuestionario` y estado del feature
- [ ] T020 Actualizar issues BLU-201..204 con enlaces a spec y evidencia; mover BLU-201/202/204 apropiadamente en el Project

---

## Dependencies & Execution Order

- **Setup (T001–T002)**: inmediato.
- **Foundational (T003–T004)**: bloquea a las historias; TDD inmediato tras setup.
- **US1 (T005–T008)**: después de Foundational.
- **US2 (T009–T013)**: después de US1 (depende del motor).
- **US3 (T014–T017)**: después de US1 (solo necesita motor; puede solaparse con US2 en equipo).
- **Polish (T018–T020)**: al final.

### Within Each User Story

- Tests escritos y en ROJO antes de implementar (constitución III).
- Modelos/validación → motor → UI.
- Commit lógico tras cada fase verde.

## Implementation Strategy

### MVP First

1. Setup + Foundational → motor validado.
2. US1 → pruebas verdes → motor funcional.
3. US2 → UI real con reanudación → vertical completa navegable.
4. US3 → resultado visible → valor entregado de extremo a extremo.

## Notes

- [P] = archivos distintos sin dependencias.
- Verificar ROJO antes de implementar cada tarea.
- Sin dependencias nuevas; sin backend (constitución X).
