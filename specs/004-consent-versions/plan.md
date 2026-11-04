# Implementation Plan: Consentimiento versionado (BLU-102)

**Branch**: `004-consent-versions` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

## Summary

Dominio de consentimiento con propósitos separados y versión semántica (`src/lib/consent.ts`),
integración en el estado local (`blu.local.v1` gana `consent`, con migración legacy), UI de
onboarding con tres propósitos y renovación de aviso, y retiro desde el dashboard. Sin
dependencias nuevas; sin red.

## Technical Context

TypeScript/Next 16 · Vitest + Testing Library · `localStorage` con verificación · reglas
deterministas; `new Date()` solo en handlers.

## Constitution Check

I–X cumplidas: privacidad por diseño (II), TDD (III), control humano (V), trazabilidad de
versiones (VI), sin afirmaciones médicas (VII, textos neutros), simplicidad (X). Sin violaciones.

## Project Structure

```text
specs/004-consent-versions/{spec,plan,tasks}.md
src/lib/consent.ts            # dominio: versiones, propósitos, migración
src/lib/consent.test.ts       # dominio + integración con decodeState
src/lib/blu.ts                # BluState.consent + decode/encode back-compat
src/app/BluApp.tsx            # onboarding de propósitos + renovación + retiro
src/app/BluApp.test.tsx       # flujos de componente
```

## Complexity Tracking

No aplica.
