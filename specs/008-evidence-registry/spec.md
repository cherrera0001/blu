# Spec de diseño: Registro de evidencia científica (BLU-1301) — V1 gated

**Estado:** registro local implementado y verificado (BLU-1301 cerrado) · persistencia
servidor (tabla `evidence_sources`) gated por ADR-0006 · **Fase:** V1
**Relaciona:** constitución I (Evidence-first) · SCIENTIFIC_VALIDATION.md · EPIC-13

> **Qué existe hoy (evidencia):** `src/lib/evidence/registry.ts` implementa el esquema y
> reglas de abajo como módulo puro local (sin frontera de red, como permitía este diseño).
> Verificación: `src/lib/evidence/registry.test.ts` (18 tests) — rechazo listando todos
> los campos faltantes, formato de referencia por tipo, ciclo de vida con fecha y revisor
> en cada transición, deny-by-default de citación e importación en lote con reporte.
> Datos: `src/data/evidence/sources.json` inicia vacío (ninguna afirmación citable sin
> aprobación humana). La importación de `sourceLabel` genera **borradores pendientes de
> referencia** (las etiquetas no son identificadores persistentes; no se fabrican).
> **Flujo de revisión (BLU-1302, #57):** `src/lib/evidence/review.ts` implementa
> `citationFor` (cita visible solo con fuente aprobada, con fecha y revisor),
> `resolvePublication` (deny-by-default: pendiente/inexistente → «sin evidencia
> verificada»; retirada → «en revisión», ocultar con aviso) y `withdrawWithCascade`
> (retiro con cascada explícita sobre las recomendaciones ligadas). 10 tests en
> `review.test.ts`.

## Objetivo

Toda afirmación de salud en Blu debe tener una fuente registrada con metadatos completos y un
estado de revisión. Sin fuente aprobada: rotulo «sin evidencia verificada» (ya implementado en
contenido educativo y banco de preguntas).

## Esquema de datos (EvidenceSource)

```ts
interface EvidenceSource {
  id: string;                    // ev-YYYY-NNN
  claim: string;                 // afirmación exacta, redactada
  referenceType: "doi" | "pmid" | "url" | "guideline";
  referenceValue: string;        // persistente, resoluble
  searchedAt: string;            // fecha de búsqueda
  studyType: string;             // RCT, cohorte, guía, revisión...
  population: string;
  design: string;                // diseño y comparador
  outcomes: string;
  magnitude: string;             // magnitud e incertidumbre
  limitations: string;           // riesgo de sesgo
  applicabilityCL: string;
  reviewedAt: string | null;
  reviewer: string | null;       // persona, no rol genérico
  status: "pendiente" | "aprobada" | "retirada";
  version: number;               // historial de cambios del texto
  transitionLog: StatusTransition[]; // implementado: fecha y revisor de cada cambio
}
interface StatusTransition { from: SourceStatus; to: SourceStatus; at: string; by: string }
```

## Ciclo de vida

`pendiente → aprobada → (retirada)` — toda transición registra fecha y revisor. Retirar una
fuente marca en revisión las recomendaciones ligadas (cascada explícita, BLU-1302).

## Reglas (constitución I y VII)

- Validación: `referenceValue` obligatorio y con formato según `referenceType`; campos de
  revisión completos solo en transición a `aprobada`.
- Deny-by-default: ninguna recomendación cita fuentes no `aprobada`.
- Rotulos: `pendiente` ⇒ «sin evidencia verificada»; `retirada` ⇒ ocultar recomendación con aviso.

## Migración del estado actual

Los contenidos educativos (`src/data/habits/education.json`) y el banco (`bank.json`) ya
llevan `sourceStatus: "pendiente"` y `evidence.status`: al implementarse el registro, sus
`sourceLabel` se convierten en `EvidenceSource` pendientes en lote (script de importación con
reporte).

## Pruebas planificadas (al implementar)

1. Rechazo de fuente sin referencia persistente o con campos de revisión incompletos.
2. Cascada de retiro: fuente retirada ⇒ recomendaciones en revisión.
3. Ninguna recomendación publica cita fuente no aprobada (regresión permanente).
4. Importación en lote desde contenido actual con conteo verificado.

## Qué desbloquea

BLU-1302 (flujo de revisión humana), BLU-1304 (trazabilidad visible) y, en V2, BLU-1303 (RAG
solo sobre evidencia aprobada).
