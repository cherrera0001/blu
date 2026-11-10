# ADR-0004 — Arquitectura objetivo confirmada: BFF en Vercel + Supabase (condicionado) + IA sustituible

**Estado:** decisión confirmatoria (diseño; nada se implementa ni despliega) · **Fecha:** 2026-11-04
**Relaciona:** ADR-0001/0002/0003 · specs/002, 009–016 · PRD §8 (gate vigente)

## Evaluación de la propuesta

| Componente propuesto | Veredicto | Razón concreta |
|---|---|---|
| Frontend Next.js/React en Vercel | **Confirmado** | Ya es el stack desplegado; sin cambio |
| **BFF: Route Handlers de Next.js** | **Confirmado** | Documentación instalada verificada (AGENTS.md): soportan POST y **no se cachean por defecto** (`dist/docs/01-app/01-getting-started/15-route-handlers.md`) ⇒ ejecución a request time, correcto para guardianes. Coste operativo mínimo (sin servidor aparte) |
| Supabase Auth + Postgres + RLS (condicionado) | **Confirmado condicionado** | specs/009 ya fija RLS owner-only; se adopta **solo si** se aprueban cuentas/sincronización (PRD §8). No hay alternativa más simple que cumpla RLS + ARCO |
| **No FastAPI/backend propio** | **Confirmado** | Constitución X + ADR-0002: ningún requisito real que Next+Supabase no cubra (validado en 0002) |
| IA detrás de `AssistantProvider`/`BluAssistant` | **Confirmado** | Contrato existente (specs/002); el BFF es una implementación más del proveedor, no un nuevo sistema. Prohibido multiagente (constitución X) |
| **Voz por turnos** (hablar→transcribir→revisar→guardián→modelo→guardián→texto→leer) | **Confirmado** | specs/015 ya lo fija; voz-a-voz continuo rechazado: dificulta revisión previa de contenido y suma frontera de datos |

**Desafíos considerados y descartados**: tRPC/GraphQL server (añade capa sin necesidad; REST JSON
suficiente para 1–2 endpoints); WebSockets para chat (sin necesidad: turnos por request);
edge colocation de LLM (proveedor aún no seleccionado; decisión aplazada a post-aprobación).

## Flujo de datos aprobado (diseño)

```
Navegador (sin claves, sin llamadas a proveedores)
  → POST /api/assistant  (BFF, no cacheado, verificado en docs instaladas)
      → auth (sesión specs/010) + límites (cuota/length/timeout)
      → guardián de entrada (specs/002: crisis/clínica/boundary ⇒ sin llamar proveedor)
      → AssistantProvider remoto (timeout 10 s; clave solo en servidor)
      → guardián de salida (afirmaciones prohibidas ⇒ reemplazo + evento)
  → respuesta + metadatos; sin persistencia por defecto (specs/015)
  ↘ cuando esté aprobado: Supabase Auth/Postgres + RLS (specs/009) para cuentas/sincronización
```

## Decisiones de dependencia (resuelven inconsistencias detectadas)

1. **Sesiones en memoria vs cliente Supabase**: el SDK de Supabase persiste sesiones en
   `localStorage` por defecto; specs/010 exige memoria. **Decisión**: adaptador de almacenamiento
   personalizado en el cliente (documentado como tarea de specs/010 al implementar).
2. **Telemetría `sessionHash`**: se calcula sobre el `jti` de sesión (specs/010), nunca sobre
   `userId` (specs/011). Consistente ✓.
3. **Rol `reviewer`**: coincide entre RLS (009) y flujo de evidencia (013) ✓; la UI de revisión
   consume el mismo contrato de API.
4. **Rate limiting en BFF**: antes del guardián (rechazo barato) y después (cuota de llamadas a
   proveedor por sesión, specs/015) — dos capas explícitas.
5. **Errores del proveedor**: el BFF nunca propaga stack/headers del proveedor; mapea a códigos
   propios (specs/016) sin filtrar detalles internos.

## Hechos verificados con fuente (revisión 2026-11-04)

- Gemini API free tier: contenido usado para mejorar productos + posible revisión humana
  ([términos](https://ai.google.dev/gemini-api/terms); verificado). **No apto para datos reales.**
- OpenAI API: por uso, sin cuota gratuita recurrente ([precios](https://openai.com/api/pricing/);
  no re-verificado en esta sesión — se re-verifica al seleccionar).
- AWS Free Tier / Bedrock: créditos temporales ([free tier](https://aws.amazon.com/free/);
  no re-verificado en esta sesión).
- NVIDIA endpoints: **no verificado** (sin evidencia pública clara revisada).
- Vercel Hobby: uso personal no comercial; sin crédito de IA ([planes](https://vercel.com/pricing);
  no re-verificado en esta sesión).
- Next.js Route Handlers: POST no cacheado por defecto (docs instaladas, verificado arriba).

## Consecuencias

- Nada se construye ahora: el gate PRD §8 sigue bloqueando BFF con proveedor y Supabase.
- Este ADR + specs/009–016 forman el paquete ejecutable del día 1 post-aprobación.
- Toda prueba de proveedor futura usa mocks y datos sintéticos; nunca datos reales.
