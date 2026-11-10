# Evidencia — Feature 005: Exportar mis datos (BLU-103)

**Fecha:** 2026-11-04 · **Historia:** BLU-103 (EPIC-01, P1)
**Spec:** `specs/005-data-export/` · **Método:** TDD

## Resultados (copia limpia Linux, Node 24.22.1)

| Chequeo | Resultado |
|---|---|
| `vitest run` (14 archivos) | **105/105 OK** |
| `npm run eval:security` | 3/3 OK (sin regresiones) |
| `eslint` | 0 problemas |
| `next build` | OK |

## Qué se construyó

- **Bundle versionado** (`src/lib/export.ts`): `{formatVersion: "1.0.0", app: "blu",
  exportedAt, state, onboarding, goals, errors}` — todas las secciones del estado local
  (hábitos/registros/adaptaciones/consentimientos, cuestionario, objetivos) en un JSON legible.
- **Secciones ilegibles** exportan como `null` con el error declarado por sección (FR-003);
  estado vacío exporta sin errores (SC-003).
- **Descarga iniciada solo por la persona** (FR-002): botón «Exportar mis datos» junto a
  «Consentimientos» y «Borrar todos los datos»; nombre de archivo con fecha local
  (`blu-export-AAAA-MM-DD.json`, FR-004); un solo disparo por clic con limpieza del object URL.
- El bundle nunca contiene texto del chat (los mensajes jamás se persisten).

## Incidentes de la iteración

1. Test unitario de descarga: el mock de `click` se aplicaba a un objeto ancla falso, pero el
   código crea un ancla real vía `document.createElement` → se corrigió espiando
   `HTMLAnchorElement.prototype.click`.
2. Test de componente sin `render()` inicial (fallo de autoría) — detectado por el mensaje
   «no accessible roles» con body vacío.

## Reproducir

```bash
npm ci && npm test && npm run eval:security && npm run lint && npm run build
```
