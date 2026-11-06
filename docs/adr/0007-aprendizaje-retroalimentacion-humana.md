# ADR-0007: Aprendizaje con retroalimentación humana, sin auto-modificación de reglas

**Estado:** aceptado · **Fecha:** 2026-11-06
**Relaciona:** constitución (aprendizaje controlado y auditable) · BLU-1104 (#49) · ADR-0006

## Contexto

Blu quiere aprender de la retroalimentación explícita de las personas ("esta
sugerencia no sirvió") sin cambiar reglas en silencio ni acumular contenido
sensible. La constitución exige aprendizaje controlado y auditable: los cambios
de políticas son decisiones humanas.

## Decisión

1. **Eventos estructurados, sin texto libre.** La retroalimentación usa un
   catálogo cerrado de razones (`no-era-para-mi`, `no-pude-hacerlo`,
   `no-me-gusto`, `duplicado`). `validateFeedbackEvent()` rechaza cualquier
   evento que traiga campos de texto libre (`comment`, `text`, `message`…):
   es imposible registrar una queja narrativa aunque se intente.
2. **Consentimiento «mejora» aplicado y fail-closed.** `recordFeedback()` exige
   el propósito `mejora` del módulo de consentimiento; sin él, el evento no se
   registra (`consentimiento_requerido`). Retirar el consentimiento bloquea
   nuevos eventos.
3. **Agregación mínima.** El análisis usa solo conteos (`aggregateFeedback()`):
   totales, por razón y por hábito. Los eventos individuales no se exponen en
   ninguna vista del producto.
4. **Cambios de regla = PR humano versionado, nunca automático.** Ninguna
   métrica, por contundente que sea, modifica reglas del motor. El mecanismo
   obligatorio es: evidencia agregada → decisión humana → PR con justificación
   y versionado → revisión → merge. Ejemplo real de este repositorio: el
   flujo «ajustar» de la revisión semanal se diseñó como decisión humana
   explicitada en `specs/006-weekly-review/` — nunca como un ajuste que el
   sistema aplicara por su cuenta a partir de métricas.

## Consecuencias

- El equipo ve *cuántas* personas marcaron una sugerencia como inútil y por
  qué razón estructurada; nunca lee su texto.
- Una regla solo cambia cuando una persona la propone, justifica y mergea.
- Los eventos se guardan localmente (`blu.feedback.v1`); la sincronización
  agregada llega con la activación V1 (ADR-0006).

## Alternativas rechazadas

- **Texto libre de retroalimentación:** máxima riqueza, pero contenido
  sensible sin necesidad; contradice la agregación mínima.
- **Auto-ajuste de reglas sobre umbral (p. ej., descartar hábitos con >30 %
  de «no era para mí»):** viola la constitución; el umbral mismo es una regla
  humana que necesita justificación pública.
- **Telemetría de producto general:** fuera de alcance; BLU-1404 define
  observabilidad sin PII como frontera separada.
