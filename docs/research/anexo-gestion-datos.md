# Anexo B — Plan de gestión de datos (BLU-1601)

**Estado:** BORRADOR para revisión ética · **Alcance:** piloto de ocho semanas (H1).

## Datos del estudio

| Categoría | Contenido | Dónde vive | Quién accede |
|---|---|---|---|
| Métricas de uso agregadas | Conteos semana × hábito (check-ins, participación) | Dataset de investigación (BLU-1203) exportado bajo gate | Solo el equipo de análisis, tras gate de aprobaciones |
| Consentimiento de investigación | Propósito, versión, fecha (auditoría) | Registro de consentimiento de la app | Sistema + revisión ética |
| **No se recolecta** | Contenido de chat, texto libre, datos clínicos, identificadores | — (prohibido por EIPD y ADR-0005) | — |

## Ciclo de vida

1. **Recolección:** opt-in por consentimiento «investigacion»; revocable en cualquier
   momento (exclusión inmediata de exportaciones posteriores, verificado en CI).
2. **Agregación:** k-anonimato mínimo k=5; celdas pequeñas suprimidas y contabilizadas.
3. **Exportación:** bloqueada operativamente (`exportGateStatus`) hasta contar con
   protocolo aprobado + firmas C1–C3/C5; cada acceso queda en el log de trazabilidad
   (actor, fecha, tamaño — nunca datos).
4. **Retención:** dataset congelado para reproducción (con digest) hasta publicar
   informe; luego supresión acordada con la revisión ética.
5. **Acceso:** ningún dato individual existe en el entorno de investigación; el
   seudónimo de recolección (si V1 lo usa) permanece con RLS owner-only fuera del
   entorno de análisis.

## Seguridad

TLS en tránsito; RLS owner-only (verificado en vivo, PR #110); procedimientos ARCO
operativos probados de extremo a extremo (PR #119, 23/23 casos en vivo); telemetría
de producto sin PII con lista blanca (independiente de este estudio y excluida del
dataset de investigación).

## Minimización

Solo conteos agregados; sin texto, sin fechas más finas que la semana, sin claves
de persona en las filas. Dictamen técnico completo:
`docs/privacy/dictamen-minimizacion-export-investigacion.md` (READY FOR HUMAN REVIEW).
