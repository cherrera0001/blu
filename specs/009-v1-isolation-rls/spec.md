# Spec de diseño V1: Aislamiento de datos entre personas (BLU-104) — gated

**Estado:** diseño preparatorio · **Fase:** V1 (implementación gated por PRD §8)
**Relaciona:** ADR-0002 (Supabase+RLS por defecto) · THREAT_MODEL.md (suplantación, divulgación)

> Diseño listo para ejecutar tras aprobaciones. **No implementa backend.** Todo acceso cruzado
> queda prohibido por defecto: la autorización vive en la base de datos, jamás solo en el cliente.

## Modelo de propiedad

Toda fila con datos de una persona lleva `owner_id uuid` referenciando `auth.users`.
Tablas V1: `profiles`, `consent_records`, `habit_plans`, `check_ins`, `adaptation_events`,
`reviews`, `goal_decisions`, `evidence_sources` (esta última de solo lectura para usuarios;
escritura solo de revisores).

## Políticas RLS (bosquejo ejecutable)

```sql
alter table habit_plans enable row level security;

create policy "owner_select" on habit_plans
  for select using (owner_id = auth.uid());

create policy "owner_insert" on habit_plans
  for insert with check (owner_id = auth.uid());

create policy "owner_update" on habit_plans
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "no_delete" on habit_plans
  for delete using (false); -- borrado lógico con `deleted_at` + job de purga
```

Reglas transversales:

1. **Sin política de servicio con bypass** para datos personales: los clientes usan solo la
   clave anónima + sesión; `service_role` queda en el servidor para funciones administrativas
   auditadas, sin exponerse al navegador.
2. `evidence_sources`: `select` para usuarios autenticados (catálogo), `insert/update` solo
   para el rol `reviewer` (BLU-1302).
3. Borrado (ARCO): `deleted_at` + purga diferida; el borrado verificable del MVP local (listado
   de claves restantes) se replica como endpoint con el mismo contrato de respuesta.

## Matriz de pruebas de aislamiento (obligatoria en CI)

| Caso | Actor A | Actor B | Acción | Resultado exigible |
|---|---|---|---|---|
| Lectura cruzada | A | B | `select * where id = plan_de_B` | 0 filas |
| Update cruzado | A | B | `update plan_de_B set ...` | 0 filas afectadas |
| Enumeración | A | — | `select` con paginación | solo filas de A |
| Token ajeno | — | B | cliente A usa sesión de B | solo datos de B (nunca de A) |
| Service key en cliente | — | — | inspección de bundle | ausencia de `service_role` |
| Borrado | A | — | borrar cuenta | 0 filas restantes de A tras purga |

## Migración desde el MVP local

1. Importación desde `blu-export-*.json` (formato 1.0.0): cada sección mapea a su tabla.
2. `consent` local migra a `consent_records` con la versión original conservada.
3. Tras importar, el cliente marca el estado local como importado y conserva el borrado local
   como copia de respaldo hasta que la persona confirme sincronización.

## Preguntas para aprobadores (bloquean implementación)

1. ¿RLS auditable por un tercero antes del lanzamiento (pentest ligero)?
2. ¿Retención y purga diferida de borrados (días) conforme al análisis jurídico?
3. ¿Rol `reviewer` gestionado por quién (BLU-1302)?

## Qué desbloquea

BLU-105 (sesiones sobre esta base), BLU-1404 (telemetría sin PII sobre estas mismas tablas).
