# EPIC-14 — Arquitectura, seguridad, observabilidad y DevSecOps

**Objetivo de épica:** sostener el crecimiento de Blu con decisiones documentadas (ADR), CI que
ejecuta la evidencia, secretos bien manejados y observabilidad sin exposición de datos personales.

---

### BLU-1401 — Decisión de arquitectura V1: backend, base de datos y RLS (ADR)

> **Estado (2026-11-04):** Decisión preparatoria documentada en **docs/adr/0002** (regla: Supabase+RLS por defecto al aprobarse PRD §8; FastAPI solo con ADR posterior; ruta de migración vía formato de exportación v1.0.0; preguntas para aprobadores listadas). La implementación sigue **GATED** a las aprobaciones.

**Historia:** Como equipo técnico, queremos decidir con evidencia si V1 requiere FastAPI + PostgreSQL/Supabase, para no sobre-arquitecturar ni subestimar necesidades.
**Valor/contexto:** ADR que compara: (a) seguir local-first, (b) Next.js + Supabase directo, (c) FastAPI aparte. Criterios: necesidad real de cuentas/sincronización, costo operativo, superficie de seguridad, cumplimiento. Salida: decisión + consecuencias + plan de migración.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** MVP (decisión), V1 (implementación)
**Dependencias:** PRD sección 8 (condiciones previas).
**Gherkin:**
```gherkin
Escenario: ADR completo
  Dado la necesidad de decidir backend para V1
  Cuando el equipo evalúa
  Entonces el ADR documenta contexto, opciones con ponderación, decisión, consecuencias y revisión
  Y la decisión exige aprobación de privacidad antes de implementar
```
**Casos:** positivo — decisión trazable. Negativo — no implementar backend sin las aprobaciones del PRD (privacidad, seguridad, jurídico). Límite — revisión del ADR al cambiar un criterio.
**Evidencia requerida:** ADR en `docs/adr/`; registro de aprobaciones.
**DoR:** criterios de evaluación definidos.
**DoD:** ADR mergeado con fecha y responsables.

---

### BLU-1402 — CI en GitHub Actions: test, lint, build y evidencia

> **Estado (2026-11-04):** Implementado: CI en GitHub Actions (lint, gitleaks, test, build) verde desde 2026-11-04; Node 24.

**Historia:** Como equipo, queremos que cada cambio ejecute pruebas, lint y build en CI, para que la evidencia sea reproducible.
**Prioridad:** P0 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** repo GitHub (existente).
**Gherkin:**
```gherkin
Escenario: PR con evidencia
  Dado un pull request nuevo
  Cuando se abre o actualiza
  Entonces CI ejecuta lint, pruebas unitarias y build
  Y el resultado queda publicado en el PR

Escenario: Fallo bloqueante
  Dado un cambio que rompe una prueba
  Cuando corre CI
  Entonces el PR se marca fallido y no puede mergearse sin override documentado
```
**Casos:** positivo — pipeline verde publica checks. Negativo — fallo impone arreglo. Límite — E2E con Playwright se agrega en V1 (BLU-1501/EPIC-15); job separado no bloquea MVP.
**Accesibilidad y seguridad:** sin secretos en logs; caché de dependencias verificado.
**Evidencia requerida:** workflow en repo; ejecución real verificada en un PR de prueba.
**DoR:** comandos de validación locales estables.
**DoD:** workflow activo y verde en main.

---

### BLU-1403 — Manejo de secretos y configuración por entorno

**Historia:** Como equipo, queremos que claves y configuraciones sensibles nunca lleguen al repo, para reducir riesgo de fuga.
**Prioridad:** P0 · **Tamaño:** S · **Fase:** MVP (desde el primer secreto)
**Dependencias:** BLU-1402.
**Gherkin:**
```gherkin
Escenario: Secreto fuera del repo
  Dado una clave de proveedor necesaria en V1
  Cuando se configura
  Entonces vive solo en GitHub Secrets/variables y en el gestor del entorno
  Y un escaneo de secretos en CI no encuentra exposiciones

Escenario: .env.example honesto
  Dado el repo público de plantilla
  Entonces .env.example lista las variables sin valores reales
```
**Evidencia requerida:** escaneo (gitleaks o similar) integrado en CI; resultado verde archivado.
**DoR:** inventario de secretos previsto.
**DoD:** escaneo activo; documentación de configuración.

---

### BLU-1404 — Observabilidad y telemetría sin PII

> **Estado (2026-11-04, ciclo V1-prep):** Diseño completo en `specs/011-v1-observability/ (lista blanca cerrada de eventos, filtrado en el borde, retención 90 días, separación uso/eficacia, 4 pruebas)`. Implementación GATED a PRD §8.

