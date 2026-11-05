# Feature Specification: Lectura en voz alta local (BLU-1005) — specs/014

**Branch**: `014-voice-read-aloud` · **Created**: 2026-11-04 · **Status**: Implemented

**Input**: "Leer en voz alta las respuestas del asistente con una voz local verificable,
sin persistencia, con texto como vía completa."

## Alcance autorizado

La función solo ofrece voces en español cuyo `SpeechSynthesisVoice.localService` sea
explícitamente `true`; rechaza voces remotas (`false`) y no clasificadas (`undefined`).
La propiedad distingue una voz provista por un sintetizador local de una provista por un
servicio remoto según Web Speech API. No es una inspección independiente del tráfico de red:
Blu no inicia solicitudes ni guarda el contenido, pero no promete controlar telemetría o
procesamiento fuera de su código en el navegador o sistema operativo. ADR-0003 la aprueba
dentro del gate (no es reconocimiento de voz ni chat remoto). El reconocimiento queda
explícitamente fuera (specs/015).

## User Story 1 - Escuchar la respuesta (P1)

Cada burbuja del asistente ofrece «Escuchar»: reproduce la respuesta ya validada por el
guardián con una voz local del sistema en español; alternar detiene. Sin voz local apta ⇒ sin
botón y el texto sigue siendo la experiencia completa.

**Acceptance Scenarios**:

1. Given una voz `es-*` con `localService=true`, when pulso «Escuchar», then se habla la
   respuesta con esa voz.
2. Given reproduciendo, when pulso «Detener», then se cancela.
3. Given solo voces remotas, no clasificadas o sin español, then no hay botón.
4. Given que el navegador aún no cargó sus voces, when emite `voiceschanged` con una voz
   local en español, then aparece el botón.
5. Given un navegador sin soporte o sin voz local en español, then no hay botón y todo lo
   demás funciona igual.
6. Given una respuesta en reproducción, when inicio la lectura de otra, then se detiene la
   anterior y solo el nuevo control queda activo.

## Requirements

- **FR-001**: Solo respuestas que ya pasaron el guardián pueden leerse (la fuente es el texto mostrado).
- **FR-002**: La función no realiza solicitudes de red ni persiste o telemetría el contenido.
  Esta garantía cubre el código de Blu, no comportamientos externos del navegador o SO.
- **FR-003**: Solo usar voz `es-*` con `localService === true`; nunca usar fallback a una voz
  remota o no clasificada. Cancelar antes de cada reproducción.
- **FR-004**: Texto siempre visible y completo: la voz es complemento, nunca requisito.
- **FR-005**: Ciclo de vida: cancelar al desmontar.
- **FR-006**: Si la lista de voces está inicialmente vacía, actualizar disponibilidad al
  recibir `voiceschanged`.
- **FR-007**: Mantener como máximo una lectura activa entre burbujas; al iniciar otra,
  detener la anterior y restablecer su control.

## Success Criteria

- SC-001: 9 pruebas del componente y 1 de integración en BluApp verdes, cubriendo selección
  local, rechazo remoto/no español, carga asíncrona, reproducción, cancelación, exclusión
  mutua entre respuestas y fallback.
- SC-002: suite completa, lint, build y eval:security pasan.
- SC-003: el código de la función no ejecuta llamadas de red; la voz usada se selecciona
  por `localService === true`, sin afirmar una inspección de red del navegador/SO.

## Plan (resumen)

`SpeakButton` con `useSyncExternalStore` para observar disponibilidad de voces locales y el
evento `voiceschanged`; pruebas con `speechSynthesis` fake. Integración en burbujas `role="blu"`
del chat existente.

## Tasks

- [x] T001 Tests primero (3 casos) con fake de síntesis
- [x] T002 Implementar SpeakButton (detección, voz es, toggle, cancel)
- [x] T003 Integrar en burbujas del asistente + estilos
- [x] T004 Validar implementación: 7 pruebas del componente + 1 de integración, suite
  completa, lint, build y eval:security (evidencia en la ejecución del ciclo 2026-11-05)
