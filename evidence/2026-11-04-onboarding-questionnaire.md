# Evidencia — Feature 001: Onboarding con autodiagnóstico de hábitos

**Fecha:** 2026-11-04 · **Historias:** BLU-201, BLU-202, BLU-203 (skipIf), BLU-204
**Spec:** `specs/001-onboarding-questionnaire/` · **Método:** TDD (RED → GREEN → REFACTOR)

## Resultados finales (copia limpia Linux, Node 24.22.1)

| Chequeo | Resultado |
|---|---|
| `vitest run` (7 archivos) | **50/50 OK** |
| `eslint` | **0 errores** |
| `next build` | **OK** (`/` y `/cuestionario` estáticos) |

## Cobertura de criterios de aceptación

- **BLU-201 (banco versionado):** 10 pruebas — banco real válido (7 principios × ≥5 preguntas,
  35 total), rechazo de principio faltante, <5 preguntas, IDs duplicados, `skipIf` roto,
  ciclos de `skipIf`, términos clínicos (FR-010), likert sin anclas, valores duplicados.
- **BLU-202 (progreso + reanudación):** 5 pruebas de storage (guardado verificado, corrupto →
  error visible, `bankVersion` conservado) + prueba de componente que responde 2 preguntas,
  desmonta y retoma en la 3ª.
- **BLU-203 (ramificación):** recorrido efectivo; `vin-04` omitida cuando `vin-01 = 3`;
  preguntas omitidas por regla no se exigen; ciclo detectado en validación.
- **BLU-204 (puntuación):** bandas 0–39/40–69/70–100, confianza reducida >30% omisiones,
  sin nivel cuando no hay respuestas puntuables, `multi_choice` excluida, rotulo
  «experimental / no es un diagnóstico» verificado en UI.

## Iteraciones TDD registradas

1. RED: 5 archivos de prueba escritos antes que la implementación; fallaron por módulos
   ausentes (evidencia en historial de la sesión).
2. GREEN iterativo: 3 rondas de corrección (mensajes de error, tipos multi_choice,
   `resolveJsonModule`, prerender determinista de Next.js 16 con `useSyncExternalStore`).
3. REFACTOR: scoring simplificado (omisiones voluntarias vs. reglas), guard de versión
   relajado con trazabilidad conservada.

## Reproducir

```bash
npm ci && npm test && npm run lint && npm run build
```