**Historia:** Como equipo, queremos entender el funcionamiento del producto con telemetría mínima y sin datos personales, para operar sin violar privacidad.
**Prioridad:** P2 · **Tamaño:** M · **Fase:** V1
**Dependencias:** ADR (BLU-1401).
**Gherkin:**
```gherkin
Escenario: Eventos permitidos
  Dado el esquema de telemetría aprobado
  Cuando ocurre un evento de uso
  Entonces se registra solo con campos permitidos (p. ej. "checkin_completado", sin hábito ni texto)
  Y cualquier campo sensible se descarta en el borde
```
**Evidencia requerida:** pruebas de filtrado en el borde; revisión del esquema contra lista blanca.
**DoR:** lista blanca de eventos aprobada.
**DoD:** telemetría activa con pruebas verdes.

---


> **Estado (2026-11-04):** **GATED a V1** — requiere backend/cuentas/sincronización; bloqueada por PRD §8 y constitución II/X hasta aprobaciones de privacidad, seguridad, revisión científica, ética y análisis jurídico (ADR-0001).
### BLU-1405 — Actualización continua del modelo de amenazas y escaneo de dependencias

**Historia:** Como equipo, queremos que amenazas y dependencias se revisen continuamente, para que la seguridad no se deteriore.
**Prioridad:** P1 · **Tamaño:** S · **Fase:** MVP
**Dependencias:** BLU-1402.
**Gherkin:**
```gherkin
Escenario: Dependabot/CodeQL activos
  Dado el repo configurado
  Entonces alertas de dependencias y análisis estático se crean automáticamente
  Y toda alerta nueva genera issue priorizado
```
**Evidencia requerida:** configuración visible en repo; al menos un ciclo de alerta procesado o evidencia de configuración.
**DoR:** acceso de administrador al repo.
**DoD:** escaneos activos; proceso documentado.

---

# EPIC-15 — Accesibilidad, experiencia de usuario y notificaciones

**Objetivo de épica:** que Blu sea usable por la mayor variedad de personas (WCAG 2.2 AA como
referencia), con notificaciones suaves opt-in que nunca presionen.

---

### BLU-1501 — Auditoría y corrección de accesibilidad (WCAG 2.2 AA)

> **Estado (2026-11-04):** Auditoría axe-core 4.14 sobre onboarding, dashboard, cuestionario y aviso previo: **0 violaciones serias/críticas** (color-contrast excluido por limitación de jsdom; smoke de controles etiquetados y jerarquía de títulos en src/app/a11y.test.tsx). Revisión con usuarios pendiente (EPIC-16).

**Historia:** Como persona usuaria con discapacidad, quiero usar Blu con teclado y lector de pantalla, para no quedar fuera.
**Prioridad:** P0 · **Tamaño:** L · **Fase:** MVP
**Dependencias:** componentes base existentes.
**Gherkin:**
```gherkin
Escenario: Flujo completo con teclado
  Dado un usuario de solo teclado
  Cuando completa onboarding, check-in y borrado
  Entonces logra cada tarea con foco visible y orden lógico

Escenario: Auditoría automatizada
  Dado un cambio en UI
  Cuando corre CI
  Entonces axe (o equivalente) reporta sin violaciones críticas
```
**Casos:** positivo — navegación completa. Negativo — ningún elemento interactivo sin nombre accesible. Límite — contraste y tamaño táctil verificados en móvil.
**Evidencia requerida:** pruebas E2E de accesibilidad con axe; checklist manual archivado; revisión con usuario si es posible (EPIC-16).
**DoR:** alcance de páginas definido.
**DoD:** auditoría sin violaciones críticas; checklist firmado.

---

### BLU-1502 — Notificaciones locales opt-in y amables

**Historia:** Como persona usuaria, quiero recordatorios suaves que yo activo, para apoyarme sin sentirme perseguida.
**Prioridad:** P2 · **Tamaño:** M · **Fase:** V1
**Dependencias:** BLU-102.
**Gherkin:**
```gherkin
Escenario: Opt-in y silencio
  Dado que no activé recordatorios
  Entonces Blu nunca notifica
  Y si los activé, puedo elegir horario y silenciarlos por completo

Escenario: Notificación sin culpa
  Dado un recordatorio enviado
  Entonces el texto invita sin culpabilizar ("¿qué versión pequeña te cabe hoy?")
```
**Accesibilidad y seguridad:** frecuencia máxima configurable; sin notificaciones de "racha rota".
**Evidencia requerida:** pruebas de opt-in/silencio; revisión de copy.
**DoR:** guía de tono aprobada.
**DoD:** implementado con pruebas verdes.

---


> **Estado (2026-11-04):** **GATED a V1** — requiere backend/cuentas/sincronización; bloqueada por PRD §8 y constitución II/X hasta aprobaciones de privacidad, seguridad, revisión científica, ética y análisis jurídico (ADR-0001).
### BLU-1503 — Uso básico sin conexión (PWA mínima)

