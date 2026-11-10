# ADR-0005 — Backend real: chat remoto con proveedor intercambiable (gate acotado levantado)

**Estado:** decidido + implementado · **Fecha:** 2026-11-05
**Relaciona:** PRD §8 (enmienda 2026-11-05) · ADR-0001/0002/0003/0004 · specs/002, 015, 016

## Contexto

El dueño del producto instruyó explícitamente (2026-11-05) construir el backend real de Blu
(API, conversación con IA, maduración del producto), con foco en acompañar a personas adultas
que viven solas. Antes de esta fecha, PRD §8 excluía LLM remoto y especs/015-016 quedaban
diseñadas pero gated. Esta instrucción es la aprobación de producto que levanta el gate de
forma **acotada y registrada**; no lo levanta en su totalidad (ver "Sigue gated").

Copilot propuso "Azure Foundry". Verificación de hoy refuta esa opción como solución gratuita:
Azure AI Foundry / Azure OpenAI **no tienen free tier recurrente** (crédito de $200 válido 30
días en cuentas nuevas; después pago por token). La parte Azure real y gratuita es otra: Speech
TTS F0 (500.000 caracteres/mes), ya integrada como excepción acotada (ADR-0003 enmienda).

## Qué se aprueba hoy (alcance de esta decisión)

- **Chat remoto de texto por turnos** detrás del BFF existente (`/api/assistant`), con el
  orquestador `BluAssistant` y el contrato `AssistantProvider` intactos (sin multiagente).
- **Proveedor intercambiable** vía API OpenAI-compatible (`BLU_LLM_BASE_URL`, `BLU_LLM_API_KEY`,
  `BLU_LLM_MODEL`): sin configuración, el comportamiento es el local actual (reglas
  deterministas); con configuración, el BFF responde con IA generativa.
- **Guardianes invariantes**: clasificador de entrada antes del proveedor (crisis/clínica/
  inyección ⇒ proveedor no invocado), validador de salida (afirmaciones prohibidas ⇒
  reemplazo), degradación automática a local ante fallo del remoto.
- **Sin persistencia conversacional** por defecto: solo viajan el system prompt y los mensajes
  del turno; sin logs de contenido.
- **Límites**: 20 req/min y 200 req/día por IP, texto ≤ 2000 caracteres, máx. 10 mensajes,
  timeout 10 s, máx. 280 tokens de salida.
- **Auth opcional** `BLU_API_TOKEN` (Bearer) para piloto cerrado.
- **Disclosure dinámico honesto** en la UI: el modo real (reglas locales vs. IA remota) se
  comunica según la respuesta efectiva (`meta.providerId`), con `aria-live`.

## Sigue gated (no aprobado hoy)

- Cuentas, identidad y sincronización entre dispositivos (specs/009–013, Supabase): requieren
  EIPD, contrato de tratamiento y aprobación expresa aparte.
- Reconocimiento de voz (STT) en la nube y voz-a-voz continuo (specs/015).
- Memoria conversacional persistente, analítica de terceros, entrenamiento con conversaciones.
- Producción comercial: PRD §8 íntegro (EIPD, contratos, pentest, revisión jurídica/clínica).

## Opciones evaluadas (matriz)

