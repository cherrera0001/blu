# EPIC-03 — Movimiento natural

**Objetivo de épica:** apoyar la incorporación de movimiento cotidiano no estructurado (caminar,
pausas activas, menossedentarismo) mediante microhábitos elegidos por la persona, con fricción
mínima y sin promesas de salud no demostradas para el individuo.

---

### BLU-301 — Catálogo de microhábitos de movimiento

**Historia:** Como persona usuaria, quiero elegir microhábitos de movimiento posibles para mi día real, para moverme más sin sentir que "hago ejercicio".
**Valor/contexto:** el catálogo convierte el principio en acciones concretas y pequeñas (versión base + versión mínima), ej. "pausa de dos minutos para cambiar de postura". Contenido marcado como inspiración no validada clínicamente.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-201 (convenciones de contenido versionado).
**Gherkin:**
```gherkin
Escenario: Elegir un microhábito de movimiento
  Dado el catálogo del principio movimiento
  Cuando selecciono "subir escaleras cuando pueda"
  Entonces queda en mi plan con su versión mínima definida

Escenario: Catálogo inválido
  Dado un microhábito sin versión mínima
  Cuando se valida el contenido
  Entonces se rechaza con error de contenido visible
```
**Casos:** positivo — catálogo válido con 3–8 opciones. Negativo — acciones ambiguas ("haz más ejercicio") rechazadas en revisión. Límite — versionado: cambios de texto crean versión nueva sin alterar planes históricos.
**Accesibilidad y seguridad:** acciones viables para distintas capacidades (sin asumir movilidad plena); sin lenguaje de exigencia corporal; contenido sin afirmaciones de pérdida de peso.
**Evidencia requerida:** validación de esquema del catálogo; prueba de versionado; revisión de lenguaje inclusivo.
**DoR:** plantilla de microhábito acordada (acción, versión mínima, frecuencia sugerida).
**DoD:** catálogo publicado con pruebas de esquema verdes.

---

### BLU-302 — Check-in de movimiento con fricción mínima

**Historia:** Como persona usuaria, quiero registrar en segundos si hice mi microhábito de movimiento, para mantener un registro honesto sin que sea una carga.
**Valor/contexto:** hereda el check-in diario del prototipo y lo particulariza: registro de la acción concreta (no de "minutos de ejercicio"), desmarcar reversible, fecha local.
**Prioridad:** P0 · **Tamaño:** S · **Fase:** MVP
**Dependencias:** BLU-301, check-in base existente.
**Gherkin:**
```gherkin
Escenario: Marcar y desmarcar
  Dado mi plan con "pausa de dos minutos"
  Cuando marco la acción hoy
  Entonces queda registrada con fecha local
  Y puedo desmarcarla y desaparece del conteo del día

Escenario: Persistencia
  Dado que marqué ayer
  Cuando recargo la app
  Entonces el registro de ayer sigue intacto
```
**Casos:** positivo — marcar/desmarcar/persistir. Negativo — marcar dos veces no duplica. Límite — registros futuros imposibles desde la UI (fecha = hoy).
**Accesibilidad y seguridad:** botón grande, etiquetado, operable con teclado; sin rachas punitivas ni conteos que avergüencen.
**Evidencia requerida:** pruebas del registro del principio; prueba de no duplicación.
**DoR:** convenciones de check-in base estables.
**DoD:** check-in particularizado con pruebas verdes.

---

### BLU-303 — Contenido educativo de movimiento con trazabilidad de evidencia

