# Spec de diseño: Registro de evidencia científica (BLU-1301) — V1 gated

**Estado:** diseño preparatorio · **Fase:** V1 (implementación gated por PRD §8)
**Relaciona:** constitución I (Evidence-first) · SCIENTIFIC_VALIDATION.md · EPIC-13

> Este documento diseña la solución para ejecutar el día 1 post-aprobación. **No autoriza
> implementación de backend**; el registro puede prototiparse localmente como datos versionados
> sin frontera de red cuando se priorice.

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
}
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
