# Política de publicación de resultados del piloto (BLU-1604)

**Estado:** adoptada por el equipo vía PR (2026-11-06) · **Aplica a:** EPIC-16, H1 y estudios posteriores

## Compromisos

1. **Publicación independiente del resultado.** El informe del piloto se
   publica con conclusiones y limitaciones tanto si el efecto es favorable,
   desfavorable como nulo. Un resultado nulo es un resultado.
2. **Nada se elige después de ver los datos.** Desenlaces, análisis y métricas
   quedan fijados en la preespecificación (`preespecificacion-blu-h1.md`)
   antes del primer reclutamiento. Cualquier desviación se reporta como tal,
   con nota fechada y justificación, en la sección «Desviaciones del plan».
3. **Sesgo de publicación activamente evitado.** No se seleccionan
   subgrupos, ventanas temporales ni métricas alternativas porque «salieron
   bien». Un análisis exploratorio se etiqueta siempre como exploratorio.
4. **Reproducibilidad.** Todo número del informe sale del pipeline
   (`src/lib/research/pipeline.ts`) ejecutado sobre el dataset agregado
   consentido (BLU-1203), sin pasos manuales.
5. **Métricas de usabilidad ≠ eficacia.** Los informes separan siempre
   «la app funcionó y se usó» de cualquier afirmación sobre salud. Sin
   estudio diseñado para ello, no hay afirmaciones de eficacia.

## Proceso

1. Cierre del piloto → congelación del dataset versionado.
2. Ejecución del pipeline → tablas y figuras.
3. Redacción con la plantilla (`plantilla-informe-piloto.md`).
4. Revisión interna (mínimo dos personas) → publicación en el repositorio
   público del proyecto.

## Incumplimientos

Cualquier desviación de esta política se documenta en el informe mismo y en
el changelog del repositorio; ocultar un resultado desfavorable es motivo de
retractación del informe.
