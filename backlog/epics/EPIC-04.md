# EPIC-06 — Familia y vínculos afectivos

**Objetivo de épica:** fortalecer el tiempo y la calidad de los vínculos cercanos mediante gestos
pequeños y elegidos; nunca reemplaza acompañamiento terapéutico ni manejo de conflictos graves.

---

### BLU-601 — Catálogo de microhábitos de vínculos

**Historia:** Como persona usuaria, quiero ideas pequeñas para conectar con personas importantes, para sostener mis vínculos sin grandes gestos.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-201.
**Gherkin:**
```gherkin
Escenario: Elegir gesto de conexión
  Dado el catálogo del principio familia
  Cuando selecciono "un mensaje breve a alguien importante"
  Entonces queda en mi plan con su versión mínima

Escenario: Contenido invasivo
  Dado un microhábito que exige revelar información personal ajena
  Cuando se valida
  Entonces se rechaza por política de privacidad
```
**Casos:** positivo — gestos variados (presencia, mensajes, escucha). Negativo — rechazo de contenido que presume estructuras familiares específicas o que pida datos de terceros. Límite — versionado.
**Accesibilidad y seguridad:** lenguaje inclusivo sobre formas de familia; sin asumir disponibilidad emocional de terceros.
**Evidencia requerida:** validación de esquema; revisión de inclusividad.
**DoR/DoD:** como BLU-301.

---

### BLU-602 — Check-in de vínculos

**Historia:** Como persona usuaria, quiero registrar si realicé mi gesto de conexión, para observar mis vínculos con amabilidad.
**Prioridad:** P0 · **Tamaño:** S · **Fase:** MVP
**Dependencias:** BLU-601, check-in base.
**Gherkin:**
```gherkin
Escenario: Registrar gesto
  Dado mi plan con "mensaje breve a alguien importante"
  Cuando lo marco hoy
  Entonces queda registrado con fecha local, reversible y persistente
```
**Casos:** estándar de check-in; además: no se pregunta ni registra a quién (privacidad de terceros).
**Accesibilidad y seguridad:** nunca se solicita nombre del tercero.
**Evidencia requerida:** pruebas del registro y de ausencia de campo "persona".
**DoR/DoD:** como BLU-302.

---

### BLU-603 — Contenido educativo de vínculos con trazabilidad

**Historia:** Como persona usuaria, quiero entender el valor de los vínculos con fuentes visibles, para invertir en mis relaciones con convicción.
**Prioridad:** P2 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-601.
**Gherkin:**
```gherkin
Escenario: Contenido con fuente
  Dado un texto sobre conexión social y bienestar
  Entonces la referencia es visible con estado de revisión
  Y no hay promesas causales individuales
```
**Casos:** positivo/negativo/límite: políticas estándar de evidencia; además prohibido sugerir que Blu sustituya vínculos o terapia.
**Evidencia requerida:** pruebas de rotulado; fuentes (p. ej. literatura sobre relaciones sociales y salud) con estado.
**DoR/DoD:** como BLU-303.

---

# EPIC-07 — Comunidad y pertenencia

**Objetivo de épica:** facilitar la participación en grupos y el sentido de pertenencia con pasos
pequeños y voluntarios; nunca exponer datos ni presionar interacción social.

---

### BLU-701 — Catálogo de microhábitos de comunidad

**Historia:** Como persona usuaria, quiero pasos pequeños para sentirme parte de algo, para salir del aislamiento a mi ritmo.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-201.
**Gherkin:**
```gherkin
Escenario: Elegir paso comunitario
  Dado el catálogo del principio comunidad
  Cuando selecciono "asistir a una actividad de mi barrio"
  Entonces queda en mi plan con su versión mínima ("anotar una actividad de interés")

Escenario: Contenido riesgoso
  Dado un microhábito que comparte ubicación o datos con extraños
  Cuando se valida
  Entonces se rechaza por política de privacidad
```
**Casos:** positivo — pasos graduados (observar → participar). Negativo — rechazo de cualquier interacción con datos personales expuestos. Límite — versionado.
**Accesibilidad y seguridad:** respeto a introversión y ritmo propio; sin juicio por "no socializar".
**Evidencia requerida:** validación de esquema; pruebas de política de privacidad en contenido.
**DoR/DoD:** como BLU-301.

---

### BLU-702 — Check-in de comunidad

**Historia:** Como persona usuaria, quiero registrar mi paso comunitario del día o la semana, para valorar mi participación sin compararme.
**Prioridad:** P0 · **Tamaño:** S · **Fase:** MVP
**Dependencias:** BLU-701, check-in base.
**Gherkin:**
```gherkin
Escenario: Registrar participación
  Dado mi plan con "saludar a un vecino"
  Cuando lo marco hoy
  Entonces queda registrado con fecha local, reversible y persistente
```
**Casos:** estándar; nunca se compara con otros usuarios (no hay ranking social).
**Accesibilidad y seguridad:** sin métricas sociales públicas.
**Evidencia requerida:** pruebas del registro.
**DoR/DoD:** como BLU-302.

---

### BLU-703 — Contenido educativo de comunidad con trazabilidad

