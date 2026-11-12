# Blu Mobile (Expo) — v1

**Estado:** scaffold tras ADR-0009 y spec `020` (núcleo) / `021` (shell).

## Decisiones

- Stack: Expo + TypeScript.
- Dominio: paquete `blu-core` (`packages/blu-core`), sin DOM.
- v1: onboarding (7 temas / máx 4), check-in, resumen, borrado. Sin cuentas.
- Chat/voz: specs posteriores.

## Próximo paso (021)

```bash
# desde la raíz del monorepo
cd apps/mobile
npx create-expo-app@latest . --template blank-typescript
```

Luego conectar `blu-core` como dependencia workspace e implementar pantallas según `specs/021-mobile-shell-v1/spec.md`.