**Historia:** Como persona usuaria con conexión intermitente, quiero registrar mis hábitos sin internet, para no perder continuidad.
**Prioridad:** P3 · **Tamaño:** L · **Fase:** V2
**Dependencias:** BLU-1401.
**Gherkin:**
```gherkin
Escenario: Check-in offline
  Dado que estoy sin conexión
  Cuando marco mi hábito
  Entonces el registro queda local y se sincroniza al volver (V1+backend)
```
**Evidencia requerida:** prueba E2E con red cortada.
**DoR:** decisión de PWA en ADR.
**DoD:** implementado con pruebas verdes.

---

# EPIC-16 — Investigación, experimentación y validación del producto

**Objetivo de épica:** probar la hipótesis H1 (acompañamiento conversacional personalizado mejora
adherencia vs recordatorios estáticos) con método, ética y publicación honesta de resultados,
incluidos los nulos.

---


> **Estado (2026-11-04):** **GATED a V2** — requiere backend y RAG/funciones avanzadas; bloqueada por PRD §8 y constitución II/X hasta aprobaciones de privacidad, seguridad, revisión científica, ética y análisis jurídico (ADR-0001).
### BLU-1601 — Protocolo del piloto de ocho semanas con revisión ética

**Historia:** Como investigador, quiero un protocolo aprobado por comité de ética o determinación institucional, para reclutar y medir sin dañar.
**Prioridad:** P1 · **Tamaño:** L · **Fase:** V1
**Dependencias:** PRD sección 7, plan de validación científica.
**Gherkin:**
```gherkin
Escenario: Protocolo completo
  Dado el piloto propuesto
  Entonces el protocolo define población, consentimiento de investigación separado, desenlaces, monitoreo de incidentes y plan de publicación
  Y no recluta personas antes de la aprobación del comité
```
**Evidencia requerida:** documento de protocolo versionado; constancia de revisión ética.
**DoR:** asesoría metodológica y jurídica.
**DoD:** protocolo aprobado y archivado.

---


> **Estado (2026-11-04):** **GATED a V1** — requiere backend/cuentas/sincronización; bloqueada por PRD §8 y constitución II/X hasta aprobaciones de privacidad, seguridad, revisión científica, ética y análisis jurídico (ADR-0001).
### BLU-1602 — Registro público y preespecificación estadística

**Historia:** Como equipo, queremos registrar el estudio y preespecificar hipótesis y análisis, para que los resultados sean creíbles.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** V1
**Dependencias:** BLU-1601.
**Gherkin:**
```gherkin
Escenario: Preespecificación
  Dado el protocolo aprobado
  Entonces desenlace primario, diferencia mínima relevante, cálculo muestral y análisis quedan registrados antes del primer reclutamiento
  Y ningún cambio posterior ocurre sin nota fechada
```
**Evidencia requerida:** registro público (p. ej. ClinicalTrials.gov u osf.io) y documento de análisis en repo.
**DoD:** registro y preespecificación publicados.

---


> **Estado (2026-11-04):** **GATED a V1** — requiere backend/cuentas/sincronización; bloqueada por PRD §8 y constitución II/X hasta aprobaciones de privacidad, seguridad, revisión científica, ética y análisis jurídico (ADR-0001).
### BLU-1603 — Pipeline de análisis reproducible del piloto

**Historia:** Como analista, quiero un pipeline auditable desde datos consentidos a resultados, para que los números del piloto sean reproducibles.
**Prioridad:** P2 · **Tamaño:** L · **Fase:** V1
**Dependencias:** BLU-1203, BLU-1602.
**Gherkin:**
```gherkin
Escenario: Reproducibilidad
  Dado el dataset consentido y el código de análisis versionado
  Cuando ejecuto el pipeline
  Entonces reproduzco las tablas y figuras del informe sin pasos manuales
```
**Evidencia requerida:** pipeline en repo con prueba de ejecución limpia; datos sintéticos de ejemplo.
**DoD:** pipeline reproducible verificado.

---


> **Estado (2026-11-04):** **GATED a V1** — requiere backend/cuentas/sincronización; bloqueada por PRD §8 y constitución II/X hasta aprobaciones de privacidad, seguridad, revisión científica, ética y análisis jurídico (ADR-0001).
### BLU-1604 — Gobernanza de resultados: publicar también los nulos

**Historia:** Como equipo, queremos publicar resultados favorables y desfavorables por igual, para no inducir sesgo de publicación.
**Prioridad:** P2 · **Tamaño:** S · **Fase:** V1
**Dependencias:** BLU-1601.
**Gherkin:**
```gherkin
Escenario: Resultado nulo publicado
  Dado un piloto sin efecto detectable
  Entonces el informe se publica igual con conclusiones y limitaciones
  Y ninguna métrica se elige después de ver los datos
```
**Evidencia requerida:** política de publicación en repo; plantilla de informe.
**DoD:** política adoptada por el equipo.

> **Estado (2026-11-04):** **GATED a V1** — requiere backend/cuentas/sincronización; bloqueada por PRD §8 y constitución II/X hasta aprobaciones de privacidad, seguridad, revisión científica, ética y análisis jurídico (ADR-0001).
