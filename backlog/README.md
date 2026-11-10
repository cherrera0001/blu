# Backlog Blu — Convenciones y contrato de calidad

Fuente de verdad del backlog: estos archivos. Los issues de GitHub se generan desde aquí;
cada historia cita su spec, plan y evidencias. Cambios al backlog se proponen como PR
que modifica estos archivos y regenera issues.

## Identificadores

- Épica: `EPIC-NN` (16 épicas, ver `epics/`).
- Historia: `BLU-NNN` = `epicNumber * 100 + índice` (ej. BLU-203 = épica 02, historia 3).
- Spec/feature: `specs/NNN-<slug>/` (Spec Kit). Una historia Ready exige spec + plan + tasks.

## Definition of Ready (global, se suma al DoR de cada historia)

- Historia redactada con criterios de aceptación en Gherkin y casos positivos/negativos/límites.
- Dependencias resueltas o explicitadas; valor de negocio/persona claro.
- Riesgos de privacidad, seguridad y accesibilidad identificados.
- Estimación (Size) y prioridad asignadas en GitHub Projects.
- Diseño de evidencia definido: qué pruebas la satisfacen y dónde se archivan.

## Definition of Done (global, se suma al DoD de cada historia)

- Código implementado bajo TDD (RED → GREEN → REFACTOR) con pruebas automatizadas que pasan en CI.
- Criterios de aceptación verificados uno a uno contra evidencia reproducible.
- Revisión de código y verificación de ausencia de datos personales innecesarios.
- Documentación actualizada (README, ADR si aplica, spec actualizado si cambió el alcance).
- Issue actualizado: enlace a PR, evidencias, `Evidence Status` = Recolectada o Verificada.
- Accesibilidad: navegación por teclado, etiquetas, foco visible y contraste verificados.

## Prioridades

- **P0**: bloquea lanzamiento del MVP o riesgo legal/ético.
- **P1**: necesario para el MVP usable.
- **P2**: importante para V1.
- **P3**: mejora, investigación o V2.

## Fases

- **MVP**: prototipo local evaluable (sin backend, sin LLM remoto).
- **V1**: backend con cuentas, consentimiento robusto, asistente con IA controlada.
- **V2**: RAG con evidencia aprobada, memoria, investigación a escala.

## Reglas de trazabilidad

1. Historia → criterios Gherkin → pruebas (unitarias/integración/E2E) → resultado en CI → issue.
2. Ninguna historia pasa a Done solo porque compila: exige evidencia ejecutada y revisada.
3. Decisiones arquitectónicas significativas se documentan en `docs/adr/`.
4. Afirmaciones de salud requieren fuente aprobada en el registro de evidencia (EPIC-13) o deben
   rotularse «sin evidencia verificada».

## Estado de cierre del MVP (2026-11-04)

Las **40 historias de fase MVP están implementadas con evidencia** (pruebas en repo + notas por
historia en los archivos de épica) o resueltas en su alcance local, con commits atómicos en
`main` y validación continua (npm test, lint, build, eval:security).

Las **16 historias V1 y 3 de V2 están GATED**: requieren backend, cuentas, sincronización o IA
remota, y no pueden implementarse sin las aprobaciones explícitas de privacidad, seguridad,
revisión científica, ética y análisis jurídico exigidas por el PRD §8 y la constitución
(II Privacy by Design, X simplicidad), según ADR-0001 (local-first). Cada historia V1/V2 lleva
nota con el gate citado en su archivo de épica.
