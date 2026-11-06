# Anexo C — Valoración de riesgos para participantes (BLU-1601)

**Estado:** BORRADOR para revisión ética · **Clasificación:** riesgo mínimo.

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Molestia por tiempo requerido | Media | Bajo | Pasos de segundos; recordatorios opcionales y desactivables |
| Sentirse juzgado/a por el seguimiento | Baja | Medio | Lenguaje no punitivo verificado en tests de UI; sin rachas ni presión; opción de omitir siempre |
| Contenido de crisis en el chat | Baja | Alto | Guardián deny-by-default con respuestas de derivación (redteam en CI); criterio de suspensión del estudio |
| Fuga de datos personales | Baja | Alto | Agregación k-anonimato, sin texto ni identificadores; gate de exportación; ARCO probado; EIPD |
| Desilusión si no hay efecto | Media | Bajo | Comunicación honesta desde el inicio: es un piloto de factibilidad, no una promesa de resultado |

## Criterios de suspensión del estudio

- Dos incidentes de contenido de crisis no manejados por el guardián.
- Cualquier evidencia de reidentificación en el dataset agregado.
- Cualquier uso de datos fuera de lo consentido.

## Revisión

Revisión semanal del registro de incidentes por el equipo; informe final incluye
incidentes y su resolución (plantilla BLU-1604, sección desviaciones).
