# Revisión crítica de diseño — Blu móvil 0.4.x (maduración consciente)

**Fecha:** 2026-11-12 · **Build revisada:** 0.4.2 (estado previo a la ola A) · **Rama:** `feat/mobile-v0.4.2`

> **Límite de esta revisión.** Se hizo sobre el código de las pantallas, los tokens de `theme.ts`, los
> assets del avatar y el contraste calculado. **No** hubo capturas de un dispositivo real ni una grabación de
> una persona mayor usando la app. Las puntuaciones de *Presencia*, *Calidez* y *Avatar & voz* deben
> confirmarse con esa grabación (60–90 s, sin ayuda) antes de pasar a producción.

## Veredicto

**Compañía simulada, con buenos cimientos.** El tono (sin puntuación, «no soy médico», frases de Blu que acompañan
el silencio) es de producto de cuidado. Pero la pantalla Hoy estaba construida como vitrina: marca, avatar
grande y «Escuchar» antes que el día, una estadística en cero que reprocha, y había perdido el mecanismo que hacía
a Blu amable de verdad: **«esto me cuesta → probemos algo más pequeño»**.

## Rúbrica (0–5)

| Eje | 0.4.2 | Tras ola A | Evidencia |
|---|:-:|:-:|---|
| Presencia | 3 | 3 | Avatar 3D de buena calidad con respiración suave, pero solo 2 poses y con significados que no calzan (ver H4). No reacciona cuando marcas. |
| Calidez cromática | 3 | 3 | Azules de cielo: calmos, nada clínicos ni morados. Falta un acento cálido: todo es azul y la celebración es verde de sistema. |
| Claridad de acción | **2** | 4 | Antes, el primer hábito quedaba fuera de pantalla (marca 44 pt + escenario de 280 px + «Escuchar»). Ahora el día viene justo después de Blu. |
| Variación UI con sentido | 3 | 4 | Las variantes existían (soft/secondary/danger), pero «Escuchar» competía con la acción del día. Ahora oír y hablar viven juntos en «Con Blu», cada uno con su rol escrito. |
| Carga cognitiva | 3 | 3 | Hoy tiene 9 bloques. El contador del onboarding estaba duplicado (corregido). |
| Avatar & voz | 3 | 3 | Voz natural con respaldo local y opción «solo voz del teléfono». Las poses restan (H4). |
| Dignidad | 4 | 4 | Sin rachas, sin score, «Sin puntuación», «no soy médico». |
| Continuidad emocional | 3 | 4 | La frase de Blu acompaña el silencio, pero «0 pasos en 0 días» lo castigaba y no existía la salida de «hacerlo más pequeño». Ambos corregidos. |
| Confianza | 3 | 3 | Hay avisos en contexto para el chat y la voz, pero el aviso del onboarding solo habla de almacenamiento local (H5). No se pueden exportar datos ni retirar consentimientos por propósito. |
| Accesibilidad | 3 | 4 | Texto ≥ 14 pt y targets de 56 px. Círculo sin marcar a ~2:1 y pie de versión a ~2,9:1: ambos corregidos. Falta probar con tamaño de fuente del sistema al 200 %. |
| **Media** | **3,0** | **3,5** | Umbral: media < 3,5 → reparar antes de sumar features. **0.4.2 no pasaba.** Tras la ola A queda justo en el umbral, sin ejes ≤ 2. |

## Top 7 hallazgos

### H1 — Bloqueante · Hoy · jerarquía *(corregido en ola A)*
- **Qué falla:** el orden era marca «Blu» (44 pt) → avatar 260 px → «Escuchar» → título «Hoy» → resumen → hábitos. En un teléfono de 6" el primer hábito quedaba bajo el pliegue.
- **Por qué duele:** quien llega cansado ve un póster, no una tarea posible. «No sé qué hacer aquí» es la primera puerta de salida.
- **Contraprueba:** en menos de 5 s, sin hacer scroll, se ve a Blu, su frase y al menos el primer paso del día.
- **Cambio mínimo:** avatar en tamaño medio (170 px), sin marca repetida, y el día justo debajo. ✅
- **Qué NO hacer:** esconder a Blu o volver la pantalla una lista de tareas.

### H2 — Bloqueante · Hoy · se perdió «hacerlo más pequeño» *(corregido en ola A)*
- **Qué falla:** la web permitía «Qué lo hizo difícil → Probar más pequeño → Deshacer» (BLU-1102). La app solo deja marcar o no marcar.
- **Por qué duele:** con baja energía, la única opción era fallar. Sin una salida digna, la app se vuelve un recordatorio de lo que no se pudo.
- **Contraprueba:** cada paso sin marcar ofrece «Se me hace difícil», pregunta el motivo sin juicio y propone una versión menor, siempre reversible.
- **Cambio mínimo:** lógica en `blu-core/adapt` (testeada) y enlace discreto en cada fila. ✅
- **Qué NO hacer:** bajar la exigencia automáticamente o decir «detectamos que no cumples».

