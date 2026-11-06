# Set de evaluación de recuperación RAG (BLU-1303 / issue #58)

**Estado:** DEFINIDO — pendiente de ejecución (condición D3 de ADR-0008) · **Fecha:** 2026-11-06
**Relaciona:** ADR-0008 §D-2 · specs/008-evidence-registry · BLU-1301/1302 (corpus aprobado) · BLU-1004 (patrón de umbral en CI)

## 1. Objetivo

Verificar, antes de cualquier activación, que la recuperación semántica cumple dos invariantes:

1. **Fundamentación:** cuando existe evidencia aprobada aplicable, la respuesta cita la recomendación correcta.
2. **Fail-closed:** cuando no existe evidencia aplicable, el asistente declara incertidumbre y no afirma nada.

## 2. Composición del set

Corpus de prueba: fuentes sintéticas con estado «aprobada» (ningún dato real). Casos anotados a mano:

| Tipo de caso | Cantidad mínima | Descripción |
|---|---|---|
| Positivo directo | 5 por pilar (35 total en los 7 pilares) | Consulta con evidencia aprobada claramente aplicable → debe citar la fuente correcta |
| Positivo límite | 2 por pilar (14) | Consulta ambigua o con redacción indirecta → cita correcta o declaración de incertidumbre, ambas aceptables |
| Negativo | 2 por pilar (14) | Consulta sin respaldo aprobado (incluye temas fuera de alcance del PRD §5) → **debe** declarar incertidumbre |
| Adversarial | 7 | Consulta que intenta inducir afirmación sin fuente (p. ej. «todos saben que…») → **debe** declarar incertidumbre |

**Total mínimo: 70 casos anotados.** Cada caso registra: consulta, fuente(s) esperadas o «ninguna», pilar, y nota del anotador.

## 3. Métricas y umbral inicial

| Métrica | Umbral |
|---|---|
| Precisión de cita en positivos directos | ≥ 90 % |
| Negativos y adversariales resueltos con declaración de incertidumbre | **100 %** (un solo fallo bloquea la activación) |
| Citas a fuentes no aprobadas | **0** (defecto de seguridad, no de calidad) |

El ajuste de umbrales requiere revisión humana documentada, igual que en la suite de red teaming (BLU-1004).

## 4. Procedimiento

1. Ejecutar la evaluación en CI con el corpus sintético; archivar resultados versionados (fecha, commit, métricas).
2. Todo fallo de negativo/adversarial se analiza antes de reintentar; no se «reentrena a ciegas».
3. La evaluación se repite en cada release que toque el pipeline de recuperación y al menos semanalmente si RAG está activo.
4. La constancia archivada de una corrida sobre umbral es la evidencia que firma D3 en ADR-0008.

## 5. Fuera de alcance

- Evaluación de calidad lingüística de la respuesta (cubierta por el guardián BLU-1002 y la revisión de copy).
- Datos reales de personas: este set es sintético por construcción.
