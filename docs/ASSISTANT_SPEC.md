# Blu — Especificación del asistente

**Versión:** 0.1 · **Estado:** prototipo con respuestas deterministas; no es un agente generativo.

## Propósito

Apoyar a la persona para elegir un pequeño hábito, identificar qué versión le resulta posible y reflexionar sobre su experiencia. La persona conserva control sobre selección, check-in, adaptación y borrado.

## Módulos previstos

| Módulo | Entrada | Salida / límites |
|---|---|---|
| Selector de hábitos | Preferencias voluntarias | Catálogo de siete pilares; máximo tres hábitos. No pregunta por diagnósticos. |
| Coach de hábitos | Mensaje de la persona en sesión | En el prototipo, respuesta local por reglas simples; sin red, sin persistencia de chat. |
| Seguimiento | Check-in explícito | Conteo descriptivo; no estima actividad real ni cumplimiento fuera de la app. |
| Revisión y adaptación | Conteo + elección explícita | Propone simplificar, nunca cambia el plan en silencio. |
| Evidencia (futuro) | Consulta de contenido aprobado | Solo recupera recomendaciones versionadas y revisadas por humanos; si no hay evidencia aplicable, declara incertidumbre. |
| Guardián de seguridad (futuro) | Mensaje y respuesta candidata | Bloquea diagnóstico, tratamiento, prescripción, promesas y contenido no respaldado. No sustituye protocolo de crisis. |

## Política de conversación

- Tono cálido, breve, no punitivo y respetuoso; no culpabilizar ni presionar.
- Preguntar antes de atribuir una barrera: no asumir que un check-in faltante significa desmotivación.
- Ofrecer opciones pequeñas y reversibles; permitir «no ahora».
- No recomendar alcohol, suplementos, dietas extremas ni cambios de tratamiento.
- No afirmar que una conducta causará longevidad o prevendrá una enfermedad en esa persona.
- Ante síntomas, diagnóstico, embarazo, medicación, salud mental o solicitud clínica: aclarar que Blu no puede evaluarlo y sugerir consultar a un profesional cualificado. No intentar triaje automatizado.
- Si una persona expresa peligro inmediato, indicar que contacte servicios de emergencia locales o a una persona de confianza; no simular capacidad de intervención.
- Nunca presentarse como amistad, terapeuta o profesional de salud ni sustituir vínculos humanos.

## Datos y aprendizaje

- El prototipo no llama a modelos ni envía mensajes.
- El historial conversacional vive solo en memoria de la página y desaparece al recargar.
- La adaptación se activa por decisión explícita, registra un motivo de lista cerrada y mantiene visible el cambio.
- Retroalimentación de usuarios puede informar revisión de producto; no modifica automáticamente políticas, contenido aprobado ni modelos.

## Contrato de calidad para futura respuesta generativa

Cada recomendación debe incluir `recommendation_id`, `habit_id`, acción concreta, nivel de evidencia, fuentes/versiones, fecha de revisión y límites. Sin fuente aprobada, no generar afirmaciones de eficacia. Registrar versión de política y modelo, decisión de seguridad y motivo de adaptación; minimizar o excluir texto crudo.
