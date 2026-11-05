# ADR-0003 — Chat y voz: decisión de integración bajo gate de privacidad y costo cero

**Estado:** decidido; chat remoto gated; TTS Azure opcional y desactivado por defecto · **Fecha:** 2026-11-04 (enmienda 2026-11-05)
**Relaciona:** PRD §8 (excluye LLM/voz externos) · ADR-0001/0002 · specs/002, 014, 015

## Contexto

Blu quiere evolucionar de la conversación local determinista a chat generativo y voz. Gates
vigentes: PRD §8 (aprobaciones de privacidad, seguridad, retención, contratos, ciencia, ética,
jurídico) y el requisito presupuestario de **cero gasto** (sin billing, sin cargos posibles).
Investigación verificada en fuentes oficiales (2026-11-04):

| Alternativa | Gratis recurrente apto para datos reales | Evidencia |
|---|---|---|
| Gemini API free tier | **No**: los servicios no pagados usan contenido para mejorar productos y pueden ser revisados por humanos; se prohíben datos sensibles | [Términos Gemini API](https://ai.google.dev/gemini-api/terms), [síntesis](https://redact.dev/blog/gemini-api-terms-2025), [Apidog 2026](https://apidog.com/blog/gemini-api-free-tier/) |
| OpenAI | **No**: API por uso; sin cuota gratuita recurrente | [Precios OpenAI](https://openai.com/api/pricing/) |
| AWS (Bedrock/Transcribe/Polly) | **No**: créditos temporales, no tarifa recurrente | [AWS Free Tier](https://aws.amazon.com/free/) |
| NVIDIA endpoints | **No verificable**: sin cuota pública recurrente clara para chat+voz | — |
| Vercel Hobby | No es crédito de IA; uso personal no comercial | [Planes Vercel](https://vercel.com/pricing) |
| Azure Speech TTS F0 | **Sí, cuota gratuita de hasta 500.000 caracteres/mes** según la tabla vigente; es solo síntesis de voz, no incluye chat generativo. Requiere recurso, clave y región de Speech. | [Precios oficiales de Azure Speech](https://azure.microsoft.com/en-us/pricing/details/speech/) · [REST TTS](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech) |

Conclusión: **no se identificó un proveedor gratuito para chat generativo**. Azure sí ofrece
una cuota F0 para TTS; se autoriza únicamente como síntesis opcional y acotada, no como
proveedor conversacional. La cuota y disponibilidad pueden cambiar; verificar antes de crear
o habilitar el recurso.

## Opciones evaluadas

- **A. Cloud único proveedor** — rechazada ahora (evidencia arriba); viable solo pagada y aprobada.
- **B. Pipeline modular STT→guardián→LLM→guardián→texto→TTS** — **diseñada** (specs/015) para
  post-aprobación; no se implementa (gate).
- **C. MVP**: conversación local existente + voz local por defecto; opción Azure TTS F0,
  explícita y desactivada hasta configurar y aprobar su habilitación — **ADOPTADA**.
- **D. No integrar nada** — superada por C: la síntesis local de salida es segura y mejora
  accesibilidad sin frontera de datos nueva.

## Decisión

1. **Ahora (implementado)**: lectura en voz alta de las respuestas del asistente con
   `speechSynthesis` (specs/014), ofreciendo exclusivamente voces en español con
   `localService === true`. Blu no selecciona voces que el navegador clasifica como remotas
   o que no clasifica; tampoco inicia solicitudes de red ni persiste el contenido. Esta
   propiedad no es una inspección independiente del tráfico ni permite prometer que el
   navegador/SO no tenga comportamientos externos. El texto sigue siendo la vía completa.
   El reconocimiento de voz queda **fuera**: en varios navegadores usa servicios remotos;
   solo se habilitaría con `processLocally` comprobable (specs/015, gated).
2. **Cloud post-aprobación**: ruta de servidor con proveedor sustituible, guardianes intactos,
   límites y presupuesto duro (specs/015). El gate PRD §8 sigue bloqueándola.
3. Gemini free queda, como mucho, para pruebas con **datos sintéticos**, nunca piloto real.
4. **Enmienda acotada (2026-11-05):** a solicitud explícita del usuario se integra Azure Neural
   TTS F0 solo para convertir una respuesta de Blu elegida por la persona en audio. Activación
   por sesión + clic «Escuchar»; nada se envía al activar o al conversar. El texto se procesa
   en Microsoft y esta integración no hereda la garantía local del modo dispositivo. Clave solo
   en servidor; no hay almacenamiento ni logs de texto/audio; el modo local permanece disponible.
   Ruta y UI quedan desactivadas salvo `AZURE_SPEECH_ENABLED=true`,
   `AZURE_SPEECH_F0_CONFIRMED=true`, clave, región, locale y voz válidas en variables de
   servidor. La bandera no verifica por sí misma el nivel del recurso: confirmar F0 en Azure y completar revisión de privacidad y
   proveedor antes de habilitar en despliegue. Esta excepción no aprueba chat remoto, STT ni
   uso de respuestas con información personal/de salud.

## Flujo de datos (C)

```
respuesta validada por guardián → selección de voz `localService=true` →
SpeechSynthesisUtterance → sintetizador declarado local por el navegador
(Blu no selecciona servicios remotos; cancelación y fallback de texto siempre disponibles)
```

## Riesgos y condiciones

- Riesgo: síntesis con voz del sistema puede sonar robótica ⇒ aceptado (experimental, opt-in por clic).
- Mitigación UX: el lector puede elegir perfil Cálida o Equilibrada y Blu prioriza el idioma
  local/regional disponible. Los parámetros de prosodia pueden ser ignorados por el dispositivo;
  no se promete voz femenina ni calidad uniforme.
- Riesgo residual: Blu confía en el valor `localService` que reporta el navegador; no realiza
  inspección independiente de tráfico ni controla instrumentación del navegador/SO.
- Riesgo Azure: el texto de Blu elegido para síntesis sale del dispositivo hacia Microsoft;
  no se debe usar con información personal/de salud. TTS puede fallar o alcanzar cuota; se
  informa claramente sin fallback silencioso.
- Condición para chat remoto: aprobaciones PRD §8 + EIPD + contrato de tratamiento +
  presupuesto aprobado + pentest de la ruta (THREAT_MODEL anexo V1).
- Condición para habilitar Azure TTS en un despliegue: confirmar recurso F0 y cuota vigente,
  aprobar revisión de privacidad/proveedor, configurar secreto y región solo en servidor y
  fijar ambas banderas de habilitación. Sin   configuración, no se presenta la opción nube. La región, el locale (`es-CL`) y el
  identificador de voz (`es-CL-CatalinaNeural`) son configurables por entorno; la voz y el
  locale deben corresponder. El hostname y la ruta REST Azure son parte fija del adaptador,
  no parámetros recibidos del cliente.

## Consecuencias

- Positivas: accesibilidad local y una alternativa neuronal opcional para comparar naturalidad,
  con clave en servidor y sin cambiar el contrato AssistantProvider.
- Límites: no hay conversación generativa ni entrada por voz hasta aprobaciones; specs listas.
