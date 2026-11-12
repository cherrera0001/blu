# Blu Mobile (Expo) — v0.3.0

Shell Expo según ADR-0009 y `specs/021-mobile-shell-v1`.

## Instalar desde GitHub

Cada release `vX.Y.Z` publica un APK en [Releases](https://github.com/cherrera0001/blu/releases):

1. Abre el release **Blu Android**.
2. Descarga `blu-android-X.Y.Z.apk`.
3. Instálalo en el teléfono (origen desconocido permitido).

Workflow: `.github/workflows/mobile-apk.yml` (tag `v*` o disparo manual).

## Qué incluye

- Dominio solo vía `blu-core`.
- Onboarding: 7 temas, máximo 4, aviso de almacenamiento local.
- Hoy: check-in, resumen 7 días, cambiar temas, borrar datos.
- Persistencia AsyncStorage (`blu.local.v1`), sin cuentas.

## Comandos

```bash
npm run mobile          # expo start
npm run test:mobile     # vitest del shell
```

En `apps/mobile`:

```bash
npm start
npm test
npx expo prebuild --platform android   # genera android/ (CI lo hace)
```

## Notas

- Chat/voz: specs 025/026.
- JSON canónicos en `packages/blu-core/data` → `npm run sync:data` para la web.
- El APK de GitHub es **preview** (firma debug), pensado para sideload.
