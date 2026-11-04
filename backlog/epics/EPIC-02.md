# EPIC-02 — Onboarding y autodiagnóstico inicial

**Objetivo de épica:** convertir la intención de bienestar en un perfil inicial de hábitos mediante
una autoevaluación (no diagnóstico médico), y entregar hasta tres objetivos sugeridos que la
persona puede aceptar, modificar o rechazar. Diseño completo en `docs/onboarding/`.

---

### BLU-201 — Banco de preguntas versionado por principio

**Historia:** Como equipo de producto, queremos un banco de preguntas versionado para los siete principios, para mantener el cuestionario consistente y auditable.
**Valor/contexto:** el cuestionario es contenido crítico: versionarlo como datos (JSON esquematizado) permite revisión científica, traducción y trazabilidad sin tocar código.
**Prioridad:** P0 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** diseño del banco (`docs/onboarding/question-bank.md`).
**Gherkin:**
```gherkin
Escenario: Cargar el banco
  Dado el archivo de preguntas versionado
  Cuando la app lo valida al inicio
  Entonces carga siete principios con al menos cinco preguntas cada uno
  Y rechaza el archivo con error visible si el esquema no es válido

Escenario: Versionado
  Dado una respuesta guardada con la versión 1.2 del banco
  Cuando el banco sube a 1.3
  Entonces el sistema conserva la versión usada en cada evaluación guardada
```
**Casos:** positivo — esquema válido carga. Negativo — JSON corrupto o con principio faltante produce error visible. Límite — pregunta sin alternativas válidas o con escala invertida se detecta en validación.
**Accesibilidad y seguridad:** textos en lenguaje claro; ninguna pregunta pide datos clínicos ni identificadores; validación del esquema sin excepciones silenciosas.
**Evidencia requerida:** pruebas de validación del esquema (casos válido/inválido); prueba de versionado de evaluaciones guardadas.
**DoR:** estructura JSON acordada; revisión de lenguaje no culpabilizador.
**DoD:** banco publicado en `src/data/` o `content/`; validación implementada con pruebas verdes.

---

### BLU-202 — Cuestionario progresivo con guardado y reanudación

**Historia:** Como persona usuaria, quiero responder el autodiagnóstico por partes y retomarlo después, para no sentirme presionado.
**Valor/contexto:** reduce abandono; respeta el ritmo de cada persona. Guardado progresivo local con indicador de avance.
**Prioridad:** P0 · **Tamaño:** L · **Fase:** MVP
**Dependencias:** BLU-201.
**Gherkin:**
```gherkin
Escenario: Reanudar donde quedé
  Dado que respondí 6 de 12 preguntas y cierro la pestaña
  Cuando vuelvo a Blu
  Entonces retomo en la pregunta 7 con mis respuestas previas intactas

Escenario: Omitir una pregunta sensible
  Dado una pregunta marcada como omisible
  Cuando elijo "prefiero no responder"
  Entonces continúo sin respuesta registrada y sin penalización
```
**Casos:** positivo — guardado por pregunta y reanudación. Negativo — respuestas incompletas nunca se interpretan como "cero". Límite — 100% de omisiones produce perfil vacío declarado, no puntuación falsa.
**Accesibilidad y seguridad:** progreso anunciado a tecnologías de apoyo; botón omitir visible siempre que aplique; datos parciales cifrados solo en V1 (MVP: local sin cifrar, aviso vigente).
**Evidencia requerida:** pruebas de guardado parcial y reanudación; prueba de omisión sin efecto en puntuación.
**DoR:** modelo de respuestas definido; wireframes de flujo.
**DoD:** flujo implementado con pruebas verdes; métrica de abandono documentable.

---

### BLU-203 — Ramificación adaptativa según respuestas