**Historia:** Como persona usuaria, quiero entender qué aporta la pertenencia con fuentes visibles, para elegir mi nivel de participación.
**Prioridad:** P2 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-701.
**Gherkin:**
```gherkin
Escenario: Contenido con fuente
  Dado un texto sobre pertenencia y bienestar
  Entonces la referencia es visible con estado de revisión
```
**Casos:** estándar de evidencia; prohibido presionar participación con miedo ("el aislamiento te enfermará").
**Evidencia requerida:** pruebas de rotulado; fuentes con estado.
**DoR/DoD:** como BLU-303.

---

# EPIC-08 — Naturaleza y entorno

**Objetivo de épica:** aumentar el contacto con entornos naturales y la atención al entorno con
microhábitos posibles en la ciudad real de cada persona (no exige parques ni campo).

---

### BLU-801 — Catálogo de microhábitos de naturaleza

**Historia:** Como persona usuaria, quiero formas posibles de contacto con la naturaleza en mi entorno, para reconectar sin depender de salidas grandes.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-201.
**Gherkin:**
```gherkin
Escenario: Elegir contacto con entorno
  Dado el catálogo del principio naturaleza
  Cuando selecciono "un momento atento junto a una ventana"
  Entonces queda en mi plan con su versión mínima

Escenario: Contenido excluyente
  Dado un microhábito que exige salir a parques naturales
  Cuando se valida
  Entonces se marca como contextual, no como requisito
```
**Casos:** positivo — opciones urbanas y rurales. Negativo — no asumir acceso a áreas verdes. Límite — versionado.
**Accesibilidad y seguridad:** viables para movilidad reducida y clima urbano.
**Evidencia requerida:** validación de esquema; revisión de inclusividad de entorno.
**DoR/DoD:** como BLU-301.

---

### BLU-802 — Check-in de naturaleza

**Historia:** Como persona usuaria, quiero registrar mi momento de entorno del día, para sostener el hábito con amabilidad.
**Prioridad:** P0 · **Tamaño:** S · **Fase:** MVP
**Dependencias:** BLU-801, check-in base.
**Gherkin:**
```gherkin
Escenario: Registrar momento de entorno
  Dado mi plan con "observar el entorno un minuto"
  Cuando lo marco hoy
  Entonces queda registrado con fecha local, reversible y persistente
```
**Evidencia requerida:** pruebas del registro.
**DoR/DoD:** como BLU-302.

---

### BLU-803 — Contenido educativo de naturaleza con trazabilidad

**Historia:** Como persona usuaria, quiero saber qué se sabe (y qué no) sobre naturaleza y bienestar, con fuentes, para motivarme sin fantasías.
**Prioridad:** P2 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-801.
**Gherkin:**
```gherkin
Escenario: Contenido con fuente
  Dado un texto sobre tiempo en entornos verdes
  Entonces la referencia es visible con estado de revisión
  Y las dosis no se presentan como prescripción médica
```
**Evidencia requerida:** pruebas de rotulado; fuentes con estado.
**DoR/DoD:** como BLU-303.

---

# EPIC-09 — Propósito de vida

**Objetivo de épica:** ayudar a conectar el día a día con lo que cada persona considera significativo,
con microhábitos de reflexión y acción; nunca terapia existencial ni evaluación psicológica.

---

### BLU-901 — Catálogo de microhábitos de propósito

**Historia:** Como persona usuaria, quiero pequeñas prácticas para conectar con lo que me importa, para darle sentido a mis días.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-201.
**Gherkin:**
```gherkin
Escenario: Elegir práctica de propósito
  Dado el catálogo del principio propósito
  Cuando selecciono "nombrar una cosa que hoy me importa"
  Entonces queda en mi plan con su versión mínima

Escenario: Contenido invasivo
  Dado un microhábito que exige definir "el sentido de tu vida"
  Cuando se valida
  Entonces se rechaza por exigencia y se propone versión menor
```
**Casos:** positivo — prácticas abiertas y no religiosas/ideológicas. Negativo — rechazo de contenido que impone valores. Límite — versionado.
**Accesibilidad y seguridad:** respeto a diversidad de valores; sin contenido espiritualizado implícito.
**Evidencia requerida:** validación de esquema; revisión de neutralidad de valores.
**DoR/DoD:** como BLU-301.

---

### BLU-902 — Check-in de propósito

**Historia:** Como persona usuaria, quiero registrar mi práctica de propósito diaria, para observar mi sentido de dirección con amabilidad.
**Prioridad:** P0 · **Tamaño:** S · **Fase:** MVP
**Dependencias:** BLU-901, check-in base.
**Gherkin:**
```gherkin
Escenario: Registrar práctica
  Dado mi plan con "dedicar minutos a algo significativo"
  Cuando lo marco hoy
  Entonces queda registrado con fecha local, reversible y persistente
```
**Evidencia requerida:** pruebas del registro.
**DoR/DoD:** como BLU-302.

---

### BLU-903 — Contenido educativo de propósito con trazabilidad

**Historia:** Como persona usuaria, quiero entender la relación entre propósito y bienestar con fuentes, para explorarlo por decisión propia.
**Prioridad:** P2 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-901.
**Gherkin:**
```gherkin
Escenario: Contenido con fuente
  Dado un texto sobre sentido de vida y salud
  Entonces la referencia es visible con estado de revisión
  Y el texto evita promesas de longevidad individual
```
**Evidencia requerida:** pruebas de rotulado; fuentes con estado.
**DoR/DoD:** como BLU-303.
