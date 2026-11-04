# Proceso de evaluación crítica UI/UX y rediseño de Blu

**Versión:** 1.0 · **Fecha:** 2026-11-04 · **Herramientas:** rúbrica propia + auditorías axe-core
(automatizadas en CI) + 21st.dev MCP (inspiración y bocetos).

## Principios rectores

1. **La constitución manda sobre el diseño**: tono no clínico y no culpabilizador, privacidad
   visible, accesibilidad WCAG 2.2 AA (constitución I, II, IV, VII).
2. **Stack estable**: Next.js + CSS Modules. Lo que 21st.dev entrega (Tailwind/shadcn) se usa
   como **referencia visual** para implementar en nuestro CSS; nunca como dependencia nueva
   (constitución X).
3. **TDD de UI**: toda mejora entra con prueba (axe, smoke de accesibilidad o componente) y
   `npm test/lint/build/eval:security` verdes antes del commit.

## Rúbrica de evaluación crítica (1–5 por criterio)

| Criterio | Señales de bajo puntaje |
|---|---|
| Jerarquía visual | sin foco claro, títulos que no guían, ruido visual |
| Claridad de acción principal | el siguiente paso no es obvio |
| Feedback de estado | cambios sin confirmación, estados vacíos genéricos |
| Tono y microcopy | culpa, exigencia, lenguaje clínico |
| Accesibilidad | lo que detecte axe + smoke (teclado, nombres, aria-live) |
| Densidad móvil | scroll excesivo, targets < 44px, texto cortado |
| Confianza/privacidad | datos sin explicación visible, consentimientos oscuros |

**Umbral de acción:** cualquier criterio ≤ 3 abre mejora; dos o más ≤ 2 abren ciclo urgente.

## El ciclo (repetible)

1. **Medir**: ejecutar `npm test` (incluye axe + smoke) y recorrer la rúbrica sobre las
   pantallas del MVP.
2. **Contrastar**: `get_inspiration`/`generate` (sketch) en 21st.dev con el contexto de
   diseño de Blu; extraer 2–3 ideas accionables (layout, ritmo, estados vacíos).
3. **Decidir**: elegir mejoras de mayor impacto que pasen el filtro de principios; descartar
   con motivo registrado (ej.: «integra Tailwind → rechazada, constitución X»).
4. **Implementar**: primero la prueba (axe/smoke/componente), luego el cambio en nuestro CSS.
5. **Validar y registrar**: batería completa verde; registrar en el log de ciclos (abajo) y
   en `record_inspiration_feedback`/`record_take_outcome` de 21st cuando aplique.

## Log de ciclos

### Ciclo 1 — 2026-11-04 (en curso)
- Medición inicial: axe 0 violaciones serias (4 pantallas); smoke verde.
- Contrastación: inspiración 21st (shadcn genérico ~60% match → referencia limitada);
  boceto generado para crítica visual (no integración).

**Decisión del ciclo 1** (extraído del boceto 21st, proyecto a8523df6, take 1):
- Adoptado: mini barras semanales por día (ya implementadas como `WeekBars` en CSS Modules).
- Adoptado: estado vacío amable en el panel ("tu primer paso puede ser pequeñísimo").
- Adaptado: tokens de paleta arena/azul del boceto → variables CSS propias (`--blu-*` en
  globals.css), sin fuentes remotas ni Tailwind (constitución II/X: sin assets de terceros).
- Rechazado con motivo: fuentes Fraunces/Inter vía CDN (terceros + privacidad) y el componente
  shadcn de referencia (cambio de stack innecesario).

**Validación del ciclo 1**: 202/202 pruebas (incluye axe y smoke), lint 0, build OK,
eval:security 3/3. Outcome registrado en 21st (`record_take_outcome`: adapted).
