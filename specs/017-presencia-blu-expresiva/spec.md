# Spec de diseño: Presencia expresiva y animación accesible de Blu (UX-07, BLU-1101)

**Estado:** implementada (2026-11-05) · **Issue:** #95 · **Fase:** MVP
**Restricciones:** cero dependencias nuevas; SVG propio inline; CSS únicamente; recursos locales;
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
- Ilustración: SVG inline original (gota azul con ojos y sonrisa, identidad actual de Blu); no se
  copia personaje, paleta ni recursos de otras marcas.
