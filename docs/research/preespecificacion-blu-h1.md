# Preespecificación del estudio piloto — Hipótesis H1 (BLU-1602)

**Estado:** documento versionado en repo · **Pendiente:** registro público en OSF
o ClinicalTrials.gov (paso humano: requiere cuenta y decisión del equipo) ·
**Regla:** ningún reclutamiento antes del registro público y la aprobación ética (BLU-1601).

## Pregunta e hipótesis

- **H1:** el acompañamiento conversacional personalizado (Blu) mejora la
  adherencia a hábitos saludables respecto de recordatorios estáticos.
- **H0 (de trabajo):** no hay diferencia de adherencia entre condiciones.

## Diseño

- Piloto de ocho semanas, dos condiciones (Blu vs. recordatorios estáticos),
  asignación documentada en el protocolo (BLU-1601).
- **Desenlace primario (fijado aquí, antes de cualquier dato):** adherencia
  semanal = check-ins realizados / planificados, promedio por participante,
  semanas 1–8.
- **Diferencia mínima relevante:** 10 puntos porcentuales entre condiciones.
- **Desenlaces secundarios (exploratorios, etiquetados como tales):**
  retención semanal, tasa de retroalimentación «no útil» por hábito.

## Cálculo muestral (orientativo, a confirmar con asesoría metodológica)

Con desenlace de proporciones, diferencia a detectar 10 pp, α=0.05 bilateral,
potencia 80 %: del orden de ~200 participantes por condición (fórmula de
Fleiss con continuidad; cálculo exacto en el protocolo BLU-1601). Si el piloto
no alcanza esa muestra, se declara explícitamente como **piloto de
factibilidad** y ningún resultado se presenta como confirmatorio.

## Plan de análisis

1. Dataset: exportación agregada opt-in con k-anonimato (BLU-1203).
2. Pipeline reproducible (BLU-1603, `src/lib/research/pipeline.ts`): tablas
   descriptivas e IC 95 % (Wilson); contrastes preespecificados se agregan al
   pipeline solo con nota fechada.
3. Conclusión según criterio fijado aquí: diferencia de adherencia con IC 95 %;
   se reporta aunque el intervalo incluya cero (política de nulos, BLU-1604).

## Política de cambios

Ningún cambio posterior a este documento es válido sin: (a) nota fechada en
este archivo (sección Cambios), (b) justificación, (c) actualización del
versionado. Cambios hechos después del primer reclutamiento se reportan como
desviaciones en el informe.

## Cambios

- 2026-11-06 — versión inicial (este documento), previa a cualquier reclutamiento.
