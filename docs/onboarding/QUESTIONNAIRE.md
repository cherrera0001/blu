# Autodiagnóstico de hábitos Blu — Diseño del cuestionario

**Versión:** 1.0 · **Estado:** experimental, no clínico · **Fecha:** 2026-11-04

## 1. Qué es y qué no es

Es una **autoevaluación orientativa** de hábitos cotidianos inspirada en los siete principios de
bienestar. **No** es un diagnóstico médico, una escala psicométrica validada ni un instrumento de
tamizaje. No produce puntuaciones clínicas, no compara contra población y no debe usarse para
decisiones de salud.

## 2. Principios de diseño

1. Lenguaje neutro, inclusivo y no culpabilizador: nunca "fallaste", siempre "¿qué versión te cabe?".
2. Toda pregunta omisible cuando toca datos sensibles; omitir no penaliza.
3. Alternativas ordinales con anchors concretos (días, veces) y siempre una opción honesta
   ("no aplica", "prefiero no responder").
4. Tipos: selección única, múltiple y escala Likert de 5 puntos con etiquetas en ambos extremos.
5. Ramificación adaptativa por reglas explícitas (ver §6); el recorrido máximo está acotado.
6. Guardado progresivo por pregunta con reanudación (BLU-202).
7. Consentimiento diferenciado: responder el cuestionario es parte del propósito operativo;
   ninguna respuesta se usa para investigación sin consentimiento específico (BLU-102).
8. Versionado semántico del banco: cada evaluación guardada registra `bankVersion`.

## 3. Banco de preguntas

Archivo fuente: [`../../src/data/onboarding/bank.json`](../../src/data/onboarding/bank.json).
Esquema validado en `src/lib/onboarding/validateBank.ts` (BLU-201). Cada pregunta incluye
`rationale` (justificación de inclusión) y `evidence` (referencia con estado de revisión).

Estado de evidencia actual: **todas las referencias están pendientes de verificación** contra
el registro de evidencia (EPIC-13). Por tanto el contenido se publica como inspiración sin
evidencia verificada, con rotulo visible en la UI.

## 4. Reglas de interpretación

- Cada alternativa ordinal tiene un valor 0–3 (o 0–4 en Likert-5) ordenado de menor a mayor
  frecuencia/acuerdo. El orden es contenido, no ponderación psicométrica.
- **Índice por principio (experimental):** promedio de valores respondidos normalizado a 0–100,
  con bandas: 0–39 «espacio para cuidarte», 40–69 «en desarrollo», 70–100 «fortaleza».
- Ponderaciones: uniformes por decisión explícita. No se reclama validez ni confiabilidad;
  los valores son un espejo conversacional, no una medida.
- **Confianza:** si se omite más del 30% de las preguntas del principio, el nivel se muestra con
  «menor confianza». Si se omite todo el principio, no hay nivel.
- **Protección anti-clínica:** el cuestionario nunca pregunta síntomas, diagnósticos, medicación
  ni estado mental clínico; las reglas de validación rechazan texto que los sugiera (lista
  editorial versionada).

## 5. Cómo se validaría el índice (propuesta, requiere EPIC-16)

1. Revisión de contenido por expertos (claridad, sesgo, cobertura por principio).
2. Piloto cognitivo con 5–10 personas (comprensión, tiempo, carga).
3. Análisis psicométrico exploratorio en piloto de factibilidad (consistencia interna como
   *indicio*, no como certificación) con preespecificación en BLU-1602.
4. Decisión explícita: mantener, ajustar o retirar el índice, documentada en ADR.

## 6. Ramificación adaptativa

Reglas declarativas en el propio banco (`skipIf`): una pregunta con `skipIf` se omite cuando la
respuesta a la pregunta referenciada cumple la condición (p. ej., frecuencia = 0 omite los
detalles de barrera). El motor valida aciclicidad y longitud máxima (BLU-203).

## 7. Resultado del onboarding (BLU-205)

El perfil entrega: niveles por principio (rotulados experimentales), fortalezas (niveles altos),
oportunidades (niveles bajos), barreras declaradas (motivos de lista cerrada) y **hasta tres
objetivos sugeridos** con explicación en lenguaje simple y origen trazable (preguntas/reglas).
La persona puede aceptar, modificar o rechazar cada objetivo, o ignorar todas las sugerencias y
elegir manualmente. El control es siempre de la persona.

## 8. Repetición de la evaluación

Repetible cuando la persona lo decida; cada ejecución es un `Assessment` nuevo con
`bankVersion`, fecha y respuestas. El historial conserva versiones para no reescribir el pasado.

## Línea base (implementada 2026-11-04)

Al completar la autoevaluación, la pantalla de resultado muestra una **línea base**: promedio
entero (0–100) de los índices de las dimensiones **con respuestas**. Reglas públicas:

- Las preguntas omitidas no penalizan: solo reducen la cobertura declarada ("basado en X de 7
  dimensiones, N de 28 respuestas puntuables").
- Con menos de 3 dimensiones respondidas **no se fabrica un total** (mensaje honesto).
- Se expone la fórmula en pantalla y el rotulo obligatorio: medida descriptiva y experimental,
  no diagnóstica, sin comparación poblacional.
- La persona puede **revisar y corregir** respuestas; la línea base se recalcula al instante.
- No se persiste el score por separado ni historial: se calcula sobre las respuestas ya
  guardadas (misma regla de almacenamiento aprobada); repetir la evaluación reemplaza la base.
- Implementación: `src/lib/onboarding/baseline.ts` (puro, determinista) + tarjeta en el
  resultado del cuestionario; pruebas en `baseline.test.ts` y `QuestionnaireApp.test.tsx`.
