# ADR-0003 — Chat y voz: decisión de integración bajo gate de privacidad y costo cero

**Estado:** decidido (alcance MVP) + gated (cloud) · **Fecha:** 2026-11-04
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

Conclusión de investigación: **ninguna opción cloud gratuita cumple los requisitos para
conversaciones reales de bienestar**; no se fuerza la selección de un proveedor gratuito.

## Opciones evaluadas

- **A. Cloud único proveedor** — rechazada ahora (evidencia arriba); viable solo pagada y aprobada.
- **B. Pipeline modular STT→guardián→LLM→guardián→texto→TTS** — **diseñada** (specs/015) para
  post-aprobación; no se implementa (gate).
- **C. MVP sin gasto**: conversación local existente + síntesis de voz del dispositivo — **ADOPTADA**.
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

## Flujo de datos (C)

```
respuesta validada por guardián → selección de voz `localService=true` →
SpeechSynthesisUtterance → sintetizador declarado local por el navegador
(Blu no selecciona servicios remotos; cancelación y fallback de texto siempre disponibles)
```

## Riesgos y condiciones

- Riesgo: síntesis con voz del sistema puede sonar robótica ⇒ aceptado (experimental, opt-in por clic).
- Riesgo residual: Blu confía en el valor `localService` que reporta el navegador; no realiza
  inspección independiente de tráfico ni controla instrumentación del navegador/SO.
- Condición para cloud: aprobaciones PRD §8 + EIPD + contrato de tratamiento + presupuesto
  aprobado + pentest de la ruta (THREAT_MODEL anexo V1).

## Consecuencias

- Positivas: accesibilidad mejorada sin cruzar el gate; contrato AssistantProvider intacto.
- Límites: no hay conversación generativa ni entrada por voz hasta aprobaciones; specs listas.
