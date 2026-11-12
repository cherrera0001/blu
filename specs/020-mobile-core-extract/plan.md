# Plan — 020 mobile-core-extract

**Spec**: `specs/020-mobile-core-extract/spec.md` · **ADR**: 0009

## Approach

1. Crear workspace npm `packages/blu-core`.
2. Mover módulos puros + JSON de contenido.
3. Dejar fachadas en `src/lib` para no romper la web.
4. Verificar TDD (Vitest) + build Next.
5. Dejar listo el gancho para `apps/mobile` (021).

## Out of scope

UI Expo, AsyncStorage, chat móvil, stores.

## Risks

| Riesgo | Mitigación |
|---|---|
| Paths `@/data` rotos | Datos dentro del paquete; imports relativos |
| Next no resuelve el paquete | `paths` + dependency workspace |
| Filtrar mal un módulo con DOM | Lista blanca de módulos puros ya auditada |
