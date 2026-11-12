# ADR-0009 — App móvil v1: Expo + núcleo de dominio compartido

**Estado:** aceptado · **Fecha:** 2026-11-12 · **Decisores:** equipo Blu (constitución IX–X)

## Contexto

Blu existe como prototipo web (Next.js) local-first con BFF de reglas y specs 001–019.
Se requiere **una** aplicación móvil v1, reutilizando la base semántica (hábitos, consentimiento,
onboarding, companion) sin reescribir el producto ni abrir cuentas/sync.

## Opciones evaluadas

| Opción | Descripción | Coste | Riesgo | Alineación |
|---|---|---|---|---|
| A. Expo (React Native) + `packages/blu-core` | App nativa iOS/Android; dominio TS puro compartido con la web | Medio | Bajo si el dominio se extrae primero | IX modular, X YAGNI relativo |
| B. Capacitor sobre la web actual | Envuelve Next en WebView | Bajo | Medio: a11y/senior y lifecycle pobres | Débil para “app mobile” |
| C. Solo perfeccionar PWA | Instalable desde navegador | Mínimo | No cubre stores ni notificaciones nativas reales | Insuficiente para el objetivo |
| D. Dos apps nativas (Swift + Kotlin) | Máximo nativo | Muy alto | Duplicación de dominio | Rechazada (X) |

## Decisión

**Opción A.** Stack móvil v1 = **Expo (TypeScript)**.  
Dominio compartido = **`packages/blu-core`** (puro, sin DOM/React Native).  
La web Next.js sigue viva y consume el mismo núcleo vía reexportaciones.

### Alcance v1 móvil (in scope)
- Onboarding: 7 temas visibles, hasta 4 activos, lenguaje llano.
- Check-in diario, resumen descriptivo, borrado local.
- Persistencia en el dispositivo (AsyncStorage u equivalente), sin cifrado de app en v1 (mismo aviso honesto que web).
- Chat y voz: fases posteriores (025/026), reutilizando BFF existente.

### Fuera de v1 móvil
- Cuentas, sync, RLS (009–012).
- Memoria/RAG (V2).
- Publicación obligatoria en App Store/Play como gate de Done (primero internal/TestFlight).

## Consecuencias

- Positivas: una semántica de producto; TDD del dominio reutilizable; UI mobile diseñada para adultos mayores sin arrastrar CSS web.
- Negativas: monorepo y disciplina de fronteras (nada de `window` en `blu-core`); coste de UI nativa.
- Seguimiento: specs `020-mobile-core-extract` → `021-mobile-shell-v1` → storage/a11y/chat.

## Cumplimiento constitucional

- I evidencia / VII no clínico: sin cambios de copy clínico.
- II privacidad: sigue local-first en dispositivo.
- III TDD: suite Vitest del núcleo debe permanecer verde tras la extracción.
- IX/X: un solo cliente móvil; sin backend nuevo.
