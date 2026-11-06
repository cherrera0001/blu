# Spec de diseño: PWA mínima — uso básico sin conexión (BLU-1503, #69)

**Estado:** implementada (2026-11-05) · **Issue:** #69 · **Fase:** V2 (anticipada: sin gate de privacidad)
**Restricciones:** cero dependencias nuevas; sin push notifications (los recordatorios siguen siendo
locales en app, BLU-1502); sin precache de fronteras externas; `/api/*` NUNCA se cachea
(privacidad: ninguna conversación o respuesta queda en caché); arranque en frío sin red solo
funciona tras al menos una visita online (limitación honesta, documentada).

## Alcance mínimo

1. **Manifest instalable** (`src/app/manifest.ts`, convención Metadata Route de Next 16):
   nombre/idioma es, `display: standalone`, colores de los tokens de diseño, iconos desde la
   ilustración vectorial propia (`/blu-avatar.svg`) declarada para 192 y 512.
2. **Service worker de app shell** (`public/sw.js`, clásico, sin build):
   - `install`: precachea `/`, `/cuestionario`, avatar y manifest. La identidad del navegador
     se declara con `src/app/icon.svg`.
   - `activate`: purga cachés de versiones anteriores.
   - `fetch`: solo GET mismo-origen → cache-first; `/api/*`, cross-origin y no-GET → red directa
     (sin interceptar). Navegaciones fallidas sirven el shell cacheado si existe.
3. **Registro condicionado** (`src/app/register-sw.tsx`): solo en producción y solo si el
   navegador soporta serviceWorker; desactivado en `next dev` para no atorar el desarrollo.
4. **Decisión documentada:** no se activa `experimental.useOffline` (guía instalada revisada):
   cubre detección en caliente con Cache Components, pero el producto es client-side sobre
   localStorage y el SW ya cubre el arranque en frío; se revisita si aparecen datos vivos.

## Criterios de aceptación verificables

- `manifest()` expone name/short_name es, standalone, theme/background de tokens, iconos ≥192.
- La política de caché (módulo puro `src/lib/pwa/sw-policy.ts`) nunca marca `/api/` como
  cacheable y `public/sw.js` se mantiene sincronizado con ella (test de concordancia).
- Registro: en dev o sin soporte no se llama a `navigator.serviceWorker.register`.
- Suite completa, lint, build, eval:security y npm audit en verde.
