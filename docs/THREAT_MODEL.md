# Blu — Modelo de amenazas STRIDE

**Versión:** 0.1 · **Alcance:** prototipo local y riesgos de la arquitectura futura.

## Activos y límites de confianza

- Preferencias y check-ins de bienestar (datos personales potencialmente sensibles).
- Consentimiento, catálogo de hábitos, historial de adaptaciones y referencias científicas.
- Frontera navegador ↔ almacenamiento local; futura frontera cliente ↔ API ↔ base de datos ↔ proveedor LLM.

## Amenazas

| STRIDE | Riesgo | Controles del prototipo / requisito futuro |
|---|---|---|
| Suplantación | Otra persona usa el navegador compartido. | No hay cuenta ni autenticación; advertir que es local y no privado en dispositivo compartido. Nube requiere autenticación robusta. |
| Manipulación | Estado local editado o JSON corrupto; fuente/recomendación alterada. | Validar estructura y catálogo al leer; error visible y reinicio explícito. Futuro: autorización, integridad editorial, versionado y revisión de cambios. |
| Repudio | No saber quién cambió un plan o aceptó un consentimiento. | El prototipo no ofrece garantía de auditoría. Futuro: historial mínimo, actor, fecha y versión de consentimiento con privacidad y retención definidas. |
| Divulgación | Otra persona con acceso al perfil del navegador lee preferencias; XSS o dependencia maliciosa roba datos. | Minimizar campos, sin red ni texto persistente, dependencias revisadas, CSP y sanitización. `localStorage` no está cifrado: no usar para datos clínicos. |
| Denegación de servicio | Datos excesivos/corruptos bloquean renderizado o persistencia. | Límites de catálogo, validación, errores visibles; futuras cuotas y rate limits de servidor. |
| Elevación de privilegios | Acceso cruzado entre usuarios o modelo actúa fuera de su rol. | No existe backend en MVP. Futuro: autorización por objeto y tenant en servidor, herramientas allowlist, sin acciones autónomas ni credenciales en prompt. |

## Riesgos específicos de IA (solo fase futura)

- Inyección de prompt desde mensajes o documentos recuperados.
- Recomendaciones no sustentadas, consejo clínico, sesgo o falsa seguridad.
- Fuga de datos por proveedor, logging, embeddings o retención no documentada.
- Exceso de agencia, cambios automáticos del plan y confusión sobre identidad/capacidad.

Mitigaciones requeridas antes de habilitar IA: recuperación solo de evidencia aprobada, aislamiento de instrucciones/datos, validación de salida, deny-by-default para consejo clínico, minimización de contexto, contratos y configuración de retención del proveedor, red teaming, trazabilidad versionada, revisión humana y apagado seguro.

## Requisitos transversales pendientes

- Evaluar CSP, cabeceras, dependencias, XSS, accesibilidad y límites de datos.
- No desplegar públicamente con almacenamiento local como si fuera seguro para salud.
- Definir proceso de incidentes, contactos, backups/borrado y evaluación de impacto antes de nube.
- Revisión legal independiente para privacidad, consumo, investigación y regulación sanitaria aplicable.

## Anexo V1 — fronteras de confianza de la arquitectura con cuentas (diseño, gated)

**Estado:** preparatorio (2026-11-04) · **Aplica a:** ADR-0002 · specs 009–013

Nuevas fronteras: `navegador ⇄ API/edge ⇄ Postgres (RLS) ⇄ proveedor de identidad` y
`cliente ⇄ pipeline de telemetría`. Las políticas RLS (specs/009) son la autorización
**definitiva**; el cliente jamás decide acceso. Controles por amenaza STRIDE:

| STRIDE | Control V1 (spec) |
|---|---|
| Suplantación | Magic link de un uso (012); política de sesión con rotación y revocación (010) |
| Manipulación | RLS owner-only + borrado lógico con purga (009); versionado de evidencia (013) |
| Repudio | Consentimientos y aprobaciones con actor, fecha y versión (009/013) |
| Divulgación | Tokens en memoria (010); telemetría de lista blanca con filtrado en borde (011); email cifrado y fuera de logs (012) |
| Denegación de servicio | Cuotas por usuario y rate limiting en edge (009, pregunta pendiente) |
| Elevación de privilegios | `service_role` nunca en cliente; rol `reviewer` separado y asignado documentadamente (009/013) |

Riesgos residuales aceptados provisionalmente: proveedor gestionado (Supabase u homólogo)
como tercero de confianza (mitigación: EIPD + contrato, pregunta en cada spec); pentest ligero
pre-lanzamiento obligatorio (checklist en specs/009, matriz de aislamiento en CI).

Este anexo **no modifica el alcance del MVP** y no autoriza implementación: sigue vigente el
gate de PRD §8.
