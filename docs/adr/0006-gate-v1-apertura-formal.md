# ADR-0006 — Gate V1: apertura formal y condicionada (cuentas, sincronización y RLS)

**Estado:** apertura formal del gate (construcción habilitada; activación en producción condicionada a firmas) · **Fecha:** 2026-11-05
**Relaciona:** PRD §8 (enmienda V1, mismo día) · ADR-0001/0002/0004 · specs/009–013 · THREAT_MODEL (anexo V1) · EIPD-V1 (borrador)

## Contexto

El dueño del producto instruyó explícitamente (2026-11-05, «opción A») levantar el gate V1 con sus
aprobaciones formales. Este ADR registra esa decisión y la acota. ADR-0002 fijó la regla
preparatoria (Supabase+RLS por defecto, condicionada) y ADR-0004 confirmó la arquitectura objetivo;
hoy se abre el gate **por fases**, manteniendo la trazabilidad que exige la constitución (II, VI, VII).

**Qué NO es este ADR:** no es la EIPD, no es opinión jurídica, no crea recursos cloud, no activa
facturación ni despliega backend. Es el acto formal de producto que habilita la construcción.

## Qué se aprueba hoy

1. **Construcción del código V1** (sin crear recursos): clientes Supabase, migraciones SQL con
   políticas RLS owner-only (specs/009), sesiones (010), telemetría de lista blanca sin PII (011),
   cuentas con correo verificado (012) y registro de evidencia con revisión humana (013).
   Activación exclusivamente por configuración (`SUPABASE_*`), mismo patrón que ADR-0005:
   sin variables, el comportamiento es el local actual.
2. **Primera vertical de implementación:** specs/012 (cuentas + correo verificado + sesión),
   porque desbloquea #4 (aislamiento) y #5 (cierre/caducidad).
3. **EIPD-V1 como borrador operativo** (docs/EIPD-V1-cuentas-sincronizacion.md): inventario de
   datos, mitigaciones y procedimiento ARCO; base para la revisión jurídica.
4. **Actualización del modelo de amenazas**: el anexo V1 existente pasa de «diseño no autorizado»
   a «superficie activa en desarrollo», con pentest ligero pre-lanzamiento como condición.

## Activación en producción — condiciones que siguen exigiendo firma humana

| # | Condición (PRD §8) | Responsable de la firma | Estado |
|---|---|---|---|
| C1 | EIPD-V1 aprobada y registrada | Dueño del producto + asesoría jurídica (Chile, Ley 21.719) | **Pendiente** (borrador listo) |
| C2 | Contrato de tratamiento/encargo con el proveedor gestionado (Supabase u homólogo), región documentada | Dueño del producto + jurídico | Pendiente |
| C3 | Revisión de seguridad: pentest ligero + matriz de aislamiento RLS en CI verde | Seguridad (checklist specs/009) | Pendiente (CI preparado) |
| C4 | Revisión ética/científica del piloto (BLU-1601, protocolo 8 semanas) | Revisión ética | Pendiente (no bloquea cuentas; bloquea piloto) |
| C5 | Procedimiento ARCO probado de extremo a extremo (export + borrado en servidor) | Producto + jurídico | Pendiente (diseño en EIPD §7) |

Regla dura: **sin C1–C3 firmadas, ningún despliegue V1 a producción con datos reales.** El código
puede construirse, probarse con datos sintéticos y quedar apagado por configuración.

## Alcance autorizado (y límites)

- **Dentro:** cuentas con correo verificado; sesiones con caducidad; aislamiento owner-only vía RLS;
  telemetría de lista blanca sin PII; registro de evidencia con aprobación humana; exportación/borrado
  extendido a servidor (ARCO). Supabase como proveedor gestionado por defecto (ADR-0002).
- **Fuera (siguen gated):** memoria conversacional persistente (#43, V2), RAG semántico (#58, V2),
  voz en la nube (#82, specs/015), analítica de terceros, producción comercial, PWA push.
- **Prohibido:** crear proyectos/instancias cloud desde este repositorio sin credenciales del dueño;
  `service_role` en cliente (THREAT_MODEL); FastAPI u otro backend propio (ADR-0002/0004).

## Riesgos y mitigaciones (resumen; detalle en THREAT_MODEL + EIPD §6)

| Riesgo nuevo | Mitigación obligatoria |
|---|---|
| Exposición de datos entre personas | RLS owner-only (specs/009) + matriz de aislamiento en CI |
| Secuestro de sesión | Tokens en memoria, caducidad, rotación (010/012) |
| Enumeración/abuso de registro | Rate limiting en edge + verificación de correo (012) |
| Tercero de confianza (Supabase) | Contrato C2 + región documentada + cifrado en reposo |
| Fuga de PII en telemetría | Lista blanca + filtrado en borde (011) |

## Firmas

- **Producto:** Cristóbal Herrera — apertura del gate y alcance (2026-11-05).
- **Jurídica/EIPD:** pendiente (C1/C2/C5).
- **Seguridad:** pendiente (C3).
- **Ética:** pendiente (C4, requerido antes del piloto, no antes de cuentas).
