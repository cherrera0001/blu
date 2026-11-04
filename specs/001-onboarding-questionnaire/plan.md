# Implementation Plan: Onboarding con autodiagnóstico de hábitos

**Branch**: `001-onboarding-questionnaire` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-onboarding-questionnaire/spec.md`

## Summary

Motor de dominio puro (TypeScript) para autodiagnóstico de hábitos: valida el banco de preguntas
versionado, resuelve el recorrido con omisiones y saltos (`skipIf`), persiste el progreso en
`localStorage` y calcula niveles orientativos por principio con confianza. UI mínima en la página
`/cuestionario` integrada al onboarding existente. TDD obligatorio (constitución III).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node 20.9+ / Next.js 16.4.5

**Primary Dependencies**: React 19, Vitest 5, @testing-library/react (ya instalados); sin
dependencias nuevas.

**Storage**: `localStorage`, clave `blu.onboarding.v1` (separada de `blu.local.v1`), con
verificación de escritura y errores visibles (mismas convenciones que `src/lib/storage.ts`).

**Testing**: Vitest + Testing Library; pruebas unitarias del motor y de componente; cobertura de
reglas `skipIf` al 100%.

**Target Platform**: Navegador moderno (Chrome/Edge/Firefox/Safari recientes); responsive móvil.

**Project Type**: web-app (Next.js App Router)

**Performance Goals**: cálculo del perfil <10 ms para 35 preguntas; render inicial del
cuestionario <100 ms en dispositivo móvil medio.

**Constraints**: sin red (MVP local-first); bundle sin aumento significativo; accesible con
teclado y lector de pantalla (constitución IV).

**Scale/Scope**: 1 sesión de onboarding por persona; banco de 35 preguntas, 7 principios.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Evaluación |
|---|---|
| I. Evidence-first | Cada pregunta lleva `evidence` con estado «pendiente»; la UI rotula el resultado como experimental. Cumple. |
| II. Privacy | Sin datos nuevos sensibles; nada sale del navegador; consentimiento vigente. Cumple. |
| III. Testability | TDD con pruebas antes que implementación; CI ejecuta evidencia (BLU-1402). Cumple. |
| IV. Accessibility | Formulario operable por teclado, `aria-live` para progreso, foco visible. Cumple. |
| V. Human-in-the-Loop | La persona omite, reanuda y decide; ninguna sugerencia se impone en este alcance. Cumple. |
| VI. Trazabilidad | Historias BLU-201..204 ↔ spec ↔ tasks ↔ issues ↔ evidencia. Cumple. |
| VII. Sin afirmaciones médicas | FR-010 valida ausencia de contenido clínico. Cumple. |
| VIII. Aprendizaje controlado | Sin aprendizaje automático en este feature. Cumple. |
| IX. Arquitectura modular | Motor puro en `src/lib/onboarding/`, UI en `src/app/cuestionario/`, datos en `src/data/`. Cumple. |
| X. Simplicidad | Sin backend, sin librerías nuevas; solución mínima que cumple FR-001..010. Cumple. |

Sin violaciones que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/001-onboarding-questionnaire/
├── spec.md              # Este flujo (/speckit-specify)
├── plan.md              # Este archivo (/speckit-plan)
├── data-model.md        # Entidades y esquemas
└── tasks.md             # Descomposición TDD (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── data/onboarding/bank.json          # Banco versionado (BLU-201)
├── lib/onboarding/
│   ├── bank.ts                        # Tipos + validación del banco (FR-001, FR-010)
│   ├── engine.ts                      # Recorrido, respuestas, skipIf (FR-002, FR-003)
│   ├── scoring.ts                     # Índice, bandas, confianza (FR-005, FR-006)
│   ├── storage.ts                     # Persistencia progresiva verificada (FR-004, FR-009)
│   └── __tests__ o *.test.ts          # Pruebas unitarias del motor
└── app/cuestionario/
    ├── page.tsx                       # Entrada de la ruta
    └── QuestionnaireApp.tsx           # UI progresiva con omisión y resultado

src/app/page.tsx                       # Enlace al cuestionario desde onboarding
```

**Structure Decision**: single-project (web app). El motor es puro e importable sin React, lo que
permite probarlo con Vitest sin DOM y reutilizarlo luego con backend (ADR futuro si aplica).

## Complexity Tracking

Sin violaciones de constitución; tabla no aplica.
