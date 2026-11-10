# Evidencia — Feature 003: Perfil y sugerencias de objetivos (BLU-205)

**Fecha:** 2026-11-04 · **Historia:** BLU-205 (cierra el núcleo de EPIC-02)
**Spec:** `specs/003-goal-suggestions/` · **Método:** TDD

## Resultados (copia limpia Linux, Node 24.22.1)

| Chequeo | Resultado |
|---|---|
| `vitest run` (12 archivos) | **84/84 OK** |
| `npm run eval:security` | 3/3 OK (sin regresiones en el agente) |
| `eslint` | 0 problemas |
| `next build` | OK |

## Qué se construyó

- **Motor puro `suggestGoals`** (`src/lib/onboarding/suggestions.ts`): reglas publicadas en el
  spec — solo principios con nivel, orden ascendente por score con desempate determinista por
  orden del banco, máximo 3; barreras declaradas (`multi_choice`) de tiempo/energía seleccionan
  la **versión mínima** del hábito y se citan en la explicación; explicación vinculada al
  principio y a las respuestas reales (FR-001..004, SC-001).
- **Persistencia de decisiones** (`goals-storage.ts`, clave `blu.goals.v1`): aceptar guarda con
  `suggestionId`, principio, acción y `decidedAt` (FR-007); rechazar queda registrado;
  escritura verificada, estados corruptos con error visible, validación estructural estricta.
- **Panel en el resultado del cuestionario**: hasta tres sugerencias con explicación, botones
  Aceptar/Rechazar accesibles, estados inline tras decidir, y salida manual siempre visible
  (FR-006). `computedAt` estabilizado con `useMemo` para que las decisiones sobrevivan renders.
- **Perfil vacío → sin sugerencias** (SC-003, prueba de motor).

## Incidentes y correcciones de la iteración

1. `scoreAssessment` generaba `computedAt` en cada render → decisiones "perdidas" entre renders;
   se estabilizó memoizando el perfil por assessment completado.
2. TypeScript no aplica narrowing dentro de *function declarations* anidadas (hoisting);
   se migraron los handlers a const de arrow functions.
3. Texto duplicado en pruebas: las explicaciones contienen "tu autodiagnóstico", lo que rompía
   `getByText` ambiguo; se apuntaron los queries por rol `heading`.

## Reproducir

```bash
npm ci && npm test && npm run eval:security && npm run lint && npm run build
```
