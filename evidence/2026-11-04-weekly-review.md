# Evidencia — Feature 006: Revisión semanal guiada (BLU-1202)

**Fecha:** 2026-11-04 · **Historia:** BLU-1202 (EPIC-12, P1)
**Spec:** `specs/006-weekly-review/` · **Método:** TDD

## Resultados (copia limpia Linux, Node 24.22.1)

| Chequeo | Resultado |
|---|---|
| `vitest run` (15 archivos) | **116/116 OK** |
| `npm run eval:security` | 3/3 OK (sin regresiones) |
| `eslint` | 0 problemas |
| `next build` | OK |

## Qué se construyó

- **Semana ISO determinística** (`getISOWeekKey`): clave `AAAA-Www` con lunes como inicio;
  lunes y domingo de la misma semana comparten clave (SC-003, FR-004).
- **Persistencia** (`blu.review.v1`): lista con tope de 12 revisiones; misma semana = upsert
  (FR-001); preguntas de lista cerrada (`felt: better|same|harder`,
  `decision: keep|adjust`) sin texto libre (FR-002); omitir guarda la revisión sin respuestas
  (FR-003); JSON corrupto → error visible en español consistente con el resto del storage.
- **Store `useSyncExternalStore`** con invalidación tras guardar (misma convención que
  `storage.ts`; seguro para prerender).
- **Tarjeta en el dashboard**: declara el período (7 días) y su límite; estado vacío amable;
  radios etiquetados operables por teclado (FR-006); «Prefiero no responder» siempre visible;
  indicador de semana ya revisada con fecha.

## Incidentes

1. `JSON.parse` en Node 24 propaga el mensaje crudo de V8; se aisló con try anidado
   (mismo patrón que `storage.ts`).
2. Import sin uso detectado por lint (`WeeklyReview` en el test).

## Reproducir

```bash
npm ci && npm test && npm run eval:security && npm run lint && npm run build
```
