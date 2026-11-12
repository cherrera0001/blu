# ADR-0010 — Recordatorio móvil opt-in (notificación local)

**Estado:** ACEPTADO · **Fecha:** 2026-11-12 · **Decisor:** dueño del producto (firmado 2026-11-12)
**Relacionadas:** BLU-1502 (#68), ADR-0009, `docs/ux/revision-critica-mobile-0.4.md` (ola B)

## Contexto

La web tiene un recordatorio amable (BLU-1502): opt-in, como máximo uno al día, desde las 9:00, y solo si
quedan pasos sin marcar. Funciona únicamente con la pestaña abierta. En el teléfono, un recordatorio así es
la herramienta de «volver mañana» más potente, y también la más peligrosa: puede convertirse en culpa
(«Blu te extraña») o en ruido que lleva a desinstalar.

Hoy la app declara `android.permissions: []` y un contrato MASVS lo verifica. Un recordatorio exige
`POST_NOTIFICATIONS` (Android 13+) y la dependencia nativa `expo-notifications`.

## Opciones

| Opción | Qué implica | Riesgo |
|---|---|---|
| A. No hacer recordatorios en móvil | Sin permisos nuevos | Retención más baja en personas con olvidos frecuentes |
| **B. Notificación local opt-in (propuesta)** | `expo-notifications` **solo local** (sin push ni token), permiso pedido **solo** al activar el interruptor | Superficie nueva acotada; nada sale del teléfono |
| C. Push remoto | Servidor, tokens por dispositivo | Identificador persistente y nuevo encargado de tratamiento: **rechazada** |

## Decisión propuesta: B, con estas reglas

1. **Apagado por defecto.** Se activa en Opciones → «Un recordatorio amable». El permiso del sistema se pide en ese momento, nunca al instalar.
2. **Máximo uno al día**, a la hora que la persona elija (por defecto 10:00). Se cancela el de hoy cuando todos los pasos del día están marcados.
3. **Copy fijo y sin culpa**, revisado por producto: «Blu está por aquí si quieres dar un paso pequeño hoy.» Nunca «te extraña», nunca rachas, nunca cifras.
4. **Sin push remoto ni token de dispositivo**; nada sale del teléfono. Sin analítica de apertura.
5. **Silencio tras ignorar:** si se ignoran 3 días seguidos, Blu pregunta una sola vez en la app si lo quiere mantener.
6. **Contrato MASVS:** `permissions` solo puede contener `POST_NOTIFICATIONS`; el contrato verifica que no exista código de push remoto (`getExpoPushTokenAsync`).
7. Borrar mis datos cancela todos los recordatorios programados.

## Consecuencias

- Nueva dependencia nativa (`expo-notifications`) y un nuevo APK (versionCode +1).
- Hay que actualizar los avisos y `storedSummary` («Recordatorio: activado a las 10:00»).
- No cambia el aviso de consentimiento: el dato (hora elegida) no sale del teléfono.

## Para aceptar

Firma del dueño en este documento (cambiar Estado a ACEPTADO) y validación del copy del punto 3.

## Firma

- **Producto:** ✅ firmado 2026-11-12 (Cristobal Herrera). Acepta la opción B con las reglas 1–7 y el copy del punto 3 tal como está escrito.
