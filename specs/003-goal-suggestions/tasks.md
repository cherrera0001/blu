---

description: "Task list for 003-goal-suggestions"
---

# Tasks: Perfil y sugerencias de objetivos (BLU-205)

**Input**: `specs/003-goal-suggestions/` · **Tests**: sí (TDD)

## Phase 1: Setup + Foundational

- [x] T001 Spec (spec/plan) y estructura del feature
- [x] T002 Motor puro `suggestGoals` + tipos (reglas FR-001..004 publicadas)

## Phase 2: US1 — Sugerencias explicables (P1)

- [x] T003 Tests del motor: orden por nivel, máximo 3, exclusión sin nivel, barreras → versión mínima, determinismo
- [x] T004 `barrierLabels` desde respuestas multi_choice del banco

## Phase 3: US2 — Decisiones de la persona (P1)

- [x] T005 Tests de persistencia `blu.goals.v1` (aceptar/rechazar/corrupto/clear)
- [x] T006 `goals-storage.ts` con verificación de escritura y validación estructural
- [x] T007 Panel en resultado del cuestionario (aceptar/rechazar/manual) con `computedAt` estable vía `useMemo`
- [x] T008 Test de componente: flujo completo hasta aceptar y verificar `blu.goals.v1`

## Phase 4: Cierre

- [ ] T009 GREEN completo + evidencia + push + comentario en BLU-205
