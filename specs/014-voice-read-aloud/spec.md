# Feature Specification: Lectura en voz alta (BLU-1005) — specs/014

**Branch**: `014-voice-read-aloud` · **Created**: 2026-11-04 · **Status**: Local implemented; optional Azure TTS integrated, disabled until configured and approved (2026-11-05)

**Input**: "Leer en voz alta las respuestas del asistente con una voz local verificable,
sin persistencia, con texto como vía completa."

## Alcance autorizado

El modo predeterminado es local: solo ofrece voces en español cuyo
`SpeechSynthesisVoice.localService` sea explícitamente `true`; rechaza voces remotas (`false`)
y no clasificadas (`undefined`). Esa propiedad refleja la clasificación del navegador y no
verifica por sí sola el tráfico externo del sistema operativo.

Como excepción acotada del MVP, existe una opción opcional de síntesis neuronal Azure TTS.
Está desactivada si faltan las variables de servidor, la confirmación del nivel F0 o la
bandera de habilitación. La persona debe activarla de forma explícita; solo al pulsar
«Escuchar» para una respuesta de Blu se envía ese texto a Microsoft. El chat no se vuelve
generativo, el texto no se persiste ni se registra por Blu y la voz local sigue disponible.
La clave nunca sale del backend. Región, locale y voz son variables server-side; el backend
valida que la voz española coincida con el locale. Antes de activar la ruta en un despliegue
deben cumplirse las condiciones de privacidad/proveedor de PRD §8 y verificarse que el recurso
Azure sea realmente F0. No se incluye reconocimiento de voz (specs/015).

## User Story 1 - Escuchar la respuesta (P1)

Cada burbuja del asistente ofrece «Escuchar»: reproduce la respuesta ya validada por el
guardián con una voz local del sistema en español; alternar detiene. Sin voz local apta ⇒ sin
botón y el texto sigue siendo la experiencia completa.

En modo Azure, locale y voz se configuran en el servidor (por ejemplo, `es-CL` y
`es-CL-CatalinaNeural`); se rechazan voces incompatibles con el locale elegido. En modo local,
la persona puede elegir entre dos ajustes de prosodia: **Cálida** (ritmo 0.94,
tono 1.05) y **Equilibrada** (ritmo 0.98, tono 1.0). Cálida es el valor inicial. No garantizan
una voz femenina ni un timbre idéntico entre dispositivos. Se prefiere el idioma del navegador,
luego es-CL, español latinoamericano y finalmente otra voz española local disponible.

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
7. Given que hay voces locales aptas, when cambio el estilo de voz, then la próxima lectura
   usa el ritmo y tono del estilo elegido, sin cambiar el texto.
8. Given varias voces locales en español, when se selecciona una, then Blu prefiere el idioma
   configurado por la persona y después la voz chilena/latinoamericana cuando está disponible.
9. Given Azure no está habilitado y confirmado como F0 en el servidor, when se consulta la
   disponibilidad, then no se expone el modo nube y la síntesis local sigue disponible.
10. Given la persona activa Azure tras ver el aviso, when pulsa «Escuchar» en una respuesta
    de Blu, then solo el texto de esa respuesta se envía al BFF; las respuestas no se envían
    automáticamente ni se guarda el texto.
11. Given Azure falla o alcanza su cuota, when Blu no recibe audio válido, then muestra un
    error claro y conserva el texto; no cambia de proveedor silenciosamente.

## Requirements

- **FR-001**: Solo respuestas que ya pasaron el guardián pueden leerse (la fuente es el texto mostrado).
- **FR-002**: El modo local no inicia solicitudes de red ni persiste el contenido. El modo
  Azure, solo con activación explícita, envía al BFF el texto seleccionado para generar audio;
  Blu no guarda ni registra texto o audio.
- **FR-003**: Solo usar voz `es-*` con `localService === true`; nunca usar fallback a una voz
  remota o no clasificada en el modo local. Cancelar antes de cada reproducción.
- **FR-004**: Texto siempre visible y completo: la voz es complemento, nunca requisito.
- **FR-005**: Ciclo de vida: cancelar al desmontar.
- **FR-006**: Si la lista de voces está inicialmente vacía, actualizar disponibilidad al
  recibir `voiceschanged`.
- **FR-007**: Mantener como máximo una lectura activa entre burbujas; al iniciar otra,
  detener la anterior y restablecer su control.
- **FR-008**: Ofrecer estilos Cálida y Equilibrada con valores explícitos de `rate` y `pitch`;
  el estilo no afirma ni infiere género, y la selección no se persiste.
- **FR-009**: Priorizar coincidencia exacta con `navigator.language`, después es-CL, español
  latinoamericano y por último otra voz local española; nunca debilitar el filtro local.
- **FR-010**: Solo habilitar Azure si `AZURE_SPEECH_ENABLED=true`,
  `AZURE_SPEECH_F0_CONFIRMED=true`, y la clave, región, locale y voz existen y son válidos en
  el servidor; nunca exponer la clave al cliente. La bandera F0 es autodeclarada, no verificada
  por código.
- **FR-011**: Limitar texto a 500 caracteres y el cuerpo a 2 KiB; usar timeout, rate limit,
  respuesta `no-store`, errores sin detalles del proveedor y sin logs de contenido.
- **FR-012**: Comunicar el envío a Microsoft antes de activar la voz nube; activación y
  selección de respuesta son acciones de sesión, no se persisten.

## Success Criteria

- SC-001: pruebas del componente y de integración en BluApp verdes, cubriendo selección
  local/regional, perfiles de prosodia, rechazo remoto/no español, carga asíncrona,
  reproducción, cancelación, exclusión mutua entre respuestas y fallback.
- SC-002: suite completa, lint, build y eval:security pasan.
- SC-003: el modo local no ejecuta llamadas de red; Azure solo recibe texto tras activación
  explícita y un clic por respuesta; las claves no aparecen en respuestas, logs ni bundle.

## Plan (resumen)

`SpeakButton` con `useSyncExternalStore` para observar disponibilidad de voces locales y el
evento `voiceschanged`; pruebas con `speechSynthesis` fake. El modo Azure usa
`POST /api/voice`, que verifica su configuración en servidor y devuelve MP3 sin caché; el
cliente crea y revoca una URL temporal. Integración en burbujas `role="blu"` del chat.

## Tasks

- [x] T001 Tests primero (3 casos) con fake de síntesis
- [x] T002 Implementar SpeakButton (detección, voz es, toggle, cancel)
- [x] T003 Integrar en burbujas del asistente + estilos
- [x] T004 Validar implementación: 7 pruebas del componente + 1 de integración, suite
  completa, lint, build y eval:security (evidencia en la ejecución del ciclo 2026-11-05)
- [x] T005 Añadir perfiles locales de prosodia y preferencia regional, con pruebas; no
  solicitar ni instalar voces remotas.
- [x] T006 Añadir ruta Azure TTS opcional, activación informada, límites y pruebas; no
  habilitarla en despliegue sin verificar F0 y las aprobaciones de PRD §8.
