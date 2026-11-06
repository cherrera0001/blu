# Dictamen de minimización — exportación de métricas para investigación (BLU-1203)

**Estado:** BORRADOR técnico — pendiente del protocolo de investigación (EPIC-16, #71–74)
y de la firma humana de privacidad (C1–C3/C5, ADR-0006). No autoriza exportaciones reales.
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
2. **k-anonimato mínimo (k=5 por defecto)**: toda celda semana × hábito con menos de k
   participantes se suprime y se cuenta (`suppressedCells`); nunca se publica parcial.
3. **Agregación estricta**: las filas son conteos; no existe en el esquema un campo que
   apunte a una persona.

## Riesgo residual y límites

- Reidentificación indirecta por contexto pequeño: mitigada por k-anonimato, pero una
  celda de 5 participantes con hábitos raros y semana concreta no es anonimato pleno.
  El protocolo (EPIC-16) debe fijar si k=5 basta o si se exige k mayor / supresión por
  combinaciones.
- La minimización aquí dictaminada es técnica, no legal: requiere revisión jurídica y
  de privacidad (Chile y jurisdicciones de despliegue) antes de cualquier export real.
- El acceso a exportaciones debe quedar registrado (quién, cuándo, qué query) cuando
  exista backend V1; hoy no hay frontera de red.
