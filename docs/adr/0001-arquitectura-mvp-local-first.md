# ADR-0001 — Arquitectura del MVP: local-first sin backend, con ruta explícita a V1

**Estado:** aceptado · **Fecha:** 2026-11-04 · **Decisores:** equipo Blu (constitución IX–X)

## Contexto

Blu es un prototipo de hábitos de bienestar (no clínico). El PRD §8 exige aprobaciones de
privacidad, seguridad, revisión científica, ética y jurídica antes de habilitar nube, cuentas o
modelos externos. La constitución (X) prohíbe adoptar arquitectura que un requisito real no
justifique.

## Opciones evaluadas

| Opción | Descripción | Coste | Superficie de seguridad | Cuándo |
|---|---|---|---|---|
| A. Local-first puro | Next.js estático + `localStorage`; sin servidor propio | Mínimo | Mínima (nada sale del navegador) | Ya |
| B. Next.js + Supabase (PostgreSQL + RLS) | Cuentas, sincronización, autorización por fila | Medio | Media-alta (authz, CSP, retención, contratos) | Cuando BLU-104/BLU-101 lo requieran y existan aprobaciones PRD §8 |
| C. FastAPI aparte | Servicio Python independiente para lógica/IA | Alto | Alta (otro despliegue, otro modelo de amenazas) | Solo si aparece necesidad real (p. ej. pipeline RAG EPIC-13 con requisitos que Next no cubra) |
| D. Multiagente/agéntico | Orquestación de agentes | Muy alto | Muy alta | Rechazada: sin necesidad demostrada (constitución X) |

## Decisión

**Ahora: Opción A (local-first).** El MVP completo —onboarding, autodiagnóstico, hábitos,
check-ins, revisión, adaptación, borrado— funciona sin backend y sin transmisión de datos.

## Ruta condicionada (no compromiso)

- **V1 (cuentas/sincronización):** Opción B, precedida del ADR de persistencia que compare
  Supabase/Neon/Vercel Postgres con criterios de residencia, retención y borrado; RLS obligatoria
  (BLU-104) y evaluación de impacto previa.
- **V2 (RAG sobre evidencia aprobada):** solo sobre EPIC-13 aprobado; pgvector evaluado en ADR
  específico; proveedor LLM desacoplado (BLU-1001) con residencia y retención documentadas.
- **FastAPI (C):** solo si un ADR demuestra que TypeScript/Next no cubre el requisito (p. ej.
  pipelines científicos). Hoy no hay tal requisito.

## Consecuencias

- Positivas: cero datos personales en servidor; despliegue trivial; cumplimiento de minimización
  por construcción; amenazas de red eliminadas (THREAT_MODEL.md).
- Negativas: sin sincronización entre dispositivos; `localStorage` sin cifrar (mitigación: aviso
  explícito en consentimiento, minimización de campos, borrado verificado).
- Riesgo residual: dispositivo compartido → se advierte en onboarding (STRIDE, suplantación).

## Cumplimiento

Esta decisión se revisa al abrir cualquier historia de EPIC-01/13/14 que requiera backend; el
cumplimiento de las aprobaciones del PRD §8 es condición bloqueante documentada en el DoR.

## Enlaces

- PRD §8 · THREAT_MODEL.md · specs/001-onboarding-questionnaire/plan.md · BLU-1401
