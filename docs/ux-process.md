# Proceso de evaluación crítica UI/UX y rediseño de Blu

**Versión:** 1.0 · **Fecha:** 2026-11-04 · **Herramientas:** rúbrica propia + auditorías axe-core
(automatizadas en CI) + 21st.dev MCP (inspiración y bocetos).

## Principios rectores

1. **La constitución manda sobre el diseño**: tono no clínico y no culpabilizador, privacidad
   visible, accesibilidad WCAG 2.2 AA (constitución I, II, IV, VII).
2. **Stack estable**: Next.js + CSS Modules. Lo que 21st.dev entrega (Tailwind/shadcn) se usa
   como **referencia visual** para implementar en nuestro CSS; nunca como dependencia nueva
   (constitución X).
3. **TDD de UI**: toda mejora entra con prueba (axe, smoke de accesibilidad o componente) y
   `npm test/lint/build/eval:security` verdes antes del commit.

## Rúbrica de evaluación crítica (1–5 por criterio)

| Criterio | Señales de bajo puntaje |
|---|---|
| Jerarquía visual | sin foco claro, títulos que no guían, ruido visual |
| Claridad de acción principal | el siguiente paso no es obvio |
| Feedback de estado | cambios sin confirmación, estados vacíos genéricos |
| Tono y microcopy | culpa, exigencia, lenguaje clínico |
| Accesibilidad | lo que detecte axe + smoke (teclado, nombres, aria-live) |
| Densidad móvil | scroll excesivo, targets < 44px, texto cortado |
| Confianza/privacidad | datos sin explicación visible, consentimientos oscuros |

**Umbral de acción:** cualquier criterio ≤ 3 abre mejora; dos o más ≤ 2 abren ciclo urgente.

## El ciclo (repetible)

1. **Medir**: ejecutar `npm test` (incluye axe + smoke) y recorrer la rúbrica sobre las
   pantallas del MVP.
2. **Contrastar**: `get_inspiration`/`generate` (sketch) en 21st.dev con el contexto de
   diseño de Blu; extraer 2–3 ideas accionables (layout, ritmo, estados vacíos).
3. **Decidir**: elegir mejoras de mayor impacto que pasen el filtro de principios; descartar
   con motivo registrado (ej.: «integra Tailwind → rechazada, constitución X»).
4. **Implementar**: primero la prueba (axe/smoke/componente), luego el cambio en nuestro CSS.
5. **Validar y registrar**: batería completa verde; registrar en el log de ciclos (abajo) y
   en `record_inspiration_feedback`/`record_take_outcome` de 21st cuando aplique.

## Log de ciclos

### Ciclo 1 — 2026-11-04 (validado)
- Medición inicial: axe 0 violaciones serias (4 pantallas); smoke verde.
- Contrastación: inspiración 21st (shadcn genérico ~60% match → referencia limitada);
  boceto generado para crítica visual (no integración).

**Decisión del ciclo 1** (extraído del boceto 21st, proyecto a8523df6, take 1):
- Adoptado: mini barras semanales por día (ya implementadas como `WeekBars` en CSS Modules).
- Adoptado: estado vacío amable en el panel ("tu primer paso puede ser pequeñísimo").
- Adaptado: tokens de paleta arena/azul del boceto → variables CSS propias (`--blu-*` en
  globals.css), sin fuentes remotas ni Tailwind (constitución II/X: sin assets de terceros).
- Rechazado con motivo: fuentes Fraunces/Inter vía CDN (terceros + privacidad) y el componente
  shadcn de referencia (cambio de stack innecesario).

**Validación del ciclo 1**: 202/202 pruebas (incluye axe y smoke), lint 0, build OK,
eval:security 3/3. Outcome registrado en 21st (`record_take_outcome`: adapted).

### Ciclo 2 — 2026-11-04 (implementado; BLU-1501 sigue abierto)
- Medición: recorrido visual en móvil (390 × 844) encontró un dashboard largo sin navegación
  entre sus áreas; el consentimiento inicial se veía distinto al resto de las tarjetas.
