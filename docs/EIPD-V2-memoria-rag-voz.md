# EIPD-V2 — Evaluación de Impacto en la Protección de Datos: memoria conversacional, RAG y voz local

**Estado:** BORRADOR PARA REVISIÓN JURÍDICA (condición D1 de ADR-0008) · **Fecha:** 2026-11-06
**Relaciona:** ADR-0008 (propuesta de apertura V2) · ADR-0006 · EIPD-V1 · PRD §8 · THREAT_MODEL · issues #43, #58, #82
**Marco de referencia:** Constitución de Blu (II minimización, VI privacidad, VII trazabilidad); Ley 19.628 de Chile y Ley 21.719 — **requiere validación de asesoría jurídica antes de cualquier activación con datos reales**.

## 1. Alcance y sistema

Blu V2 propone dos capacidades sobre la infraestructura V1 (cuentas, RLS owner-only, Supabase):

1. **Memoria conversacional consentida (#43):** persistencia opt-in del historial de conversación, con retención breve y borrado verificable. Por defecto, la conversación sigue viviendo solo en sesión.
2. **RAG sobre evidencia aprobada (#58):** recuperación semántica exclusivamente sobre el corpus con estado «aprobada» del registro de evidencia, para fundamentar respuestas del asistente.

La **voz (#82) queda fuera de esta evaluación**: pospuesta a post-piloto (ADR-0008 §D-3). Cuando se abra, será solo procesamiento local y requerirá anexo propio.

## 2. Roles y responsabilidades

Se mantienen los de EIPD-V1 §2: dueño del producto como responsable del tratamiento (a confirmar con jurídico), Supabase como encargado (contrato C2), personas usuarias como titulares. El proveedor de embeddings/LLM de ADR-0005 opera con retención nula configurada y sin persistencia conversacional.

## 3. Inventario de datos (mínimo, principio de minimización)

| Categoría | Dato | Origen | Almacén | Acceso | Retención |
|---|---|---|---|---|---|
| Conversación (contenido) | Mensajes de la conversación | La persona | Postgres con RLS owner-only | Solo la persona titular | **30 días por defecto**, purga automática; borrado verificable bajo demanda |
| Consentimientos | Propósito `memoria_conversacional`, versión, fecha | Sistema/persona | Postgres (auditoría) | Sistema + revisión jurídica | Permanente (trazabilidad) |
| Corpus RAG | Fuentes aprobadas y sus embeddings | Equipo (registro de evidencia) | Postgres + pgvector | Sistema | Vida útil de la fuente; retiro en cascada (BLU-1302) |
| **Prohibido** | Conversaciones sin consentimiento del propósito; texto conversacional en logs, telemetría o exportaciones de investigación; audio de voz | — | **No se almacenan** | — | — |

## 4. Necesidad y proporcionalidad

- La memoria mejora continuidad del acompañamiento, pero no es necesaria para el servicio: por eso es opt-in, con el modo sesión como estado por defecto.
- El corpus RAG es contenido editorial aprobado por revisión humana, no datos personales; los embeddings se derivan solo de ese corpus.
- No se justifica persistir conversaciones para otro propósito (ni investigación, ni mejora, ni entrenamiento). Cualquier uso adicional requeriría EIPD nueva.

## 5. Transferencias transfronterizas

Mismas condiciones que EIPD-V1 §5: región elegida y cláusulas contractuales pendientes de validación jurídica (C2 de ADR-0006). El proveedor de embeddings/LLM debe constar en el contrato con retención nula.

## 6. Riesgos principales y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Fuga de contenido conversacional | RLS owner-only + `service_role` jamás en cliente + fuera de logs/telemetría + purga 30 días |
| Persistencia sin consentimiento | Fail-closed: sin propósito `memoria_conversacional` activo, nada se escribe; prueba de no persistencia por defecto |
| Borrado incompleto | Procedimiento ARCO extendido con verificación (espejo de C5, ya probado 23/23 en EIPD-V1) |
| Respuesta sin fundamento | Corpus solo aprobado + fail-closed («sin evidencia → declara») + evaluación con umbral archivado (D3) |
| Deriva de propósito | Propósito separado + prohibición de exportar contenido conversacional (gate `exportGateStatus` lo excluye por diseño) |

Riesgo residual aceptado provisionalmente: proveedor gestionado como tercero de confianza, mitigado por C1/C2 y cláusulas de borrado.

## 7. Derechos ARCO (extensión)

Sobre el procedimiento de EIPD-V1 §7 (probado en C5):
1. **Acceso/portabilidad:** la exportación incluye la memoria conversacional propia, si existe.
2. **Rectificación:** no aplica a conversación (contenido efímero); aplica a datos de bienestar.
3. **Cancelación/borrado:** «borrar conversaciones» elimina y verifica el historial persistido; el borrado total de cuenta lo incluye.
4. **Oposición:** retiro del propósito `memoria_conversacional` en cualquier momento, con borrado asociado.

## 8. Medidas de seguridad (resumen)

Se heredan las de EIPD-V1 §8, más: purga automática de retención con evidencia en CI, prueba de borrado verificado de memoria, y suite de evaluación RAG en CI con umbral (fail del pipeline si baja).

## 9. Decisiones pendientes con fecha objetivo

| Decisión | Dueño | Bloquea |
|---|---|---|
| Aprobación formal EIPD-V2 (D1) | Producto + jurídico | Activación memoria/RAG |
| V1 activo (C1–C3/C5) | Según ADR-0006 | Activación memoria/RAG |
| Evaluación de recuperación archivada (D3) | Producto + revisor científico | Activación RAG |
| Apertura de voz local | Producto (post-piloto) | #82 |

## 10. Hoja de firmas (D1)

- [ ] **D1 — EIPD-V2 aprobada.** Firma responsable del tratamiento + validación jurídica.
      Fecha: ____ · Evidencia: ____

**Nota:** la firma de ADR-0008 por el dueño del producto habilita solo la *construcción* de #43 y #58. La activación con datos reales exige D1 + D2 (+ D3 para RAG).
