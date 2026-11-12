# Blu Mobile (Expo) — v1

Shell Expo según ADR-0009 y `specs/021-mobile-shell-v1`.

## Qué incluye

- Dominio solo vía `blu-core` (sin lógica de producto en pantallas).
- Onboarding: 7 temas, máximo 4, aviso de almacenamiento local.
- Hoy: check-in diario, resumen de 7 días, cambiar temas, borrar datos.
- Persistencia: AsyncStorage (`blu.local.v1`), sin cuentas.

## Comandos

Desde la raíz del monorepo (tras `npm install`):

```bash
npm run mobile          # expo start
npm run test:mobile     # vitest del shell (selección + storage)
```

O en este directorio:

```bash
npm start
npm test
```

## Notas

- Chat/voz: fuera de v1 (specs 025/026).
- Los JSON canónicos viven en `packages/blu-core/data`. La web los sincroniza con `npm run sync:data` (copias reales; no symlinks en WSL).
