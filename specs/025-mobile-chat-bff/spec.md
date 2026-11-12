# Feature Specification: Chat móvil contra el BFF

**Feature Branch**: `025-mobile-chat-bff`

**Created**: 2026-11-12

**Status**: Implemented (v0.4.3 — documentación retroactiva + aviso en contexto)

**Input**: La app móvil conversa con Blu reutilizando el BFF de producción (`/api/assistant`, specs/016), sin lógica de asistente ni secretos en el dispositivo.

**Relacionadas**: specs/016 (contrato BFF), specs/021 (shell móvil, FR-004), ADR-0009, BLU-1006 (#81).

## User Scenarios & Testing

### User Story 1 - Preguntar a Blu desde el teléfono (Priority: P1)

**Acceptance Scenarios**:

1. **Given** la pantalla Hoy, **When** la persona abre «Hablar con Blu», **Then** ve un saludo que aclara que Blu no es un servicio médico y el aviso de privacidad del chat.
2. **Given** un mensaje escrito, **When** pulsa Enviar, **Then** se envían como máximo los 8 últimos turnos (≤2000 caracteres cada uno) a `${BLU_API_BASE}/api/assistant` y se muestra la respuesta.
3. **Given** red caída o error del BFF, **When** envía, **Then** ve un mensaje llano de reintento; no se pierde la conversación en pantalla.

### User Story 2 - Saber qué sale del teléfono (Priority: P1)

1. **Given** la pantalla de chat, **Then** un aviso visible (`chat-privacy-notice`) indica que los mensajes viajan al servidor de Blu solo para responder, no se guardan y conviene no escribir datos personales.

## Requirements

- **FR-001**: Red exclusivamente vía `httpJson` (XMLHttpRequest) hacia `BLU_API_BASE` https; prohibido `fetch` directo (Hermes/SharedArrayBuffer).
- **FR-002**: La conversación vive solo en memoria de la pantalla; nada se persiste en AsyncStorage (memoria opt-in sigue gated en BLU-1003).
- **FR-003**: Guardián de entrada/salida, rate limit y selección de proveedor ocurren en el BFF (specs/016); el cliente no decide seguridad.
- **FR-005**: Cada respuesta indica su origen según `meta.providerId` del BFF (`remote` → modelo de lenguaje; `local-rules` → reglas sencillas); origen desconocido no se etiqueta.
- **FR-004**: Sin credenciales en el binario. `BLU_API_TOKEN` del BFF no se usa desde móvil (endpoint público con rate limit).

## Success Criteria

- **SC-001**: `security.contract.test.ts` verifica FR-001 y el aviso de US-2.
- **SC-002**: Ningún texto conversacional en logs del cliente.

## Pendiente / riesgos

- Atestación de app o token por instalación si el abuso del endpoint público lo exige.
