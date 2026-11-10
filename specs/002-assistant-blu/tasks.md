---

description: "Task list for 002-assistant-blu"
---

# Tasks: Asistente Blu (capa de agente local)

**Input**: `specs/002-assistant-blu/` · **Tests**: sí (TDD constitución III)

## Phase 1: Setup

- [x] T001 `src/lib/assistant/` + `src/data/assistant/` + specs
- [x] T002 Dataset redteam versionado (`redteam.json`, 14 casos)

## Phase 2: Foundational

- [x] T003 Tipos del contrato (`types.ts`) y prompts aislados (`prompts.ts`)

## Phase 3: US1 — Contrato y orquestación (P1) 🎯

- [x] T004 Tests orquestador (metadatos, no-filtración de instrucciones)
- [x] T005 Implementar `BluAssistant.ask()` con latencia y metadatos

## Phase 4: US2 — Guardián deny-by-default (P1)

- [x] T006 Tests guardián (clasificación crisis/clínica/boundary, validateOutput, eventos sin PII)
- [x] T007 Implementar `guardian.ts` (normalización, patrones, eventos ring buffer)
- [x] T008 Tests proveedor local (reglas actuales tras el contrato)
- [x] T009 Implementar `LocalRuleProvider` + compat `conversation.ts`

## Phase 5: US3 — Red teaming en CI (P2)

- [x] T010 Tests suite (≥8 ataques, ≥3 controles, umbral 100%)
- [x] T011 Runner `redteam.ts` + script `npm run eval:security`

## Phase 6: Integración y cierre

- [x] T012 BluApp usa el orquestador async; test actualizado a `findByText`
- [ ] T013 GREEN completo (test + lint + build) + evidencia + push
- [ ] T014 Comentarios de evidencia en BLU-1001/1002/1004
