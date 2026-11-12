# ADR-0008 — Apertura V2 condicionada: memoria consentida, RAG sobre evidencia aprobada y voz local

**Estado:** ACEPTADO (construcción) — firmado por el dueño del producto el 2026-11-12. Habilita **construir y probar con datos sintéticos** D-1 (#43) y D-2 (#58), apagados por configuración. La activación con datos reales sigue condicionada a D1–D3. D-3 (#82) queda pospuesto a post-piloto.
**Fecha:** 2026-11-06
**Relaciona:** PRD §8 (gate documental y enmiendas) · ADR-0005 (chat remoto) · ADR-0006 (apertura V1 por fases) · EIPD-V1 · EIPD-V2 (borrador, `docs/EIPD-V2-memoria-rag-voz.md`) · issues #43, #58, #82 · épicas #45 y #60

## Contexto

La enmienda V1 del PRD §8 (2026-11-05, «opción A») abrió la construcción de cuentas, sesiones, aislamiento RLS, telemetría sin PII y registro de evidencia, y dejó explícitamente gated tres capacidades V2: memoria conversacional persistente (#43), RAG semántico (#58) y voz (#82, specs/015). Las tres comparten el mismo gate documental y ninguna puede activarse sin decisión expresa del dueño del producto.

Este ADR propone abrir su **construcción** con el mismo patrón ya validado en ADR-0005 y ADR-0006: construcción habilitada, activación exclusivamente por configuración, producción condicionada a firmas humanas. No es una aprobación: es el material de decisión para que el dueño firme o rechace.

**Qué NO es este ADR:** no es la EIPD-V2, no es opinión jurídica, no crea recursos cloud, no habilita voz en la nube.

## Decisiones propuestas

### D-1 · #43 — Memoria conversacional consentida y minimizada

- Construcción sobre la infra V1 (cuentas + RLS owner-only). Sin V1 activo, la memoria no existe: por defecto la conversación vive solo en sesión (comportamiento actual, invariante).
- Consentimiento como propósito separado (`memoria_conversacional`), distinto de operativo / mejora / investigación / sincronización (patrón de `consent.ts`).
- Retención por defecto de 30 días con purga automática y caducidad verificable; configurable a menos, nunca a más sin revisión humana.
- Borrado verificable integrado al procedimiento ARCO (extensión de `erase.ts` + purga documentada, espejo de C5).
- Ningún texto conversacional en logs, telemetría ni exportaciones de investigación.

### D-2 · #58 — RAG solo sobre evidencia aprobada

- Infraestructura: **pgvector sobre la misma instancia Postgres gestionada (Supabase) de V1**. No introduce proveedor nuevo ni superficie contractual adicional a C2.
- Corpus: exclusivamente fuentes con estado «aprobada» del registro de evidencia (BLU-1301/1302, ya implementado y cerrado). Indexar otra cosa es un defecto de seguridad, no de producto.
- Embeddings generados por el proveedor intercambiable de ADR-0005 con retención nula configurada; el corpus es contenido editorial aprobado, no PII.
- Comportamiento fail-closed: sin evidencia recuperada sobre umbral, el asistente declara incertidumbre en vez de afirmar (segundo escenario Gherkin del issue).
- DoR cubierto: infra aprobada por este ADR + set de evaluación definido en `docs/research/rag-set-evaluacion.md`.

### D-3 · #82 — Entrada por voz local (pospuesta)

- Se pospone a post-piloto: la voz no alimenta la hipótesis H1 y el micrófono es superficie sensible.
- Cuando se abra: solo `SpeechRecognition.processLocally` con verificación `available()`, consentimiento específico y fallback completo a texto (specs/015). Voz en la nube requeriría un ADR nuevo.
- La lectura en voz alta (specs/014, área ya autorizada) no se ve afectada.

## Matriz de aprobación

| Capacidad | Issue | Construcción | Activación en producción | Recomendación |
|---|---|---|---|---|
| Memoria opt-in | #43 | Al firmar este ADR | D1 + D2 | Abrir ahora |
| RAG sobre evidencia | #58 | Al firmar este ADR | D1 + D2 + D3 | Abrir ahora |
| Voz local | #82 | Post-piloto | ADR nuevo | Posponer |

## Condiciones de activación (firmas humanas)

| # | Condición | Responsable | Estado |
|---|---|---|---|
| D1 | EIPD-V2 aprobada y registrada (memoria + RAG) | Dueño del producto + asesoría jurídica | Pendiente (borrador listo) |
| D2 | V1 activo en producción (C1–C3/C5 de ADR-0006) | Según ADR-0006 | Pendiente |
| D3 | Evaluación de recuperación ejecutada con umbral archivado | Producto + revisor científico | Pendiente (set ya definido) |

Regla dura: **sin D1–D3, nada de memoria ni RAG con datos reales.** El código puede construirse y probarse con datos sintéticos, apagado por configuración, igual que en ADR-0005/0006.

## Riesgos y mitigaciones nuevas

| Riesgo | Mitigación obligatoria |
|---|---|
| PII conversacional persistida | Opt-in por propósito separado + retención 30 días + purga probada + fuera de logs/telemetría/exportaciones |
| Respuesta sin fundamento | Corpus solo aprobado + fail-closed + umbral de evaluación archivado |
| Deriva de propósito (memoria → perfilado) | Propósito separado + prohibición explícita de exportar contenido conversacional |
| Superficie de micrófono | Voz pospuesta; cuando se abra, solo procesamiento local |

## Firmas

- **Producto:** ✅ firmado 2026-11-12 (Cristobal Herrera, dueño del producto). Aprueba D-1 y D-2 para construcción y confirma D-3 pospuesto.
- **Jurídica/EIPD-V2:** pendiente (D1).
- **Revisor científico:** pendiente (D3, al ejecutar la evaluación de recuperación).
