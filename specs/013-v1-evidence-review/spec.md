# Spec de diseño V1: Flujo de revisión humana de evidencia (BLU-1302) — gated

**Estado:** diseño preparatorio · **Fase:** V1 · **Relaciona:** specs/008 (EvidenceSource) · constitución I/V

> Diseño, no implementación. Gobernanza: **ninguna afirmación de salud se publica sin revisión
> humana nominal** (persona con nombre, no rol genérico).

## Rol revisor

- Alta como `role reviewer` (RLS specs/009); asignación por decisión documentada del equipo
  con fecha y responsable (constitución VIII: sin cambios silenciosos).
- Separación de funciones: quien redacta una afirmación no la aprueba.

## Flujo de revisión

1. **Entrada**: contenido propone una afirmación + fuente `pendiente` (specs/008).
2. **Cola de revisión**: vista con campos incompletos resaltados; aprobar exige
   `referenceValue` resoluble + metadatos completos + lectura del texto de la afirmación.
3. **Aprobación**: `status → aprobada` con `reviewedAt` + `reviewer` obligatorios;
   evento `evidence_approved` (telemetría agregada, specs/011).
4. **Retiro**: `status → retirada` con motivo obligatorio; **cascada**: recomendaciones ligadas
   pasan a «en revisión» (ocultas con aviso si no hay otra fuente aprobada).
5. **Historial**: versionado del texto; nunca se edita una fuente aprobada in-place: nueva
   versión + nueva revisión.

## UI de revisión (alcance)

- Solo rol `reviewer`: cola, detalle con checklist de campos, acciones aprobar/retirar con
  confirmación y motivo. Doble confirmación en retiros.
- Trazabilidad visible en contenido: «verificado por {reviewer} el {fecha}» (BLU-1304 la
  vuelve pública).

## Plan de pruebas (al implementar)

1. Aprobar con metadatos incompletos ⇒ rechazo con campos faltantes listados.
2. Retirar una fuente ⇒ recomendaciones ligadas en revisión/ocultas con aviso.
3. Editar fuente aprobada ⇒ crea versión nueva en `pendiente` (nunca in-place).
4. Usuario sin rol ⇒ cola de revisión inaccesible (RLS + UI).
5. Regresión permanente: ningún contenido publicado cita fuente no `aprobada`.

## Preguntas para aprobadores

1. ¿Quiénes son los revisores iniciales y bajo qué determinación institucional?
2. ¿Requiere doble firma la aprobación (dos revisores) por defecto?
