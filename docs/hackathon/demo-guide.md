# Guion de demo — Blu (hackathon)

> **Estado del guion:** validado contra la aplicación real el 2026-11-05 (recorrido automatizado
> con navegador headless + suite de 304 pruebas en verde). Duración estimada: **4–5 minutos**.
> Nada de lo descrito abajo es un mock: cada paso se ejecutó de punta a punta en
> `npm run dev` (ver `tour.log` y capturas del recorrido).

## Antes de presentar (checklist)

- [ ] App corriendo: `npm ci && npm run dev` (o producción en Vercel).
- [ ] Navegador en ventana de incógnito (estado local limpio) — la experiencia empieza en el welcome.
- [ ] Opcional: proyectar también el móvil (DevTools device toolbar 390×844) para mostrar el diseño responsive.
- [ ] Tener a mano el caso de error: sin este checklist, el flujo feliz dura ~3 min.

## 0. Pitch de 60 segundos (qué es Blu)

"Blu acompaña a personas —pensadas especialmente en adultos que pasan mucho tiempo solos— a
elegir, empezar y sostener **un** hábito pequeño de bienestar, inspirado en los principios de las
zonas azules. No es una app clínica: no diagnostica ni promete longevidad. Su diferencia es el
circuito completo: la persona elige su paso, lo registra sin culpa, revisa su semana con datos
reales y ajusta lo que no funcionó — y Blu aprende de eso **sin juzgarla ni decidir por ella**.
Todo con privacidad local por defecto: los datos viven en su navegador y pueden borrarse en un clic."

## Recorrido (4–5 min)

**1. Bienvenida y límites (0:00–0:30).** La landing presenta a Blu en primera persona y el aviso
honesto: "prototipo de bienestar, no una herramienta clínica… no promete vivir más años".
*Mencionar:* los principios Blue Zones son inspiración, no promesa médica.

**2. Elegir el hábito (0:30–1:00).** "¿Qué te gustaría cuidar?" — elegir 1–3 temas (p. ej.
Movimiento natural + Alimentación consciente), aceptar el aviso de consentimiento (propósito
operativo; opcionales desmarcados por defecto) → «Empezar con lo que elegí». El dashboard muestra
los pasos de hoy y el hero con la presencia de Blu.

**3. Check-in sin culpa (1:00–1:30).** Pulsar «Lo hice» en un hábito: el contador avanza, la
presencia de Blu asiente (gesto `acknowledge`), sin rachas ni castigos. *Mencionar:* "si no lo
hiciste, también está bien: no hay notificación de fracaso".

**4. Pausa con Blu — conversación honesta (1:30–2:15).** En el chat escribir: *"Estoy ocupada
hoy, no sé qué elegir"*. Blu responde con reglas locales (disclosure visible: "no soy IA
generativa") ofreciendo opciones sin asumir. *Si el despliegue tiene `BLU_LLM_*` configurado:*
el disclosure cambia a modo IA remota con el aviso de privacidad — mostrarlo como evidencia de
honestidad del producto. Mientras responde: la presencia muestra "Blu está pensando…".

**5. Revisión semanal sin puntuación clínica (2:15–3:00).** Bajar a «Revisión de tu semana»:
resumen real de los últimos 7 días (días con registros), la frase "es un registro personal, no
una medida de salud". Marcar cómo te sentiste + «Ajustar un hábito» → Guardar.

**6. Adaptación explícita y aprobada por la persona (3:00–3:30).** En «Tus últimos siete días»:
seleccionar el hábito + motivo («Me faltó tiempo») → «Probar más pequeño». Se muestra el cambio
real: *«Elegir una pausa breve para moverte.» → «Hacer una pausa de dos minutos para cambiar de
postura.»* + «Deshacer último ajuste». *Mencionar:* nada cambia sin confirmación; la persona
controla siempre.

**7. Autodiagnóstico + línea base (3:30–4:15).** Abrir «Autodiagnóstico» desde el inicio (o
recargar en incógnito): aviso de consentimiento explícito (datos en el navegador, sin cifrar,
cómo borrar) → cuestionario de 35 preguntas con omisión permitida → resultado: **línea base
experimental** con fórmula visible («¿Cómo se calcula?»), cobertura real (29 de 29) y el límite
honesto: "no es un diagnóstico, no compara con otras personas". Puede revisar respuestas y
recalcular.

**8. Privacidad y cierre (4:15–4:45).** Sección Privacidad: exportar (JSON versionado con todas
las categorías) y «Borrar mis datos» — confirmar y mostrar que la app vuelve al inicio limpio.
*Cierre:* "Eso es Blu: un paso pequeño, elegido por la persona, con evidencia de sus límites y
control total de sus datos."

## Manejo de imprevistos en vivo

- **Sin internet / BFF caído:** el chat degrada a modo local y lo *dice* ("Respondí en modo
  local…"). Es una característica, no un fallo: mostrarla.
- **429 del servidor:** microcopy honesto "el servidor pidió esperar un momento".
- **Almacenamiento no disponible:** el cuestionario lo detecta y lo comunica (no silencia errores).
- **Tiempo corto:** acortar a pasos 1, 3, 6 y 8 (elegir → check-in → adaptar → borrar).

## Qué NO prometer en la demo

- No afirmar mejoras de salud, adherencia comprobada ni longevidad (hipótesis H1 no probada).
- No llamar "agente de IA" al modo local: es honesto decir "reglas deterministas" o "IA remota"
  según lo que esté configurado.
- No mostrar el modo demo con datos sintéticos sin etiquetarlo (este guion usa datos reales
  creados en vivo).