### H3 — Alta · Hoy · el cero reprocha *(corregido en ola A)*
- **Qué falla:** «Últimos 7 días: 0 pasos en 0 días» con barras vacías, arriba de los hábitos.
- **Por qué duele:** a alguien que vuelve después de días difíciles, lo primero que le muestra la app es su ausencia.
- **Contraprueba:** «Esta semana aún no hay marcas. Un paso pequeño cuenta, cuando quieras.», debajo del día.
- **Cambio mínimo:** copy condicional en cero, bloque movido abajo y nota «Es un registro tuyo, no una nota». ✅
- **Qué NO hacer:** rachas, «¡no rompas tu racha!» o porcentajes.

### H4 — Alta · Avatar · poses con significado equivocado *(pendiente: requiere arte)*
- **Qué falla:** solo hay 2 rasters 3D. En «esperando» y «descansando» (incluso tras días sin venir), Blu **lee el periódico**. Para celebrar, Blu lleva **casco de obra**.
- **Por qué duele:** quien vuelve tras una ausencia encuentra a Blu ocupado en lo suyo. Celebrar con casco habla de productividad, no de cariño.
- **Contraprueba:** «te esperaba» = Blu mirando a la persona y con los brazos abiertos. «Celebrar» = Blu contento, sin herramientas.
- **Cambio mínimo:** encargar 3 poses 3D del mismo estilo (bienvenida, calma a tu lado, alegría suave). Mientras tanto no hay una alternativa coherente: se mantiene el periódico, que al menos mira a la persona y sonríe.
- **Qué NO hacer:** mezclar las 6 poses planas de 512 px que hay en `assets/` (estilo 2D distinto y `companion` = `happy` byte a byte): un avatar inconsistente hace que la compañía se sienta falsa. Por eso siguen fuera del repo.

### H5 — Alta · Onboarding · el aviso promete más privacidad de la real
- **Qué falla:** «Guardo mis elecciones solo en este dispositivo». Es cierto para el almacenamiento, pero el chat y la voz natural envían texto al servidor. Los avisos en contexto lo dicen; el primer aviso, no.
- **Por qué duele:** si alguien descubre después que su texto salió del teléfono, se rompe la confianza, que es lo más frágil.
- **Contraprueba:** «Tus elecciones se guardan en este teléfono. Si usas el chat o la voz natural, ese texto pasa por el servidor de Blu y no se guarda.»
- **Cambio mínimo:** cambiar el copy **y** subir `CONSENT_VERSION` (requiere decisión de privacidad, ADR-0006).
- **Qué NO hacer:** un muro legal de 3 párrafos en la primera pantalla.

### H6 — Media · Confianza · faltan controles de la web
- **Qué falla:** la web permite exportar datos, ver y retirar consentimientos por propósito, y ver «¿Por qué me lo sugiere?» con fuentes. La app solo permite borrar.
- **Por qué duele:** sin «por qué», Blu parece dar órdenes. Sin exportar o retirar, «tus datos bajo tu control» queda en eslogan.
- **Contraprueba:** cada paso tiene «¿Por qué?» con una nota breve y su fuente. Opciones incluye «Mis datos» con exportar y retirar.
- **Cambio mínimo:** «¿Por qué?» plegable por hábito (`blu-core/habit-education` ya existe).
- **Qué NO hacer:** citas largas o lenguaje clínico.

### H7 — Media · Presencia · Blu no responde cuando marcas
- **Qué falla:** el ánimo de Blu cambia al marcar, pero sin transición visible. Solo hay una respiración constante.
- **Por qué duele:** el momento de «lo hice» es el único refuerzo del día. Si nadie lo nota, se pierde.
- **Contraprueba:** al marcar, Blu hace un gesto breve (≤ 600 ms) y su frase cambia con un fundido. Se respeta «reducir movimiento».
- **Cambio mínimo:** animar el cambio de `companion.line` y un pequeño salto del avatar, con `AccessibilityInfo.isReduceMotionEnabled`.
- **Qué NO hacer:** confeti, sonidos de logro o puntos.

## Lo que la app perdió respecto de la web