| Opción | Veredicto | Razón |
|---|---|---|
| A. Cloud único: Azure Foundry/OpenAI pagado | Rechazada ahora | Sin free tier recurrente ([sin perpetual free tier](https://pricepertoken.com/endpoints/azure/free), revisado 2026-11-05); requiere billing + aprobaciones de producción. Viable como fase de producción con presupuesto. |
| B. BFF + proveedor intercambiable OpenAI-compatible, activación por env vars | **ADOPTADA** | Mismo contrato; cero cambio sin clave; permite Groq (gratis hoy) y Azure OpenAI (producción) sin tocar código. |
| C. Solo local (reglas) | Rechazada | No cumple la instrucción del dueño: la conversación regresada se agota y no escala como acompañamiento. |
| D. No integrar todavía | Rechazada | El gate documental quedó resuelto por aprobación explícita y acotada. |

## Proveedores verificados (2026-11-05, fuentes citadas)

| Proveedor | ¿Gratis recurrente? | Condiciones de datos | Veredicto para Blu |
|---|---|---|---|
| **GroqCloud** | Sí: free tier sin tarjeta, ~30 RPM / 1.000 req·día / 200k tokens·día según modelo ([límites](https://benchlm.ai/free-tier/groq), [guía](https://localaimaster.com/blog/groq-api-free-guide)) | Privacy Policy (efectiva 12-nov-2025, [fuente](https://groq.com/privacy-policy/)): las Cloud Services se rigen por Groq Services Agreement + DPA (rol de procesador); análisis de términos ([fuente](https://github.com/malda231125/free-llm-gateway)): inputs/outputs no usados para entrenar salvo opt-in explícito. **Verificar vigencia al activar.** | **Candidato para piloto/prototipo sin tarjeta.** Cuota baja ⇒ piloto, no producción. |
| OpenAI API | No ([precios](https://openai.com/api/pricing/), ya citado en ADR-0004) | Controles documentados; retención según endpoint/config | Producción pagada, opción válida |
| Azure OpenAI (Foundry) | No: $200/30 días nuevas cuentas, luego pago ([fuente](https://pricepertoken.com/endpoints/azure/free)) | Estándar empresarial: no entrena con datos de clientes | **Candidato de producción** (con EIPD/contrato/presupuesto) usando el mismo adaptador |
| Google Gemini free | Sí, pero | Contenido usado para mejorar productos + posible revisión humana ([términos](https://ai.google.dev/gemini-api/terms), ADR-0004) | **No apto para datos reales** |
| Azure Speech TTS F0 | Sí: 500k caracteres/mes | Texto elegido sale a Microsoft (ADR-0003) | Ya integrado como excepción TTS, no conversacional |

**Decisión de proveedor**: el código no elige proveedor; el despliegue lo elige con env vars.
Activación sin gasto hoy: GroqCloud (crear API key sin tarjeta en console.groq.com, modelo
`openai/gpt-oss-120b`). Producción futura: Azure OpenAI u OpenAI con aprobaciones PRD §8 íntegro.
Ninguna cuota gratuita se declara suficiente para producción.

## Flujo de datos

```
Navegador (sin claves)
  → POST /api/assistant
      → auth opcional (BLU_API_TOKEN) → validación → rate limit
      → guardián de entrada (crisis/clínica/boundary ⇒ sin llamar proveedor)
      → RemoteLlmProvider (BLU_LLM_*; system prompt REMOTE_SYSTEM_PROMPT v1.0.0;
        mensajes del turno; timeout 10 s; máx 280 tokens)
      → guardián de salida (afirmaciones prohibidas ⇒ reemplazo)
  → 200 { text, meta.providerId: "remote", safety.* }
  → ante fallo del remoto: degradación a LocalRuleProvider (provider_error, providerId "local-rules")
```

## Riesgos y mitigaciones (implementadas)

| Riesgo | Mitigación |
|---|---|
| Datos personales/salud llegan al proveedor | System prompt prohíbe pedirlos; disclosure visible pide no compartirlos; sin persistencia; texto ≤ 2000; se hereda el límite no clínico |
| Abuso de la ruta pública / agotar cuota gratuita | Rate limit 20/min + 200/día por IP; `BLU_API_TOKEN` para piloto cerrado; timeout; sin reintentos |
| Clave de API expuesta | Solo en variables de servidor; jamás `NEXT_PUBLIC_*`; errores mapeados sin detalles del proveedor; contrato público sin nombre de modelo ni clave (test) |
| Salida del modelo con claims prohibidos | `validateOutput` tras el proveedor ⇒ reemplazo + evento (test con proveedor fake) |
| Proveedor caído / 429 | Degradación automática a reglas locales con aviso honesto de modo local (test) |
| Falsa impresión de "memoria" | Máx. 10 mensajes por request, historial recortado en cliente (40), sin persistencia |

## Consecuencias

- Blu deja de ser mockup conversacional: con tres variables de entorno responde con IA real;
  sin ellas, comportamiento idéntico al aprobado anteriormente.
- specs/016 pasa a implementada (ajuste: auth por token en piloto; sesiones quedan para la
  fase de cuentas). specs/015 queda parcialmente desbloqueada (chat remoto sí; STT/voz-a-voz no).
- PRD §8 se enmienda (2026-11-05) registrando esta aprobación acotada.
- La activación con Groq free es para piloto controlado: verificar términos vigentes, fijar
  `BLU_API_TOKEN` en el despliegue y no prometer disponibilidad productiva.
