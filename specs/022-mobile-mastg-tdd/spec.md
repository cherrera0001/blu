# Feature Specification: TDD móvil alineado a OWASP MASTG

**Feature Branch**: `022-mobile-mastg-tdd`

**Created**: 2026-11-12

**Status**: Implemented (base)

**Input**: Endurecer Blu Android con pruebas automatizadas inspiradas en [MASTG Tools](https://mas.owasp.org/MASTG/tools/), sin convertir el ciclo en pentest ofensivo.

**ADR**: `docs/adr/0009-app-mobile-expo-core.md`

## Contexto de producto

Blu móvil v1 es **local-first**, lenguaje llano, sin cuentas ni chat. El riesgo dominante no es RCE remota: es **filtración de datos locales**, permisos innecesarios, cleartext, backup a la nube y secretos embebidos.

## Mapa MASTG → Blu (herramientas usadas)

| ID MASTG | Herramienta | Uso en Blu |
|---|---|---|
| TOOL-0110 | semgrep | Reglas estáticas sobre `apps/mobile` + `blu-core` |
| TOOL-0123 | apksigner | Verificar firma del APK en CI |
| TOOL-0124 | aapt2 | Inspeccionar package, versionCode, permisos |
| TOOL-0006 | Android SDK | Prebuild + assemble en `mobile-apk.yml` |
| TOOL-0144 | gitleaks | Ya en CI web; se mantiene |
| TOOL-0154 | Maestro | Flujos de humo documentados (dispositivo) |

Fuera de alcance ahora (requieren dispositivo rooteado / MITM): Frida, objection, Burp, drozer. Quedan listados como fase 2 en `tasks.md`.

## User Scenarios & Testing

### US1 — Privacidad local (P1)

**Given** el código móvil y `blu-core`, **When** corre la suite `test:mobile:security`, **Then** no hay clientes de red en el dominio ni claves hardcodeadas, y el storage solo usa la clave `blu.local.v1`.

### US2 — Manifest endurecido (P1)

**Given** un APK construido, **When** `aapt2 dump badging` / chequeos de config, **Then** `allowBackup=false`, sin cleartext permitido por configuración de producto, package `cl.blu.app`.

### US3 — Flujo usable senior (P1)

**Given** instalación limpia, **When** onboarding → hoy → borrar, **Then** 7 temas / máx 4, check-in persistente, borrado vuelve al inicio (cubierto por Vitest + Maestro smoke).

## Requirements

- **FR-001**: Spec + suite Vitest de contratos de seguridad/privacidad.
- **FR-002**: Semgrep ruleset móvil en repo.
- **FR-003**: Job CI post-APK con apksigner + aapt2 + script de asserts.
- **FR-004**: Hardening `app.json` (backup off, cleartext off).
- **FR-005**: Mejoras UX: ErrorBoundary, targets táctiles ≥48, copy de privacidad explícito.

## Success Criteria

- **SC-001**: `npm run test:mobile:security` verde.
- **SC-002**: Release ≥0.3.1 con asserts MASTG en el workflow de APK.
- **SC-003**: Documentación de cómo probar en dispositivo (adb/Maestro) en README móvil.
