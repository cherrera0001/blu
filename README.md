# Blu

Blu es un prototipo de acompañamiento para crear hábitos cotidianos de bienestar. Su enfoque es la calidad de vida, la autonomía y los cambios pequeños; no promete longevidad ni ofrece atención clínica.

## Estado

**Prototipo local — no validado clínicamente ni como intervención conductual.** No usar para diagnóstico, tratamiento ni decisiones sanitarias. El prototipo no llama a un modelo de IA ni envía datos a un servidor; la configuración y los check-ins se guardan en el almacenamiento local del navegador.

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
- [Constitución del proyecto](.specify/memory/constitution.md) · [Specs](specs/) · [ADR](docs/adr/)

## Autodiagnóstico de hábitos

Ruta `/cuestionario`: autoevaluación orientativa de los siete principios (35 preguntas
versionadas), con guardado progresivo, omisión sin penalización, saltos adaptativos (`skipIf`)
y un índice por principio **experimental y no diagnóstico**. Especificación y plan:
`specs/001-onboarding-questionnaire/`.

Antes de incorporar nube, cuentas, modelos externos, integraciones de salud o reclutamiento de participantes, se requieren decisiones explícitas de privacidad, seguridad, revisión científica, ética y regulación.
