# Spec de diseño: Contrato del BFF `/api/assistant` (BLU-1006) — DRAFT, gated

**Estado:** **Draft — NO implementar** · **Gate:** PRD §8 + presupuesto aprobado (ADR-0003/0004)
**Stack confirmado:** Route Handler de Next.js (POST, no cacheado — verificado en docs instaladas)

> Contrato listo para implementar con TDD tras aprobaciones. **Cero código ahora.** Toda prueba
> usa mocks y datos sintéticos; nunca datos reales ni proveedores reales en CI.

## Endpoint

```
POST /api/assistant
Autenticación: Bearer session (specs/010) — 401 sin sesión válida
Content-Type: application/json
```

### Request

```ts
interface AssistantRequest {
  messages: Array<{ role: "user" | "assistant"; text: string }>; // máx. 10, texto ≤ 2000 chars c/u
  clientMeta?: { appVersion: string };                          // sin contenido conversacional
}
```

### Response 200

```ts
interface AssistantResponse {
  text: string;                  // validada por el guardián de salida
  meta: {
    providerId: string;          // nunca el nombre del modelo ni clave
    safety: { guardianAction: "none" | "crisis_escalation" | "clinical_referral" | "boundary_response" | "output_replaced" | "provider_error"; latencyMs: number };
  };
}
```

### Errores (códigos propios; sin detalles internos del proveedor)

| Código | Cuándo | Mensaje al cliente |
|---|---|---|
| 400 | esquema inválido / longitud excedida | «Revisa el mensaje e inténtalo de nuevo» |
| 401 | sesión inválida/expirada | «Inicia sesión nuevamente» |
| 429 | cuota de sesión o tasa superada | «Demasiados intentos; espera un momento» |
| 504 | timeout del proveedor (10 s) | «No pude responder a tiempo; ¿lo intentamos de nuevo?» |
| 500 | fallo interno | «Tuve un problema; sigo aquí en modo local» (fallback) |

## Límites (obligatorios en el BFF)

1. Tasa: 20 requests/min por sesión; cuota diaria: 200 por sesión (ajustable por config).
2. Longitud: request JSON ≤ 24 KB; cada texto ≤ 2000 caracteres (rechazo 400).
3. Timeout: 10 s al proveedor; abort signal propagado; sin reintentos automáticos.
4. Presupuesto: contador de costo estimado por sesión; al 80 % aviso, al 100 % corte (alerta a
   operación, specs/011).
5. **Persistencia: ninguna** por defecto; logs estructurados sin contenido (solo categoría,
   códigos, latencia, sessionHash — specs/011).

## Colocación de guardianes (invariante)

```
validate(schema) → rateLimit → guardianDeEntrada
  ├─ riesgo ⇒ respuesta segura (200, guardianAction≠none, proveedor NO invocado)
  └─ limpio ⇒ proveedor → guardianDeSalida
        ├─ prohibida ⇒ reemplazo (200, guardianAction=output_replaced)
        └─ ok ⇒ respuesta 200
```

## Plan de pruebas (al implementar; mocks + datos sintéticos)

1. Entrada clínica/crisis/inyección ⇒ proveedor (fake) nunca invocado; acción correcta.
2. Salida con afirmación prohibida (proveedor fake) ⇒ reemplazo antes de responder.
3. Timeout/límite/caída ⇒ códigos correctos y fallback visible; texto sigue funcionando.
4. Sin sesión ⇒ 401; cuota ⇒ 429; payload > 24 KB ⇒ 400.
5. Contrato de no-persistencia: tras N requests, 0 filas/logs con contenido (assert).
6. Red team de specs/002 ampliado al BFF (set de ataque sintético).

## Matriz de consistencia con specs V1 (revisión 2026-11-04)

| Decisión | specs | Estado |
|---|---|---|
| RLS owner-only sin bypass | 009 | ✓ consistente |
| Sesiones memoria + adaptador Supabase | 010 | ⚠ decisión ADR-0004 #1 |
| Telemetría sessionHash desde jti | 010/011 | ✓ |
| Rol reviewer único | 009/013 | ✓ |
| POST no cacheado (Route Handler) | docs instaladas | ✓ verificado |
| Voz por turnos, no continua | 015 | ✓ |

## Desbloqueo

Aprobaciones PRD §8 → selección de proveedor por retención verificada → implementar con la
suite de arriba → piloto cerrado con límites activos.
