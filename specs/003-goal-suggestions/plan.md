# Implementation Plan: Perfil y sugerencias de objetivos

**Branch**: `003-goal-suggestions` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

## Summary

Motor puro `suggestGoals(bank, assessment, profile)` que prioriza principios con nivel bajo,
elige acción (normal o versión mínima según barreras declaradas) y genera explicaciones
trazables; persistencia de decisiones en `blu.goals.v1`; panel de sugerencias en la pantalla de
resultado del cuestionario con aceptar/rechazar/manual. Sin dependencias nuevas.

## Technical Context

TypeScript 5 / Next.js 16 · Vitest + Testing Library · storage localStorage con verificación ·
sin red (MVP) · reglas deterministas (no `new Date()` en render; `decidedAt` se genera en el
handler del evento).

## Constitution Check

I–X cumplidas: sin afirmaciones de salud (su herencias del catálogo ya rotuladas), privacidad
local, TDD, teclado/lector (botones nativos), control humano total (FR-006), trazabilidad
(FR-007), sin aprendizaje opaco (reglas explícitas), modular (motor puro), simple.

## Project Structure

```text
specs/003-goal-suggestions/{spec,plan,tasks}.md
src/lib/onboarding/suggestions.ts        # motor + tipos
src/lib/onboarding/suggestions.test.ts   # pruebas del motor y persistencia
src/lib/onboarding/goals-storage.ts      # blu.goals.v1 (load/save/clear verificado)
src/app/cuestionario/QuestionnaireApp.tsx# panel de sugerencias en resultado
src/app/cuestionario/QuestionnaireApp.test.tsx # flujo aceptar/rechazar/manual
```

## Complexity Tracking

No aplica.