**Historia:** Como persona usuaria, quiero entender por qué el movimiento cotidiano importa, con fuentes visibles, para aprender sin recibir prescripciones.
**Valor/contexto:** cada afirmación educativa enlaza su fuente (OMS, guías) con estado de revisión; si no hay fuente aprobada, se rotula "sin evidencia verificada". Prepara EPIC-13.
**Prioridad:** P2 · **Tamaño:** M · **Fase:** MVP (contenido fijo), V1 (vinculado a registro de evidencia)
**Dependencias:** BLU-301.
**Gherkin:**
```gherkin
Escenario: Ver fuente de una afirmación
  Dado un texto sobre sedentarismo
  Cuando abro su referencia
  Entonces veo fuente, año y estado de revisión ("verificada" o "pendiente")

Escenario: Afirmación sin fuente
  Dado un beneficio sin evidencia aprobada
  Cuando se publica el contenido
  Entonces lleva rotulo visible "sin evidencia verificada"
```
**Casos:** positivo — referencia completa visible. Negativo — jamás lenguaje causal individual ("esto curará/preventirá"). Límite — contenido desactualizado se retira con fecha.
**Accesibilidad y seguridad:** lectura en lenguaje claro; enlaces accesibles; sin cookies de terceros en referencias.
**Evidencia requerida:** pruebas de renderizado del rotulo según estado; lista de fuentes en repo.
**DoR:** registro mínimo de fuentes creado.
**DoD:** contenido publicado con trazabilidad y pruebas verdes.

---

# EPIC-04 — Alimentación consciente

**Objetivo de épica:** fomentar atención y disfrute en la alimentación cotidiana (no dietas, no
peso/calorías) mediante microhábitos de presencia y variedad, sin recomendación nutricional
individualizada.

---

### BLU-401 — Catálogo de microhábitos de alimentación consciente

**Historia:** Como persona usuaria, quiero microhábitos alimentarios sin reglas rígidas, para relacionarme mejor con la comida sin culpa.
**Valor/contexto:** ejemplos: "una respiración antes de comer", "una comida al día sin pantallas", "agregar una verdura a una comida". Prohibido: recetas de dieta, conteo calórico, ayunos extremos.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-201.
**Gherkin:**
```gherkin
Escenario: Elegir microhábito alimentario
  Dado el catálogo del principio alimentación
  Cuando selecciono "una comida sin pantallas"
  Entonces queda en mi plan con su versión mínima

Escenario: Contenido prohibido
  Dado un microhábito que sugiere contar calorías
  Cuando se valida el contenido
  Entonces se rechaza por política editorial
```
**Casos:** positivo — opciones variadas e inclusivas (considerando restricciones y culturas alimentarias sin prescribir). Negativo — lenguaje de "trampa/cheat" o culpa rechazado. Límite — versionado como en BLU-301.
**Accesibilidad y seguridad:** sin promesas de peso; aviso de que Blu no da orientación nutricional individual.
**Evidencia requerida:** validación de esquema; pruebas de política editorial automatizadas (lista de términos prohibidos).
**DoR:** política editorial de alimentación aprobada.
**DoD:** catálogo publicado con pruebas verdes.

---

### BLU-402 — Check-in de alimentación consciente

**Historia:** Como persona usuaria, quiero registrar mi microhábito alimentario del día de forma rápida, para sostener la constancia sin obsesión.
**Prioridad:** P0 · **Tamaño:** S · **Fase:** MVP
**Dependencias:** BLU-401, check-in base.
**Gherkin:**
```gherkin
Escenario: Registrar sin obsesión
  Dado mi plan con "respiración antes de comer"
  Cuando marco la acción hoy
  Entonces queda registrada con fecha local y es reversible
  Y el resumen semanal muestra el conteo sin juicio
```
**Casos:** positivo — marcar/desmarcar/persistir. Negativo — nunca se muestran "días malos". Límite — un check-in por microhábito por día.
**Accesibilidad y seguridad:** mismas convenciones que BLU-302; copy neutro sobre comida.
**Evidencia requerida:** pruebas del registro; revisión de copy no culpabilizador.
**DoR:** BLU-301/302 aceptadas.
**DoD:** implementado con pruebas verdes.

---

### BLU-403 — Contenido educativo de alimentación con trazabilidad