| Capacidad web | Móvil | Ola | Nota |
|---|:-:|:-:|---|
| Probar más pequeño + motivo + deshacer (BLU-1102) | ✅ ola A | A | `blu-core/adapt` |
| «¿Por qué me lo sugiere?» + trazabilidad (BLU-1304) | ❌ | A | Confianza; datos ya en `blu-core` |
| Exportar datos / retirar consentimiento por propósito | ❌ (solo borrar) | A | Confianza y ARCO |
| Revisión semanal: «¿cómo te sentiste?» → mantener o ajustar (BLU-1202) | ❌ | B | El mejor «volver mañana» sin presión; `review.ts` usa localStorage, hay que moverlo a `blu-core` |
| Otras versiones del catálogo de microhábitos | ❌ | B | `blu-core/habit-catalog` ya existe |
| Recordatorio opt-in, máximo 1 al día (BLU-1502) | ❌ | B | Requiere `expo-notifications` y permiso: ADR antes |
| «¿Te sirvió?» (BLU-1104) | ❌ | B | |
| Plan semanal con intenciones (BLU-1103) | ❌ | C | Riesgo de carga cognitiva: validar antes |
| Cuestionario inicial + objetivos sugeridos + retrato | ❌ | C | En móvil puede ser una barrera de entrada: preferir progresivo |
| Apodo | ❌ | C | |
| Portugués (i18n) | ❌ | C | |
| Origen de la respuesta del chat | ✅ 0.4.3 | — | |
| Lectura en voz alta | ✅ | — | |

**Deuda estructural:** la lógica de `review`, `weekly-plan`, `profile` y `portrait` vive en `src/lib` acoplada a
`window.localStorage`. Cada paridad debe **extraer el dominio puro a `blu-core`** (como `adapt`) y dejar el
almacenamiento como adaptador. Si no, la web y la app volverán a divergir.

## Roadmap de maduración

**A — Confianza emocional (reparar el vínculo).**
1. ✅ Jerarquía de Hoy · ✅ «Se me hace difícil» · ✅ el cero sin reproche · ✅ contraste.
2. «¿Por qué?» por hábito (nota breve + fuente).
3. Copy del aviso inicial y versión de consentimiento (H5, requiere decisión).
4. «Mis datos»: exportar y retirar consentimientos.

**B — Claridad de uso (volver sin presión).**
1. Revisión semanal mínima: 1 pregunta y 2 decisiones, que se pueden saltar.
2. Otras versiones del catálogo dentro de «Se me hace difícil».
3. Recordatorio opt-in (ADR + permiso solo cuando la persona lo pida).
4. Prueba de uso con 3 personas mayores, grabada y sin ayuda.

**C — Belleza de marca.**
1. 3 poses 3D nuevas (H4) y reacción al marcar (H7).
2. Acento cálido en la paleta (p. ej. un ámbar suave para «hecho hoy») validado con contraste.
3. Plan semanal / onboarding progresivo solo si B muestra que hace falta.

## Tentaciones a rechazar
- Rachas, puntos, niveles, insignias, «no rompas tu racha».
- Notificaciones de reenganche («¡Blu te extraña!»): culpa disfrazada de cariño.
- Chat como centro de la app o con respuestas que buscan alargar la conversación.
- Lenguaje o estética clínica (cruces, «paciente», «tratamiento», azul hospital con blanco puro).
- Estética genérica de IA: gradientes morados, sparkles, «AI-powered».
- Dark mode o más pantallas «porque sí» antes de cerrar la ola A.
- Mezclar estilos de avatar para tener más poses.

## Preguntas finales
1. **¿Invita a volver mañana sin presión?** En 0.4.2, **no**: el cero reprochaba y no había salida digna. Tras la ola A, **casi**: falta la revisión semanal suave.
2. **¿El avatar aumenta la compañía?** **Sí en calidad y no en significado.** El 3D es cálido, pero el periódico y el casco cuentan otra historia (H4).
3. **¿«Escuchar» y «Hablar» están diferenciados?** En 0.4.2, **no** (estaban separados y sin rol). Ahora **sí**: juntos en «Con Blu», con «te lee tu día» frente a «conversamos un rato».
4. **¿«Opciones / borrar» está degradado?** **Sí:** está plegado al final y el botón de borrar tiene estilo de peligro con confirmación.
5. **¿Prototipo técnico o producto de cuidado?** Un producto de cuidado con huecos de prototipo: falta el «por qué», el control de datos y poses coherentes.
6. **Las tres cosas de esta semana:** (1) jerarquía de Hoy y (2) «Se me hace difícil», ambas hechas en la ola A; (3) poses de bienvenida y calma para reemplazar el periódico en ausencia (H4).
