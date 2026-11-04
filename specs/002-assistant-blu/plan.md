# Implementation Plan: Asistente Blu (capa de agente local)

**Branch**: `002-assistant-blu` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

## Summary

Capa de asistente desacoplada: contrato `AssistantProvider` con implementación local
determinista, orquestador `BluAssistant` con guardián deny-by-default (intercepción previa de
crisis/clínica y validación posterior de salida), eventos categóricos sin PII y suite de red
teaming versionada ejecutable en CI. Sin red, sin secretos, sin LLM remoto (MVP).

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20.9+ / Next.js 16.4.5
**Primary Dependencies**: ninguna nueva (React/Vitest existentes)
**Storage**: sin persistencia; eventos en ring buffer en memoria (tope 50)
**Testing**: Vitest + pruebas con proveedores falsos; suite redteam como datos
**Target Platform**: navegador (cliente) y CI (node)
**Project Type**: web-app (módulo de dominio puro)
**Performance Goals**: clasificación <1 ms; respuesta total <5 ms (local)
**Constraints**: sin red (FR-010); deterministicidad en prerender (no `new Date()` en render de UI; timestamps solo en handlers/servicios invocados por eventos)
**Scale/Scope**: 1 sesión; ~40 patrones de riesgo; set inicial de ~14 ataques

## Constitution Check

| Principle | Evaluación |
|---|---|
| I. Evidence-first | El asistente no emite afirmaciones de salud; validador bloquea eficacia/causalidad. Cumple. |
| II. Privacy | Eventos sin contenido; nada sale del navegador. Cumple. |
| III. Testability | TDD; suite de seguridad en CI. Cumple. |
| IV. Accessibility | La UI existente mejora con metadatos (badge de modo). Cumple. |
| V. Human-in-the-Loop | El usuario ve el disclosure de modo; ninguna acción autónoma. Cumple. |
| VI. Trazabilidad | BLU-1001/1002/1004 ↔ spec ↔ tasks ↔ issues ↔ evidencia. Cumple. |
| VII. Sin afirmaciones médicas | Guardian deny-by-default con textos seguros fijos. Cumple. |
| VIII. Aprendizaje controlado | Cambios de patrones/reglas solo por PR versionado. Cumple. |
| IX. Arquitectura modular | Contrato + orquestador + proveedor + guardián separados. Cumple. |
| X. Simplicidad | Sin LLM, sin backend, sin dependencias nuevas. Cumple. |

Sin violaciones.

## Project Structure

```text
specs/002-assistant-blu/
├── spec.md  plan.md  tasks.md  data-model.md

src/lib/assistant/
├── types.ts            # Contrato AssistantProvider, AssistantReply, metadatos
├── prompts.ts          # Instrucciones del sistema (aisladas, versionadas)
├── guardian.ts         # Clasificación de entrada + validación de salida + eventos
├── assistant.ts        # Orquestador BluAssistant
├── providers/
│   └── local.ts        # LocalRuleProvider (reglas deterministas actuales)
├── redteam.ts          # Runner de la suite (datos → resultado)
└── *.test.ts           # Pruebas por módulo + redteam.test.ts

src/data/assistant/redteam.json   # Set de ataques y controles versionado
src/app/BluApp.tsx                # Usa BluAssistant en vez de respondToMessage directo
```

**Structure Decision**: módulo puro importable sin React; la UI solo consume `BluAssistant.ask`.

## Complexity Tracking

No aplica (sin violaciones).
