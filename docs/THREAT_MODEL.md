# Blu — Modelo de amenazas STRIDE

**Versión:** 0.1 · **Alcance:** prototipo local y riesgos de la arquitectura futura.

## Activos y límites de confianza

- Preferencias y check-ins de bienestar (datos personales potencialmente sensibles).
- Consentimiento, catálogo de hábitos, historial de adaptaciones y referencias científicas.
- Frontera navegador ↔ almacenamiento local; futura frontera cliente ↔ API ↔ base de datos ↔ proveedor LLM.
- Texto elegido para síntesis de voz Azure y audio temporal generado.

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

## Riesgos específicos del chat remoto (2026-11-05, ADR-0005)

- **Divulgación a proveedor LLM:** los mensajes del turno salen del servidor de Blu hacia el
  proveedor configurado (Groq/OpenAI/Azure). Mitigaciones implementadas: guardián de entrada
  (crisis/clínica/inyección no invocan al proveedor), system prompt que prohíbe pedir datos
  personales, texto máx. 2000 caracteres, máx. 10 mensajes por request, **sin persistencia ni
  logs de contenido**, disclosure dinámico que pide no compartir datos personales o de salud.
  Condición para piloto real: verificar términos vigentes del proveedor (entrenamiento,
  retención, revisión humana) antes de configurar las variables.
- **Clave de API y abuso de cuota:** `BLU_LLM_API_KEY` solo en servidor (jamás `NEXT_PUBLIC_*`);
  errores mapeados sin detalles internos ni nombre del modelo (test de contrato); rate limit
  20/min + 200/día por IP; `BLU_API_TOKEN` opcional para piloto cerrado; timeout 10 s sin
  reintentos; degradación a reglas locales ante fallo.
- **Salida insegura del modelo:** `validateOutput` reemplaza afirmaciones prohibidas antes de
  responder (test con proveedor fake); límites no clínicos y de crisis heredados de specs/002.
- **Dependencia de un tercero (cuota/cambios de condiciones):** el proveedor es sustituible por
  configuración sin cambio de código; ninguna cuota gratuita se promete como producción.

## Riesgos específicos de Azure TTS opcional

- **Divulgación:** una respuesta elegida se envía a Microsoft después de activar la voz y pulsar
  «Escuchar». Mitigar con aviso previo, activación por sesión, no persistencia/logs de Blu,
  texto máximo de 500 caracteres y voz local disponible. El aviso no sustituye la revisión de
  privacidad/proveedor de PRD §8.
- **Uso/costo no autorizado:** un endpoint público puede recibir abuso o agotar la cuota. La
  ruta requiere banderas server-side, clave privada, recurso Azure verificado manualmente como
  F0, límite de longitud, rate limit y timeout. La bandera `AZURE_SPEECH_F0_CONFIRMED` es una
  confirmación operativa, no una verificación técnica del nivel de facturación; revisar cuota
  y consumo en Azure. El rate limit en memoria es una defensa adicional y best-effort (puede
  reiniciarse entre instancias); no sustituye la cuota F0 del proveedor.
- **Falsificación/interferencia:** el usuario controla el texto recibido; escapar XML antes de
  construir SSML, aceptar solo JSON de tamaño limitado y no permitir que el cliente elija URL,
  región, locale, voz ni cabeceras del proveedor. Región, locale y voz se leen de configuración
  server-side con validación de formato y compatibilidad locale/voz.
- **Disponibilidad:** cuotas, red o voz pueden fallar. No degradar en silencio; mantener texto
  completo, mostrar error y permitir volver explícitamente a voz local.

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

Este anexo **no modifica el alcance del MVP**. Con la apertura formal del gate V1 (ADR-0006,
2026-11-05) pasa a ser la superficie activa en desarrollo: la construcción del código está
habilitada (activación por configuración, sin recursos creados desde el repo) y la activación en
producción con datos reales queda condicionada a las firmas C1–C3/C5 de ADR-0006 (EIPD, contrato
con proveedor, pentest ligero, ARCO probado).
