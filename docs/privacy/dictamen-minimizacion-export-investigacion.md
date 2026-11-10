# Dictamen de minimización — exportación de métricas para investigación (BLU-1203)

**Estado:** READY FOR HUMAN REVIEW — técnica completa (gate operativo, trazabilidad,
cruce entre exportaciones, consentimiento revocable y fail-closed); pendiente del
protocolo de investigación (EPIC-16, #71–74), las firmas de privacidad (C1–C3/C5,
ADR-0006) y la firma humana de este dictamen. No autoriza exportaciones reales.
**Fecha:** 2026-11-06 · **Mecanismo:** `src/lib/research/export.ts`

## Qué incluye el dataset (y por qué)

| Campo | Granularidad | Justificación |
|---|---|---|
| `week` (YYYY-Www) | semana | suficiente para adherencia semanal; sin hora ni fecha exacta |
| `habitId` | catálogo cerrado | ya es dato no sensible (categoría, no conducta narrativa) |
| `participants`, `checkInsDone/Total`, `feedbackNotUseful` | conteos agregados | respuesta a la pregunta de investigación sin eventos individuales |

## Qué NO incluye (exclusiones explícitas)

- Identificadores directos: correo, nombre, RUT, teléfono, IP, dirección, fecha de
  nacimiento, deviceId. Guard automatizado: `assertNoDirectIdentifiers()` rechaza el
  bundle si aparece cualquiera de estas claves (prueba en CI).
- Texto libre de cualquier tipo (conversaciones, notas, retroalimentación narrativa).
- Fechas más finas que la semana, ni zonas horarias.
- `participantKey`: opaco y aleatorio; **no sale** en las filas agregadas.

## Protecciones aplicadas

1. **Opt-in por consentimiento «investigacion»**: `buildResearchDataset()` filtra con un
   callback de consentimiento; sin él la persona queda fuera (`excludedNoConsent`).
   El callback está envuelto en fail-closed: si el origen de consentimiento falla
   (excepción), nadie entra al dataset y nada se rompe (prueba en CI).
2. **Consentimiento revocable en cualquier momento**: retirarlo excluye a la persona
   de exportaciones posteriores, incluso a mitad de la cohorte (prueba en CI).
3. **k-anonimato mínimo (k=5 por defecto)**: toda celda semana × hábito con menos de k
   participantes se suprime y se cuenta (`suppressedCells`); nunca se publica parcial.
4. **Agregación estricta**: las filas son conteos; no existe en el esquema un campo que
   apunte a una persona.
5. **Seudónimo ≠ anonimato**: `participantKey` es un seudónimo opaco que facilita la
  recolección del lado cliente; **jamás aparece en las filas exportadas** y no se
  guarda ninguna tabla de enlace persona↔clave en el bundle. Si el vínculo persona↔key
  existiera en algún sistema, la celda dejaría de ser anónima: por eso el dictamen
  exige que ese enlace (si V1 lo necesita para consentimiento) viva con RLS owner-only
  (BLU-104) y nunca en el entorno de investigación.
6. **Gate operativo**: `exportGateStatus()` + `assertResearchExportAllowed()` bloquean
   la exportación en producción sin protocolo aprobado y firmas C1–C3/C5
   (`exportacion_bloqueada: protocolo_investigacion_no_aprobado, firmas_privacidad_pendientes`).
7. **Trazabilidad de accesos**: `createExportAccessLog()` registra actor, fecha, filas
   y celdas suprimidas de cada exportación — metadatos, nunca datos del dataset.
8. **Riesgo de cruce entre exportaciones**: las filas solo se distinguen por
   semana × hábito; fusionar olas no habilita unión a persona (prueba en CI).
   Riesgo residual: dos celdas pequeñas y cercanas podrían inferirse por contexto
   externo; mitigado por k-anonimato y por no publicar datasets intermedios.

## Riesgo residual y límites

- Reidentificación indirecta por contexto pequeño: mitigada por k-anonimato, pero una
  celda de 5 participantes con hábitos raros y semana concreta no es anonimato pleno.
  El protocolo (EPIC-16) debe fijar si k=5 basta o si se exige k mayor / supresión por
  combinaciones.
- La minimización aquí dictaminada es técnica, no legal: requiere revisión jurídica y
  de privacidad (Chile y jurisdicciones de despliegue) antes de cualquier export real.
- El acceso a exportaciones debe quedar registrado (quién, cuándo, qué query) cuando
  exista backend V1; hoy no hay frontera de red.