**Historia:** Como persona usuaria, quiero que el cuestionario se adapte a mis respuestas, para no perder tiempo en preguntas que no aplican.
**Valor/contexto:** menos fatiga, más relevancia; la ramificación se define por reglas explícitas y auditables (no por modelo opaco).
**Prioridad:** P2 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-201, BLU-202.
**Gherkin:**
```gherkin
Escenario: Salto por respuesta
  Dado que respondo "no aplica" en frecuencia de actividad física
  Cuando continúo
  Entonces se omiten las preguntas de detalle de esa rama y paso a la siguiente sección

Escenario: Regla circular protegida
  Dado una configuración de ramas con ciclo A→B→A
  Cuando se valida el banco
  Entonces se rechaza con error de diseño visible para el equipo
```
**Casos:** positivo — salto según regla. Negativo — respuesta inesperada no rompe el flujo (cae en ruta por defecto). Límite — máximo de preguntas efectivas acotado para evitar cuestionarios interminables.
**Accesibilidad y seguridad:** la persona puede ver cuántas quedan; reglas versionadas junto al banco.
**Evidencia requerida:** pruebas de cada regla de salto; prueba de detección de ciclos; conteo de longitud máxima.
**DoR:** reglas de ramificación documentadas por principio.
**DoD:** motor de ramas implementado con pruebas verdes; reglas cubiertas al 100%.

---

### BLU-204 — Puntuación orientativa por principio (índice experimental)

**Historia:** Como persona usuaria, quiero entender en qué principios estoy fuerte y en cuáles puedo mejorar, para elegir dónde enfocarme.
**Valor/contexto:** entrega una lectura orientativa, rotulada como experimental, sin validez psicométrica reclamada. Documenta cómo se validaría (EPIC-16). Nunca se presenta como diagnóstico.
**Prioridad:** P0 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-201.
**Gherkin:**
```gherkin
Escenario: Puntuación por principio
  Dado un cuestionario completo
  Cuando finalizo
  Entonces veo por cada principio un nivel orientativo (a cuidar / en desarrollo / fortaleza)
  Y un texto que aclara que es una autoevaluación, no un diagnóstico

Escenario: Respuestas omitidas
  Dado principios con preguntas omitidas
  Cuando se calcula
  Entonces el nivel se calcula solo con respondidas y se indica "con menor confianza" si aplica
```
**Casos:** positivo — niveles calculados con reglas publicadas. Negativo — nunca se emite nivel clínico ni comparación con otras personas. Límite — todas omitidas → sin nivel, invitación a rehacer.
**Accesibilidad y seguridad:** reglas de puntuación visibles en documentación; sin ponderaciones opacas; rotulado "experimental" en pantalla.
**Evidencia requerida:** pruebas de cálculo por principio con casos de ejemplo; prueba de confianza reducida con omisiones; documento de validación propuesta.
**DoR:** reglas de nivel aprobadas por el equipo con justificación publicada.
**DoD:** cálculo implementado con pruebas verdes; rotulado experimental visible; doc de validación en repo.

---

### BLU-205 — Resultado: perfil, fortalezas y hasta tres objetivos sugeridos

**Historia:** Como persona usuaria, quiero recibir un resumen comprensible y hasta tres objetivos iniciales que puedo aceptar, modificar o rechazar, para mantener el control de mi plan.
**Valor/contexto:** culminación del onboarding: perfil + fortalezas + oportunidades + plan de microhábitos con explicación. La persona decide siempre.
**Prioridad:** P0 · **Tamaño:** L · **Fase:** MVP
**Dependencias:** BLU-204, catálogo de microhábitos (EPIC-03..09).
**Gherkin:**
```gherkin
Escenario: Aceptar sugerencias
  Dado mi perfil con niveles calculados
  Cuando reviso las sugerencias
  Entonces veo hasta tres objetivos con su explicación en lenguaje simple
  Y puedo aceptar cada uno, modificarlo o rechazarlo

Escenario: Rechazar todo
  Dado las sugerencias presentadas
  Cuando rechazo todas
  Entonces Blu me permite elegir hábitos manualmente como en el flujo actual
```
**Casos:** positivo — aceptar/modificar/rechazar. Negativo — ninguna sugerencia se impone. Límite — perfil vacío no genera sugerencias (flujo manual). Explicación vinculada a respuestas concretas ("mencionaste poco tiempo → versión de dos minutos").
**Accesibilidad y seguridad:** explicaciones legibles; sin presión ni lenguaje de fracaso; decisiones persistidas con fecha.
**Evidencia requerida:** pruebas del flujo completo (perfil→sugerencia→decisión); prueba de flujo manual sin sugerencias; revisión de copy.
**DoR:** plantilla de explicación definida; catálogo de microhábitos disponible.
**DoD:** flujo implementado con pruebas verdes; trazabilidad respuesta→sugerencia documentada.
