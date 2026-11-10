# Blu

Blu es un prototipo de acompañamiento para crear hábitos cotidianos de bienestar. Su enfoque es la calidad de vida, la autonomía y los cambios pequeños; no promete longevidad ni ofrece atención clínica.

## Estado

**Prototipo — no validado clínicamente ni como intervención conductual.** No usar para diagnóstico, tratamiento ni decisiones sanitarias. El chat usa respuestas deterministas del BFF de Blu, no un modelo generativo, y la aplicación no persiste el historial. Preferencias y check-ins se guardan en el navegador. La voz neuronal de Azure es opcional, está desactivada por defecto y envía a Microsoft únicamente la respuesta elegida al activar la opción y pulsar «Escuchar».

## Ejecutar localmente

Requiere Node.js 20.9 o posterior.

```powershell
npm install
npm run dev
```

Abrir http://localhost:3000. Los datos no se sincronizan entre navegadores ni dispositivos. Usa «Borrar mis datos» en la aplicación para eliminarlos del almacenamiento local.

## Validar

```powershell
npm test
npm run lint
npm run build
```

## Voz natural opcional (Azure Speech F0)

La voz local sigue siendo la predeterminada. Para probar Azure TTS, crea un recurso Speech en
nivel **F0 (Free)** y verifica el nivel y la cuota en Azure antes de configurarlo. La página
oficial publica una cuota de hasta 500.000 caracteres al mes para Neural TTS; las cuotas y
condiciones pueden cambiar. F0 es un nivel fijo del recurso, no una garantía de que una
configuración distinta no genere cargos.

Configura estas variables **solo en el servidor** (por ejemplo, variables de entorno de
desarrollo en `.env.local`, ignorado por Git, o variables server-side de Vercel):

```text
AZURE_SPEECH_KEY=<clave del recurso Speech>
AZURE_SPEECH_REGION=<región del recurso>
AZURE_SPEECH_LOCALE=es-CL
AZURE_SPEECH_VOICE=es-CL-CatalinaNeural
AZURE_SPEECH_F0_CONFIRMED=true
AZURE_SPEECH_ENABLED=true
```

`AZURE_SPEECH_ENABLED` debe permanecer desactivada hasta completar la revisión de privacidad y
proveedor indicada en PRD §8. Nunca uses un prefijo `NEXT_PUBLIC_` para la clave. Para volver al
modo local, quita las variables o cambia `AZURE_SPEECH_ENABLED` a `false`. Sin configuración
válida, Blu oculta la opción y conserva la voz del dispositivo. La selección de Azure no se
persiste; la persona ve el aviso antes de activarla y cada audio requiere pulsar «Escuchar».
La región, el locale y el identificador de voz se leen de variables server-side; la voz debe
ser compatible con el locale español configurado. La verificación de disponibilidad solo
confirma que esas variables están presentes y son válidas; no autentica contra Azure ni verifica
el nivel real del recurso. `AZURE_SPEECH_F0_CONFIRMED` es una confirmación manual, no un control
técnico de plan o facturación. No introduzcas valores reales de clave en el repositorio.

Fuentes: [precios de Azure Speech](https://azure.microsoft.com/en-us/pricing/details/speech/)
y [REST API de texto a voz](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech).

## Chat con IA real (opcional, ADR-0005)

Por defecto Blu responde con reglas deterministas. Para activar el modo remoto con IA
generativa, configura estas variables **solo en el servidor** (`.env.local` en desarrollo,
ignorado por Git; variables server-side en Vercel — jamás con prefijo `NEXT_PUBLIC_`):

```text
BLU_LLM_BASE_URL=https://api.groq.com/openai/v1
BLU_LLM_API_KEY=<tu clave>
BLU_LLM_MODEL=openai/gpt-oss-120b
```

El adaptador es OpenAI-compatible: sirve GroqCloud (free tier sin tarjeta, para piloto),
OpenAI y Azure OpenAI (producción) sin cambiar código. Sin estas variables, el comportamiento
es el local actual. Antes de habilitar en un despliegue con personas reales:

1. **Verificar los términos vigentes del proveedor** (uso de datos para entrenamiento,
   revisión humana, retención). Las condiciones cambian; la fecha de verificación de la
   investigación del repo es 2026-11-05 (ADR-0005).
2. Considerar `BLU_API_TOKEN=<secreto>` para exigir `Authorization: Bearer` en la ruta
   (piloto cerrado; sin ella la ruta queda abierta con rate limit por IP).
3. Recordar los límites: 20 req/min y 200 req/día por IP, texto ≤ 2000 caracteres, sin
   persistencia del historial. La interfaz comunica el modo activo con un aviso honesto.

Ninguna cuota gratuita es promesa de disponibilidad productiva; para producción comercial
aplican las aprobaciones completas de PRD §8 (EIPD, contratos, pentest, revisión jurídica).

## Documentación

- [Análisis del texto de constitución](docs/PRODUCT_ANALYSIS.md)
- [PRD](docs/PRD.md)
- [Arquitectura C4](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Especificación del asistente](docs/ASSISTANT_SPEC.md)
- [Modelo de amenazas](docs/THREAT_MODEL.md)
- [Historias de usuario](docs/USER_STORIES.md)
- [Plan de validación científica](docs/SCIENTIFIC_VALIDATION.md)
- [Evidencia de validación](docs/VALIDATION.md)
- [Autodiagnóstico de hábitos](docs/onboarding/QUESTIONNAIRE.md) — cuestionario experimental (no diagnóstico)
- [Backlog y convenciones](backlog/README.md) · [Épicas](backlog/epics/)
- [Proceso de evaluación y ciclos UI/UX](docs/ux-process.md)
- [Constitución del proyecto](.specify/memory/constitution.md) · [Specs](specs/) · [ADR](docs/adr/)

## Autodiagnóstico de hábitos

Ruta `/cuestionario`: autoevaluación orientativa de los siete principios (35 preguntas
versionadas), con guardado progresivo, omisión sin penalización, saltos adaptativos (`skipIf`)
y un índice por principio **experimental y no diagnóstico**. Especificación y plan:
`specs/001-onboarding-questionnaire/`.

Fuera de la excepción acotada de Azure TTS descrita arriba, antes de incorporar nube,
cuentas, modelos externos, integraciones de salud o reclutamiento se requieren decisiones
explícitas de privacidad, seguridad, revisión científica, ética y regulación.
