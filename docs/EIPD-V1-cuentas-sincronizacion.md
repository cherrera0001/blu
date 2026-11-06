# EIPD-V1 — Evaluación de Impacto en la Protección de Datos: cuentas y sincronización

**Estado:** READY FOR HUMAN REVIEW (firma jurídica pendiente, §10) · **Fecha:** 2026-11-06
**Relaciona:** ADR-0006 (apertura del gate) · PRD §8 · specs/009–013 · THREAT_MODEL (anexo V1)
**Marco de referencia:** Constitución de Blu (II minimización, VI privacidad, VII trazabilidad);
Ley 19.628 de Chile y Ley 21.719 (publicada 2024, en vigencia escalonada) — **requiere validación
de asesoría jurídica antes de activar producción**.

## 1. Alcance y sistema

Blu V1 agrega cuentas de usuario con correo verificado y sincronización cifrada entre
dispositivos, usando Supabase (Postgres gestionado + Auth + RLS). El MVP local-first se conserva:
la app funciona sin cuenta y los datos locales siguen bajo control de la persona (nada cambia sin
consentimiento específico del propósito «sincronización», distinct del consentimiento operativo).

## 2. Roles y responsabilidades

| Rol | Titular |
|---|---|
| Responsable del tratamiento | Dueño del producto (Cristóbal Herrera) — decidir con jurídico si actúa como responsable o encargado según el modelo de alojamiento |
| Encargado/procesador | Supabase Inc. (proveedor gestionado) — sujeto a contrato C2 (ADR-0006) |
| Personas titulares | Usuarias/os de Blu |

## 3. Inventario de datos (mínimo, principio de minimización)

| Categoría | Dato | Origen | Almacén | Acceso | Retención |
|---|---|---|---|---|---|
| Identidad | Correo electrónico (verificado) | La persona | Supabase Auth (server-side) | Sistema + la persona (lectura) | Hasta baja/ solicitud ARCO |
| Autenticación | Hash de contraseña / token de sesión | Sistema | Supabase Auth | Sistema | Caducidad configurada (010) |
| Bienestar (contenido) | Respuestas de cuestionario, hábitos, check-ins, revisión | La persona | Postgres con RLS owner-only (009) | Solo la persona titular | Hasta borrado; purga documentada |
| Consentimientos | Propósito, versión, fecha, actor | Sistema/persona | Postgres (auditoría) | Sistema + revisión jurídica | Permanente (trazabilidad) |
| Telemetría | Lista blanca sin PII: conteos, duraciones, errores (011) | Sistema | Postgres/observabilidad | Equipo producto agregado | 90 días rotativa |
| **Prohibido** | Contenido de conversaciones con IA, datos de salud autodiagnosticados, categorías sensibles | — | **No se almacenan** (ADR-0005) | — | — |

## 4. Necesidad y proporcionalidad

El correo es el único dato de identidad obligatorio (specs/012); todo lo demás es opt-in por
propósito (consent.ts ya implementa diferenciación operativo/mejora/investigación; se agrega
«sincronización» como propósito independiente). No se justifica recopilar nombre, edad, RUT ni
identificadores de salud para el objetivo declarado (acompañamiento de hábitos no clínico).

## 5. Transferencias transfronterizas

Supabase se aloja en regiones cloud fuera de Chile (p. ej., sa-east-1 São Paulo u otra elegida).
Ley 21.719 regula transferencias internacionales: **decisión de región + cláusulas contractuales
pendientes de validación jurídica (C2)**. Acción: elegir región y documentarla en el contrato
antes de producción.

## 6. Riesgos principales y mitigaciones

Detalle completo en THREAT_MODEL (anexo V1). Resumen: exposición entre personas (RLS owner-only +
matriz en CI), secuestro de sesión (tokens en memoria + caducidad), enumeración de cuentas (rate
limit + verificación de correo), fuga en telemetría (lista blanca + filtrado en borde), fuga por
logs (sin contenido; correo fuera de logs). Riesgo residual aceptado provisionalmente: proveedor
gestionado como tercero de confianza, mitigado por C1/C2 y cláusulas de borrado.

## 7. Derechos ARCO (acceso, rectificación, cancelación, oposición)

Procedimiento diseñado (a probar de extremo a extremo antes de producción, condición C5):
1. **Acceso/portabilidad:** la exportación versionada existente (export.ts) se extiende con los
   datos del servidor autenticados; entrega JSON descargable por la persona.
2. **Rectificación:** edición directa en la app de sus datos de bienestar.
3. **Cancelación/borrado:** «borrar todos los datos» (erase.ts) se extiende a servidor: borrado
   lógico + purga documentada (009), con confirmación por correo para cuentas verificadas.
4. **Oposición:** retiro por propósito (consent.ts) y cierre de cuenta con borrado asociado.
Canal de solicitud: correo de contacto del responsable (a definir en producción).

## 8. Medidas de seguridad (resumen)

TLS en tránsito; cifrado en reposo por el proveedor; RLS owner-only en todas las tablas de
contenido; `service_role` jamás en cliente; secretos solo server-side (BLU-1403); sesiones con
caducidad y cierre remoto (010/012); pentest ligero pre-lanzamiento (C3).

## 9. Decisiones pendientes con fecha objetivo

| Decisión | Dueño | Bloquea |
|---|---|---|
| Región Supabase + contrato (C2) | Producto + jurídico | Activación |
| Aprobación formal EIPD (C1) | Producto + jurídico | Activación |
| Pentest ligero + CI de aislamiento (C3) | Seguridad | Activación |
| Correo de contacto ARCO | Producto | Activación |
| Revisión ética piloto (C4) | Revisión ética | Piloto (no cuentas) |

## 10. Hoja de firmas (C1–C3/C5)

Condiciones de ADR-0006 para activar producción con datos reales. Cada firma
requiere evidencia adjunta (constancia, contrato, informe).

- [ ] **C1 — EIPD aprobada.** Firma responsable del tratamiento + validación
      jurídica. Fecha: ____ · Evidencia: ____
- [ ] **C2 — Contrato con proveedor gestionado.** Región elegida y documentada
      (Ley 21.719). Fecha: ____ · Evidencia: ____
- [ ] **C3 — Pentest ligero ejecutado.** Checklist `docs/security/pentest-checklist-c3.md`
      completado contra el proyecto real; matriz de aislamiento ya corre en CI
      (PRs #110 y #119). Fecha: ____ · Evidencia: ____
- [ ] **C5 — Procedimiento ARCO probado.** Funciones `arco_*` ejecutadas de
      extremo a extremo en el proyecto real (plantilla de evidencia: corrida
      `BLU_RLS_LIVE=1` adaptada al proyecto). Fecha: ____ · Evidencia: ____
- [ ] **C4 — Revisión ética del piloto** (BLU-1601). No bloquea cuentas;
      bloquea el reclutamiento. Fecha: ____ · Evidencia: ____

**Nota:** la activación de la exportación de investigación con datos reales
(BLU-1203) exige además el protocolo aprobado y el registro público
(BLU-1601/1602); el gate operativo en código (`exportGateStatus`) lo hace
técnicamente exigible.
