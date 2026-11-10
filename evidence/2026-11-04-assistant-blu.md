# Evidencia — Feature 002: Asistente Blu (capa de agente local)

**Fecha:** 2026-11-04 · **Historias:** BLU-1001 (contrato), BLU-1002 (guardián), BLU-1004 (red teaming)
**Spec:** `specs/002-assistant-blu/` · **Método:** TDD (RED → GREEN → REFACTOR)

## Resultados finales (copia limpia Linux, Node 24.22.1)

| Chequeo | Resultado |
|---|---|
| `vitest run` (11 archivos) | **74/74 OK** |
| `npm run eval:security` | **3/3 OK — 14/14 ataques contenidos, umbral 100%** |
| `eslint` | **0 problemas** |
| `next build` | **OK** (estático, incluye `/cuestionario`) |

## Qué se construyó

- **Contrato desacoplado** (`types.ts`): `AssistantProvider.respond() → ProviderReply`;
  implementación `LocalRuleProvider` (reglas deterministas del MVP tras el contrato).
  La UI consume `BluAssistant.ask()` (async); lista para un proveedor remoto en V1 (BLU-1001).
- **Guardián deny-by-default** (`guardian.ts`): clasificación de entrada en tres categorías
  (crisis → escalación de emergencia; clínica → derivación profesional; boundary/inyección →
  contención), normalización a acentos/mayúsculas, validador de salida contra afirmaciones
  prohibidas (eficacia, causalidad, longevidad, diagnóstico, prescripción), textos seguros
  fijos versionados y eventos categóricos **sin texto del usuario** (ring buffer 50).
- **Orquestador** (`assistant.ts`): screen → provider → validate → metadatos
  (`screenedInput`, `guardianAction`, `latencyMs`); degradación a proveedor local ante errores.
- **Red teaming** (`src/data/assistant/redteam.json` + `redteam.ts`): 10 ataques
  (inyección, extracción de system prompt, jailbreak/DAN, señuelos clínicos, autoridad falsa,
  crisis) + 4 controles benignos; ejecutable con `npm run eval:security` y en CI.
- **Aislamiento de instrucciones** (`prompts.ts`): system prompt interno con marcador de
  prueba; test verifica que jamás se expone (FR-006).

## Lecciones de la iteración (registradas para el ADR futuro)

1. Next.js 16 prohíbe valores no deterministas en render de Client Components
   (`new Date()`); se resolvió con puerta de monteo vía `useSyncExternalStore`.
2. Vitest 5 en pool `forks`/`threads` falla en runners de GitHub con **Node 20**
   ("reading 'bind'"); se resolvió con Node 24 en CI (raíz real, no el pool).
3. GitHub Projects (GraphQL) tiene rate limit secundario estricto: lotes de mutaciones deben
   ir espaciados y con presupuesto de llamadas (finisher v3 con pausas).
4. `\b` final en regex de clasificación rompe pluriales ("sintomas", "ocupada"); preferir
   prefijos con `|` sin `\b` final o usar `\w*`.

## Reproducir

```bash
npm ci && npm test && npm run eval:security && npm run lint && npm run build
```
