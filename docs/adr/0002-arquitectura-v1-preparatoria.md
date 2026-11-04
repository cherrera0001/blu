# ADR-0002 — Arquitectura V1: decisión preparatoria condicionada a aprobaciones PRD §8

**Estado:** propuesta preparatoria (no implementa código de backend) · **Fecha:** 2026-11-04
**Relaciona:** ADR-0001 (MVP local-first) · BLU-1401 · PRD §8

## Contexto

El MVP (ADR-0001) es local-first sin backend. V1 agregaría cuentas y sincronización, lo que el
PRD §8 y la constitución II/X condicionan a aprobaciones explícitas: privacidad, seguridad,
revisión científica, ética y análisis jurídico (Chile). **Este ADR no autoriza backend:**
prepara la decisión para que, aprobadas las condiciones, la implementación no arranque de cero.

## Opciones (re-evaluadas con criterios publicados)

| Criterio (peso) | B1. Next.js + Supabase (Postgres+RLS) | B2. Next.js + FastAPI + Postgres administrado |
|---|---|---|
| Superficie de seguridad (alto) | Media: una plataforma gestionada, RLS nativo | Alta: segundo servicio, otro modelo de amenazas |
| Cumplimiento RLS/ARCO (alto) | RLS nativo + políticas por usuario | Requiere implementación y auditoría propias |
| Costo operativo (medio) | Bajo-medio | Medio-alto |
| Egreso de datos (alto) | Cliente ⇄ Supabase directo | Cliente ⇄ API ⇄ DB (más fronteras) |
| Justificación real (alto) | Cubre cuentas/sincronización | Solo si aparece necesidad que Next no cubra |

## Decisión preparatoria

**Regla de decisión (activa solo tras aprobaciones PRD §8):** implementar **B1 (Supabase con
RLS)** como arquitectura V1 por defecto. B2 (FastAPI) solo si un ADR posterior demuestra un
requisito real que Next/Supabase no cubra (p. ej., pipelines científicos de EPIC-16/BLU-1603).
Prohibido iniciar cualquiera de las dos antes del visto bueno documentado.

## Ruta de migración desde el MVP

1. El formato de exportación `blu-export-*.json` (v1.0.0) es la base de importación: contiene
   `state`, `onboarding`, `goals`, `reviews` con versionado — contrato de migración ya probado.
2. Crear cuenta ⇄ importar exportación local (opt-in, una vez) ⇄ conservar borrado local.
3. Políticas RLS por `user_id` desde el día 1 (BLU-104); pruebas de aislamiento obligatorias.

## Preguntas que los aprobadores deben responder (bloquean V1)

1. Residencia y retención de datos (proveedor y jurisdicción aceptables para Chile).
2. Contrato de tratamiento y evaluación de impacto (EIPD) firmados.
3. Verificación de correo (BLU-101 V1): proveedor y flujo.
4. Presupuesto operativo aprobado (plan Supabase u homólogo).

## Consecuencias

- Positivas: decisión lista para ejecutar el día 1 post-aprobación; migración acotada por el
  contrato de exportación ya existente.
- Negativas/límites: este ADR **no** implementa nada; construir antes de las aprobaciones
  violaría la constitución y anularía la trazabilidad del gate.

## Enlaces

PRD §8 · THREAT_MODEL.md · specs (contratos de exportación) · BLU-104/105/1404
