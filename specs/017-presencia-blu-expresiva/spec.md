# Spec de diseño: Presencia expresiva y animación accesible de Blu (UX-07, BLU-1101)

**Estado:** implementada (2026-11-05) · **Issue:** #95 · **Fase:** MVP
**Restricciones:** cero dependencias nuevas; ilustración vectorial original; CSS únicamente; recursos locales;
sin telemetría ni red. Decorativo: la información y las acciones nunca dependen de la animación.

## Tabla estado → evento real → representación → equivalente

| Estado | Disparador verificable (solo eventos reales) | Representación visual (≤800 ms, sin bucle) | Texto/feedback equivalente |
|---|---|---|---|
| `idle` | Ausencia de cualquier evento; estado inicial y de reposo | Pose neutra, mirada al frente | — |
| `welcome` | Primera bienvenida del chat (montaje con saludo inicial) | Gesto de saludo: inclinación amable + ojos abiertos | El saludo escrito ya mostrado en la burbuja |
| `responding` | Mientras la petición al BFF está realmente en curso | Indicador de actividad: tres puntos suaves (solo durante la espera real) | «Blu está pensando…» en `role="status"` visible junto al chat |
| `acknowledge` | Respuesta del asistente completada **o** check-in marcado | Asentimiento breve: ojos en arco (sonrisa cerrada) | El mensaje de Blu o el estado del check-in ya visibles |
| `pause` | Tras pulsar explícitamente una acción de pausa/descanso | Pose calmada: párpados suaves, cuerpo relajado | El texto de la pausa elegida |
| `unavailable` | Fallo real: BFF caído (modo local honesto) o error del asistente | Pose de disculpa: ceja leve e inclinación | El aviso honesto de modo local ya existente |

**Invariantes:**
1. No existe estado `listening`: Blu no tiene entrada por micrófono en el alcance vigente (ADR-0003).
2. No se infieren emociones, adherencia, salud ni estado mental: los estados reflejan eventos de
   interfaz, no juicios sobre la persona.
3. Ninguna transición ocurre sin su disparador; sin evento se conserva `idle`.
4. Con `prefers-reduced-motion: reduce`: ninguna animación se ejecuta; cada estado conserva una
   pose estática equivalente y todo el texto/feedback sigue disponible (test obligatorio).
5. Si el recurso animado no carga, el marcador es `aria-hidden` y decorativo: nada de información
   depende de él por construcción.

## Contrato del componente

```ts
type BluPresenceState =
  | "idle" | "welcome" | "responding" | "acknowledge" | "pause" | "unavailable";

<BluPresence state={BluPresenceState} size="sm" />
// sm: 38 px (cabecera del chat) · md: 56 px · lg: 96 px (hero)
```

- Marcador decorativo: `aria-hidden="true"`; el equivalente textual vive siempre en la interfaz.
- Estados desconocidos en runtime degradan a `idle`.

## Integración vigente (BluApp)

- Cabecera del chat: `idle` → `responding` (envío en curso) → `acknowledge` (respuesta) o
  `unavailable` (fallback local honesto); vuelve a `idle`.
- Hero del dashboard: `welcome` en la primera visita tras onboarding; `acknowledge` tras el primer
  check-in del día.
- Indicador textual «Blu está pensando…» con `role="status"` y `aria-live="polite"` mientras
  `responding` (único estado con equivalente textual adicional).

## Plan de pruebas (ejecutado)

1. Componente: clase por estado, `aria-hidden`, tamaños, degradación a `idle`. (`BluPresence.test.tsx`)
2. `prefers-reduced-motion`: matchMedia mocked a `matches: true` → sin clases de animación. (id.)
3. Integración chat: al enviar → «Blu está pensando…» visible y estado `responding`; al responder →
   `acknowledge`; en fallback local → `unavailable`. (`BluApp.test.tsx`)
4. a11y: axe sin regresiones; teclado intacto. (`a11y-axe.test.tsx`)

## Decisiones

- Animación puntos de `responding`: es un indicador de actividad con proceso real en curso (no
  reposo); el loop cesa al terminar la petición. Duración por ciclo ≤ 1200 ms suave; gestos de
  transición ≤ 800 ms (issue UX-07).
- Ilustración original: silueta de gota geométrica en el teal principal, ojos definidos y una
  sonrisa simple sobre un círculo menta. Los rasgos no dependen de una imagen fotográfica ni de
  una forma CSS amorfa. El icono instalable usa un SVG local con la misma composición; el SVG
  inline de `BluPresence` permite expresar estados sin descargar recursos.
- Sistema visual asociado: fondo arena, superficies cálidas, teal de marca y azul secundario
  para datos quedan definidos en un solo bloque de tokens; las acciones de hábito se presentan
  como filas con separadores, no como una pila de tarjetas.
- Transparencia de interfaz: «Versión de prueba» comunica que no es un producto validado; el
  guardado en el navegador y el procesamiento del chat se explican donde corresponden. No se
  oculta que los mensajes se envían al BFF ni que el respaldo usa reglas sencillas.

## Refinamiento visual 2026-11-05

La ilustración fotográfica anterior (gota 3D con audífonos) no compartía estilo ni paleta con la
interfaz plana y cálida. Se sustituye en los usos de producto y el manifest instalable por la
ilustración vectorial original descrita arriba. No se descarga ni se incorpora contenido de
terceros.

La pasada visual también normaliza radios, foco, superficies y estados de botones con los tokens
existentes; reduce cajas repetidas en la lista de hábitos y evita etiquetas técnicas redundantes.
Se preservan los disclosures de prototipo, almacenamiento sin cifrar, envío del chat al servidor
y límites del asistente. Los mensajes de respaldo no describen el chat como «privado en el
navegador» después de que ya se envió al BFF.

La revisión del dashboard encontró que el control de recordatorio y su nota perdían contraste
sobre el hero oscuro. Ahora usan texto claro, contorno visible y un foco dorado de alto contraste;
los controles plegables de revisión y espacio también tienen indicadores alineados y coherentes.

**Pruebas de aceptación añadidas:** geometría SVG del componente, uso del mismo marcador en app y
cuestionario, icono SVG y precache PWA sincronizados, copy de respaldo honesto. La revisión visual
manual se realizó en 390×844 y 1440×900, además de `prefers-reduced-motion`.
