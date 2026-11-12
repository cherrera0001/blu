# Blu Mobile (Expo) — v0.3.1

Shell Expo según ADR-0009, `specs/021-mobile-shell-v1` y endurecimiento `specs/022-mobile-mastg-tdd`.

## Instalar desde GitHub

Cada release `vX.Y.Z` publica un APK en [Releases](https://github.com/cherrera0001/blu/releases):

1. Abre el release **Blu Android**.
2. Descarga `blu-android-X.Y.Z.apk`.
3. Instálalo en el teléfono (origen desconocido permitido).

## Cómo se prueba (estrategia)

### 1. TDD de producto y privacidad (siempre en CI)

```bash
npm run test:mobile:security
```

Cubre: 7 temas / máx 4, persistencia local, borrado, contratos MASVS (sin DOM/fetch en `blu-core`, sin secretos/http claro, `allowBackup=false`).

### 2. Estático OWASP MASTG (herramientas del [catálogo](https://mas.owasp.org/MASTG/tools/))

| Herramienta | ID | Dónde |
|---|---|---|
| semgrep | TOOL-0110 | `security/semgrep-mobile.yml` en release APK |
| aapt2 | TOOL-0124 | `npm run mastg:apk -- archivo.apk` |
| apksigner | TOOL-0123 | idem |
| Maestro | TOOL-0154 | `apps/mobile/maestro/smoke-onboarding.yaml` |
| gitleaks | TOOL-0144 | CI general |

```bash
# tras descargar el APK (con Android SDK en PATH)
npm run mastg:apk -- blu-android-0.3.1.apk
```

### 3. Humo en dispositivo

```bash
adb install -r blu-android-0.3.1.apk
maestro test apps/mobile/maestro/smoke-onboarding.yaml
```

Fase 2 (aún no automatizada en CI): Frida/objection/MobSF solo en laboratorio controlado.

## Comandos de desarrollo

```bash
npm run mobile
npm run test:mobile
```

## Notas de producto

- Local-first: datos en AsyncStorage (`blu.local.v1`), sin cuentas.
- Preview: APK **release** firmado con keystore de debug (embebe JS; sin Metro). No es firma Play Store.
- En v0.4.0+: diseño de marca (Fraunces/Nunito + atmósfera), avatar animado / poses oficiales, historial 7 días, educación por hábito, **Escuchar** (voz natural ElevenLabs vía BFF + respaldo local), chat móvil contra `/api/assistant`.
- Specs formales 025/026 siguen como seguimiento de madurez; la app ya usa el BFF de producción.