**Historia:** Como persona usuaria, quiero leer por qué la alimentación consciente puede aportar, con fuentes, para decidir informada sin recibir una dieta.
**Prioridad:** P2 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-401, registro mínimo de fuentes.
**Gherkin:**
```gherkin
Escenario: Afirmación con fuente verificada
  Dado un texto sobre comer sin distracciones
  Cuando abro su referencia
  Entonces veo fuente, año y estado de revisión

Escenario: Sin evidencia aprobada
  Dado un beneficio no verificado
  Entonces lleva rotulo "sin evidencia verificada"
```
**Casos:** positivo/negativo/límite: iguales políticas que BLU-303, más prohibición explícita de afirmaciones sobre peso.
**Accesibilidad y seguridad:** lenguaje no moralizador sobre alimentos.
**Evidencia requerida:** pruebas de rotulado; lista de fuentes (p. ej. guías alimentarias OMS/FAO) con estado.
**DoR/DoD:** como BLU-303.

---

# EPIC-05 — Descanso y gestión del estrés

**Objetivo de épica:** apoyar hábitos de descanso (sueño, pausas, calma) con microhábitos suaves;
nunca manejo clínico del insomnio ni del estrés patológico.

---

### BLU-501 — Catálogo de microhábitos de descanso

**Historia:** Como persona usuaria, quiero microhábitos de descanso realistas, para dormir y pausar mejor sin ambiciones imposibles.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-201.
**Gherkin:**
```gherkin
Escenario: Elegir microhábito de descanso
  Dado el catálogo del principio descanso
  Cuando selecciono "apagar pantallas 20 minutos antes de dormir"
  Entonces queda en mi plan con su versión mínima ("5 minutos de pantallas fuera")

Escenario: Límite clínico
  Dado un contenido que sugiere tratamiento para insomnio
  Cuando se valida
  Entonces se rechaza y se deriva a profesional de salud
```
**Casos:** positivo — catálogo con pausas diurnas y rutinas nocturnas. Negativo — rechazo de contenido clínico (manejo de insomnio/ansiedad). Límite — versionado.
**Accesibilidad y seguridad:** turnos laborales atípicos considerados en ejemplos; sin recomendaciones de medicación/suplementos (melatonina etc. prohibida).
**Evidencia requerida:** validación de esquema; pruebas de política editorial (términos clínicos bloqueados).
**DoR/DoD:** como BLU-301/401.

---

### BLU-502 — Check-in de descanso

**Historia:** Como persona usuaria, quiero registrar mi microhábito de descanso diario, para observar mi ritmo sin presión.
**Prioridad:** P0 · **Tamaño:** S · **Fase:** MVP
**Dependencias:** BLU-501, check-in base.
**Gherkin:**
```gherkin
Escenario: Registrar descanso
  Dado mi plan con "pausa de calma de 1 minuto"
  Cuando lo marco hoy
  Entonces queda registrado con fecha local, reversible y persistente
```
**Casos:** positivo/negativo/límite: convenciones estándar de check-in; además: nunca se interpreta un día sin registro como "problema de sueño".
**Accesibilidad y seguridad:** copy calmado; sin alarmismo sobre salud.
**Evidencia requerida:** pruebas del registro.
**DoR/DoD:** como BLU-302/402.

---

### BLU-503 — Contenido educativo de descanso con trazabilidad y derivación

**Historia:** Como persona usuaria, quiero entender qué ayuda al descanso cotidiano y saber cuándo consultar a un profesional, para cuidarme sin automedicarme.
**Prioridad:** P2 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-501.
**Gherkin:**
```gherkin
Escenario: Contenido con fuente y derivación
  Dado un texto sobre higiene del sueño con referencia verificada
  Entonces la referencia es visible
  Y el texto incluye "si tu dificultad persiste, consulta a un profesional"

Escenario: Contenido prohibido
  Dado un texto que recomienda melatonina
  Cuando se valida
  Entonces se rechaza por política de seguridad
```
**Casos:** positivo — educación con fuente y derivación. Negativo — prohibido sugerir fármacos/suplementos o terapia. Límite — rotulado "sin evidencia verificada" cuando aplique.
**Accesibilidad y seguridad:** mensaje de derivación clínica prominente en este principio.
**Evidencia requerida:** pruebas de rotulado y de política; revisión del copy de derivación.
**DoR/DoD:** como BLU-303/403.
