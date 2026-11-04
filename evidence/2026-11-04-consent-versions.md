# Evidencia — Feature 004: Consentimiento versionado por propósito (BLU-102)

**Fecha:** 2026-11-04 · **Historia:** BLU-102 (EPIC-01, P0)
**Spec:** `specs/004-consent-versions/` · **Método:** TDD

## Resultados (copia limpia Linux, Node 24.22.1)

| Chequeo | Resultado |
|---|---|
| `vitest run` (13 archivos) | **98/98 OK** |
| `npm run eval:security` | 3/3 OK (sin regresiones) |
| `eslint` | 0 problemas |
| `next build` | OK |

## Qué se construyó

- **Dominio** (`src/lib/consent.ts`): `ConsentState {version, purposes, updatedAt}` con propósitos
  `operativo | mejora | investigacion`; versión vigente `2.0.0`; aceptar/retirar con fecha;
  `needsReconsent`; validación estructural estricta.
- **Migración legacy (FR-005)**: `decodeState` normaliza el checkbox único del prototipo a
  `operativo@1.0.0` conservando `consentAcceptedAt` (back-compat). Estructura inválida → error
  visible (FR-006).
- **UI**: onboarding con los tres propósitos (operativo requerido — sin él no hay guardado,
  SC-003); gestión de consentimientos desde el dashboard (retiro de propósitos opcionales con
  fecha; operativo solo vía borrado de datos); banner de renovación cuando el aviso sube de
  versión — sin bloquear el uso ni borrar datos (FR-003).
- **Pruebas nuevas**: dominio completo, migración/validación, persistencia separada de
  propósitos, bloqueo sin operativo, banner legacy.

## Decisiones

- Textos del aviso viven en código (MVP local-first); la versión semántica los representa y
  dispara el re-consentimiento.
- Retirar un propósito nunca elimina hábitos ni registros (solo futuros usos) — test dedicado.

## Reproducir

```bash
npm ci && npm test && npm run eval:security && npm run lint && npm run build
```
