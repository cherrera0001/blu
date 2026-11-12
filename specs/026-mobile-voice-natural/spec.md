# Feature Specification: Voz natural en móvil (Escuchar)

**Feature Branch**: `026-mobile-voice-natural`

**Created**: 2026-11-12

**Status**: Implemented (v0.4.3 — documentación retroactiva + aviso en contexto)

**Input**: Botón «Escuchar» con voz natural (ElevenLabs vía BFF `/api/voice`) y respaldo local `expo-speech`.

**Relacionadas**: specs/014 (read-aloud, área autorizada), specs/015 (entrada por voz — sigue GATED, BLU-1007 #82), specs/021.

## User Scenarios & Testing

### User Story 1 - Oír el resumen de hoy o una respuesta (Priority: P1)

1. **Given** voz natural disponible, **When** pulsa Escuchar, **Then** el texto (≤500 caracteres) se envía a `/api/voice`, el MP3 se cachea en `cacheDirectory` y se reproduce.
2. **Given** fallo de red o del BFF, **When** pulsa Escuchar, **Then** cae a la voz local del teléfono sin error visible para la persona.
3. **Given** audio sonando, **When** pulsa Detener o sale de la pantalla, **Then** se detiene y libera el sonido.

### User Story 2 - Transparencia (Priority: P1)

1. **Given** voz natural activa y sin reproducir, **Then** la pista indica que el texto se envía al servidor de Blu y no se guarda.

## Requirements

- **FR-001**: Solo salida de voz. Sin permiso de micrófono (`expo-av` con `microphonePermission: false`; `android.permissions: []`).
- **FR-002**: Red solo vía `httpJson`; mismo contrato que specs/025 FR-001.
- **FR-004**: `blu-voice.mp3` se borra de caché al terminar, detener o fallar la reproducción.
- **FR-005**: Opciones → «Usar solo la voz del teléfono» (`BluState.voicePreference = "device"`, misma clave local, se borra con «Borrar mis datos»). Activo: ninguna llamada a `/api/voice`.
- **FR-003**: El texto enviado puede incluir títulos de hábitos elegidos (resumen de Hoy): por eso el aviso de US-2 es obligatorio.

## Success Criteria

- **SC-001**: `security.contract.test.ts` verifica FR-001, FR-002 y el aviso.

## Pendiente / riesgos