- Trazabilidad: la mejora aborda parte de BLU-1501 (issue #67). No se cierra esa historia:
  queda pendiente completar la auditoría manual de teclado, contraste y objetivos táctiles.
- Decisión: agregar navegación persistente por anclas (Hoy, Semana, Progreso, Pausa y
  Privacidad), scroll horizontal contenido en móvil y desplazamiento de destino visible bajo
  la barra; unificar la presentación del bloque de consentimiento y su enlace secundario.
- 21st.dev: el fragmento compartido traía la API key redactada. No se configuró ni guardó
  ninguna clave; se mantiene la decisión de usar referencias visuales sin dependencias externas.
- Implementación: navegación por anclas accesible y ajuste de consentimiento incorporados.
  La auditoría manual completa de BLU-1501 sigue pendiente.

### Ciclo 3 — 2026-11-04 (validado)
- Hallazgo: pese a la navegación nueva, el inicio todavía se percibía como una grilla genérica
  de tarjetas; faltaba una acción principal clara y feedback inmediato del día.
- Decisión: reemplazar el encabezado plano por un hero verde bosque con fecha, mensaje breve,
  acceso directo a los hábitos y un resumen visual del progreso diario. El progreso solo refleja
  check-ins locales de los hábitos elegidos; no es una puntuación de salud ni una racha.
- Accesibilidad y móvil: el resumen usa `progressbar` con nombre y valores anunciables; se
  ampliaron los controles principales a 44 px y se verificó el layout a 390 × 844 sin overflow.
- Privacidad: sin dependencias, fuentes externas, nuevos datos ni llamadas de red.
- TDD: la prueba nueva falla antes del cambio y pasa después; confirma contenido, enlace, rango
  accesible y actualización al registrar un hábito.
- Validación: `npm test` (228/228), `npm run lint`, `npm run build` y
  `npm run eval:security` (3/3) pasan.

### Ciclo 3 — 2026-11-05
- **Medición**: resultado del cuestionario = mayor densidad vertical del MVP en móvil
  (7 tarjetas de principios + hasta 3 sugerencias + acciones).
- **Contraste**: mantener el patrón de tarjetas del boceto 21st (take 1) pero en 2 columnas.
- **Decisión**: grid compacto (`habit-grid.compact`) — misma información 100 % visible,
  padding reducido y columnas automáticas; sin contenido oculto (nada de details aquí: las
  bandas por principio son el valor principal del resultado, BLU-205).
- **Validación**: 225/225 (los tests existentes afirman contenido, no geometría), axe sin
  regresiones, lint 0.

### Ciclo 4 — 2026-11-05 (sistema de diseño, 21st take e0b9da47)
- **Medición**: gap de foco visible (rúbrica accesibilidad); tokens de radio/sombra dispersos.
- **Adoptado del boceto 21st**: escala de radios (4/6/9/14), sombras suaves en capas
  (--shadow-card), anillo de foco por sombra.
- **Implementado**: `:focus-visible` global (outline + ring), estados :active/hover de botones,
  tokens --radius-*, sombra unificada en tarjetas principales. Paleta teal existente respetada
  (los --blu-* quedan solo como acento de gráficos).

### Ciclo 5 — 2026-11-05 (voz local de Blu)
- **Medición**: la lectura usaba la primera voz española local disponible y la prosodia
  predeterminada del dispositivo; no había elección de estilo.
- **Decisión**: ofrecer los perfiles Cálida y Equilibrada y priorizar el idioma configurado,
  manteniendo solo voces españolas declaradas locales. El timbre sigue dependiendo del
  dispositivo; no se promete voz femenina ni calidad uniforme.
- **Implementación y privacidad**: se mantienen `speechSynthesis` y los datos en el navegador;
  no se añaden llamadas de red, voces remotas ni persistencia del perfil.
- **TDD**: pruebas de ambos perfiles y de la prioridad regional; la primera ejecución falló
  antes de implementar los parámetros de prosodia y pasó tras el cambio.
- **Validación**: `npm test` (234 pruebas), `npm run lint`, `npm run build` y
  `npm run eval:security` (3/3) pasan.

### Ciclo 6 — 2026-11-04 (replanteo: Blu como protagonista)
- **Evidencia real** (capturas headless 390×844 de producción y de la rama): la marca era un
  favicon de 35 px; onboarding = plantilla genérica sin presencia de la guía; la conversación
  era un panel lateral; no había voz propia.
- **Diagnóstico con instrumento**: probe `innerWidth` en la página reveló que el "overflow"
  aparente era artefacto del viewport mínimo de Chrome headless (500 px de layout vs 390 de
  imagen) — **no hay overflow real** (scrollWidth == innerWidth). Aun así se aplicaron fixes
  defensivos (overflow-x: clip, width:100%, min-width:0 en hijos flex).
- **Decisiones**: avatar único (`public/blu-avatar.jpg`, cara de Blu que creó el equipo) con
  forma orgánica CSS, presencia en onboarding (intro en primera persona), hero del dashboard,
  burbujas del asistente y aviso del cuestionario; navegación con «Pausa con Blu» primero;
  voz de Blu reescrita en primera persona (saludo propio, respuestas más breves y humanas);
  disclosure honesto del modo: «Respondo con reglas locales en tu navegador: no soy IA
  generativa (todavía)».
- **Validación**: 234/234, axe sin regresiones, lint 0, build OK, eval:security 3/3,
  smoke del BFF OK. Capturas before/after en /tmp/blu-shots.

### Ciclo 7 — 2026-11-05 (hackathon: demo defendible + presencia UX-07)
- **Evidencia real**: recorrido completo con navegador headless (13 capturas + log): el flujo
  intención→acción→check-in→revisión→adaptación→privacidad→cuestionario funciona de punta a
  punta; bug visual del nav móvil (ancla cortada) y bug de datos ("29 de 28 respuestas
  puntuables") detectados en las capturas y corregidos.
- **Implementado**:
  - `BluPresence` (specs/017, issue #95): SVG propio con estados `idle/welcome/responding/
    acknowledge/pause/unavailable` (nunca `listening`), gestos ≤800 ms sin bucles en reposo,
    `prefers-reduced-motion` con pose estática equivalente; decorativo (aria-hidden) con
    equivalente textual ("Blu está pensando…"). Integrado en cabecera del chat y hero
    (acknowledge tras el primer check-in).
  - Fix de datos: `totalScoreable` calculado del banco en scoring; la línea base ya no
    hardcodea 28 (banco real: 29). Tests de regresión con el banco real.
  - Nav móvil: wrap a dos líneas (decisión #91: visible sin gesto oculto).
  - Contraste: `hero-blu-line` a tinta clara sobre el hero oscuro; `.tiny-note` ya quedó en
    `--ink-soft` (~7:1) en el ciclo 6 ⇒ issue #90 resuelto.
  - Microcopy de errores por código (issue #92): `fallbackReason` (network/rate_limited/
    http_error) con aviso honesto distinto ante 429.
- **Validación**: 304/304 tests (32 archivos), lint 0, build OK, eval:security 3/3, audit 0.
  Capturas del recorrido en AppData\Local\Temp\blu-tour.
- **Docs hackathon**: `docs/hackathon/demo-guide.md` (guion 4–5 min validado) y
  `docs/hackathon/evaluation-matrix.md` (matriz PROVISIONAL: sin rúbrica oficial disponible;
  no atribuida a Georgia Tech).

### Ciclo 8 — 2026-11-05 (issues del tablero: #91, #92, #95-completo, #67, #68, CI #65/#44)
- **#91 (UX-05)**: "Tu espacio" y la revisión semanal en `<details>` (revisión colapsada tras
  guardar; form abierto solo si falta responder). Verificado con tests y recorrido headless.
- **#92 (UX-06)**: `fallbackReason` (network/rate_limited/http_error) con microcopy honesto
  distinto ante 429 (tests en conversation y UI).
- **#95 (UX-07) completado**: estado `pause` con disparador real (elegir «Pausa con Blu» en la
  navegación); resto de estados ya venía del ciclo 7.
- **#67 (BLU-1501)**: skip link «Saltar al contenido principal» (WCAG 2.4.1) como primer enlace
  del documento; `main` único movido a `page.tsx` (antes tres `main` anidados).
- **#68 (BLU-1502)**: recordatorios locales opt-in — máximo uno al día, solo si quedan pasos sin
  marcar, a partir de las 9:00, solo con Blu abierta; sin cuenta ni servidor; clave
  `blu.reminders.v1` cubierta por el borrado total. Snapshot estable para useSyncExternalStore.
- **CI (#65/#44)**: workflow con `npm run eval:security` (red team) y `npm audit --audit-level=high`.
- **#63**: `.env.example` con todas las variables server-side documentadas.
- **Validación**: 316/316 tests (33 archivos), lint 0, build OK, eval:security 3/3, audit 0.

### Ciclo 9 — 2026-11-05 (identidad de Blu y consistencia visual)
- **Hallazgo**: el avatar principal era una gota 3D con audífonos y mochila, incompatible con la
  interfaz plana en tonos teal/arena; la misma imagen se repetía en el manifest PWA. La cabecera
  rotulaba «PROTOTIPO LOCAL» y la lista diaria estaba compuesta por tarjetas rectangulares
  repetidas.
- **Decisión**: sustituir la imagen de producto por una ilustración vectorial original, nítida y
  de geometría estable, construida con los colores ya definidos para Blu; conservar los datos
  gráficos en local y sin dependencias externas. Cambiar la lista diaria a filas separadas y
  reforzar la jerarquía de controles con los tokens existentes.
- **Copy y privacidad**: «Versión de prueba» reemplaza la etiqueta técnica redundante, pero se
  mantienen las explicaciones sobre el prototipo, el almacenamiento en el navegador y los límites.
  Los avisos de respaldo ahora aclaran que el mensaje se envió al servidor y no afirman que siga
  siendo privado en el dispositivo.
- **TDD**: pruebas añadidas para geometría SVG, usos de avatar en app y cuestionario, icono/manifest,
  precache y copy del fallback.
- **Validación**: 336/336 tests (37 archivos), lint, build y eval:security 3/3. Revisión visual en
  390×844 y 1440×900: sin desbordamiento horizontal ni recursos de avatar rotos; el modo de
  movimiento reducido desactiva la animación. Se corrigieron y verificaron el contraste del
  recordatorio y su nota sobre el hero oscuro, junto con el anillo de foco de teclado.

### Ciclo 10 — 2026-11-05 (flujo principal y jerarquía visual)
- **Diagnóstico**: las capturas desplegadas mostraban un hero verde sobredimensionado, estado
  vacío con barras/listas repetitivas, historial con scroll anidado, cifras que no seguían el
  período elegido y el enlace de salto siempre visible. La paleta azul/celeste de marca consta en
  el commit `26dfb49`; el verde del hero no forma parte de ella.
- **Implementación**: hero compacto con tokens oficiales; progreso y acciones de hoy más claros;
  idea del día dentro de la conversación; bloques opcionales agrupados; revisión semanal
  colapsada por defecto; actividad consistente con 7/14/30 días, sin gráficos vacíos ni scroll
  interno; skip link oculto fuera de foco y visible con teclado. No se añadió score, dependencia,
  dato ni solicitud de red.
- **TDD**: pruebas añadidas para tokens, enlace de salto, estado vacío, período, idea integrada,
  plan semanal y aparición de la gráfica tras registrar una acción.
- **Validación**: 359/359 pruebas; `npm run build` y `npm run eval:security` pasan; lint sin
  errores (1 warning existente en `BluPresence.tsx`). Revisión local con navegador a 390×844 y
  1440×900, con `prefers-reduced-motion: reduce`: sin overflow horizontal ni errores de consola.
  Se comprobó el foco por Tab y la navegación del enlace a `#contenido-principal`.
- **Diferencia de despliegue**: producción sigue mostrando el hero verde y el skip link visible;
  no se hizo deploy.
