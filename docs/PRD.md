# Blu — Documento de requisitos de producto

**Versión:** 0.1 · **Estado:** borrador para revisión · **Fecha:** 2026-11-04

## 1. Visión y problema

Blu ayuda a personas adultas a probar cambios pequeños, elegidos por ellas, en hábitos cotidianos relacionados con bienestar. Busca convertir una intención en una acción posible, observar cómo resultó y permitir que la persona ajuste el plan sin culpa.

**Propuesta de valor:** «Tu bienestar, un día a la vez». Blu apoya decisiones cotidianas; no predice ni garantiza años de vida.

## 2. Usuarios y contexto inicial

- Personas adultas (18+) que quieren desarrollar uno o varios hábitos de bienestar.
- Piloto futuro previsto en Chile; jurisdicción, población y protocolo deben revisarse antes de reclutar.
- El prototipo actual es para evaluación de usabilidad, no para un estudio de eficacia ni para uso clínico.
- No se dirige a menores ni intenta adaptar hábitos a enfermedades, embarazo, tratamientos o necesidades clínicas.

## 3. Principios y límites

1. Calidad de vida antes que longevidad.
2. No convertir asociaciones sobre zonas azules en promesas causales.
3. La persona elige su hábito, ritmo y cambios.
4. No inferir motivos de incumplimiento; preguntar o dejar que la persona decida.
5. No diagnosticar, prescribir, recomendar cambios de medicación ni reemplazar relaciones o profesionales.
6. Minimizar datos y explicar dónde se guardan.
7. Registrar la procedencia de la evidencia y el motivo de cada cambio.

Los siete principios Living Blue Zone son un marco inspirador, no una escala clínica ni un conjunto de intervenciones cuya eficacia individual se dé por probada. No se recomienda iniciar el consumo de alcohol.

## 4. Alcance del prototipo implementado

- Consentimiento de uso del prototipo antes de guardar preferencias.
- Selección voluntaria de hasta tres hábitos entre los siete pilares.
- Check-in local diario por hábito.
- Resumen descriptivo de los últimos siete días, sin calificación ni lenguaje de fracaso.
- Adaptación explícita de un hábito a una versión más pequeña, con motivo elegido y evento registrado localmente.
- Conversación de demostración con respuestas deterministas y límites visibles; no es un modelo generativo.
- Lectura en voz alta local y una integración opcional de voz neuronal Azure TTS, desactivada hasta configurar y aprobar su habilitación.
- Eliminación de todos los datos locales desde la interfaz.

El prototipo utiliza `localStorage` para preferencias y registros; no requiere identidad ni usa un proveedor de IA generativa. Los mensajes de conversación se envían al BFF de Blu, que aplica reglas deterministas y no los persiste por la aplicación. La voz Azure, si se configura y se activa expresamente, envía a Microsoft únicamente la respuesta elegida para síntesis. Blu no cifra el almacenamiento del navegador. No ingresar información médica, nombres, teléfonos ni texto identificatorio; el dispositivo o perfil del navegador puede ser compartido.

## 5. Fuera de alcance

- Diagnóstico, tratamiento, triaje clínico o emergencias.
- Recomendación nutricional individualizada, dieta, peso/calorías, fármacos o suplementos.
- Promesas de longevidad, predicciones clínicas o puntuación de riesgo.
- LLM, reconocimiento de voz, memoria conversacional persistente, analítica de terceros o entrenamiento con conversaciones.
- Cuentas, nube, sincronización entre dispositivos, wearable APIs o comunidad.
- Afirmar que Blu mejora adherencia o salud antes de probarlo.

## 6. Requisitos y criterios de aceptación

| ID | Requisito | Criterio verificable |
|---|---|---|
| P-01 | Consentimiento y transparencia | No se guarda un plan hasta aceptar el aviso del prototipo; el aviso explica almacenamiento local, ausencia de cifrado y borrado. |
| P-02 | Selección de hábitos | Permite seleccionar entre 1 y 3; la interfaz impide guardar más de 3. |
| P-03 | Check-in | Marcar/desmarcar una acción actualiza el día local; al recargar, el estado se conserva en el mismo navegador. |
| P-04 | Revisión | El resumen cuenta las acciones registradas en los últimos 7 días y declara el período; no presenta resultados como diagnóstico ni como eficacia. |
| P-05 | Adaptación | Solo ocurre tras una acción explícita; registra hábito, acción anterior/nueva, motivo predefinido y fecha. |
| P-06 | Conversación | Usa respuestas deterministas del BFF, no un LLM; no persiste el historial y advierte no incluir datos identificatorios. La síntesis externa requiere activación separada. |
| P-07 | Borrado | La acción de borrar elimina la clave de Blu y vuelve al onboarding; si falla, muestra un error. |
| P-08 | Errores de almacenamiento | Datos corruptos o almacenamiento inaccesible producen un mensaje visible y una opción explícita de reinicio; nunca se silencian. |
| P-09 | Accesibilidad | Navegación con teclado, etiquetas accesibles, foco visible, contraste legible y diseño adaptable a móvil. |
| P-10 | Evidencia | Cada recomendación de una versión futura tendrá referencia, fecha de revisión, población, diseño, limitaciones y estado de aprobación; el prototipo no declara evidencia aún verificada. |

## 7. Métricas: separar usabilidad de eficacia

### Prototipo de usabilidad

- Tasa de finalización de onboarding y selección correcta (1–3 hábitos).
- Éxito en tareas de check-in, revisión, adaptación y borrado.
- Errores de almacenamiento y accesibilidad observados.
- Comprensión de que el producto no da consejo clínico y no está validado.

Los umbrales de aprobación se fijarán antes de la prueba de usabilidad; no se usarán métricas de satisfacción para afirmar eficacia.

### Hipótesis de investigación (no demostrada)

**H1:** el acompañamiento conversacional personalizado mejora la adherencia a hábitos respecto de recordatorios estáticos.

Un piloto de ocho semanas puede evaluar factibilidad, aceptabilidad, retención y seguridad. Para estimar eficacia se necesita protocolo comparativo, desenlace primario preespecificado, cálculo de tamaño muestral, asignación apropiada, plan estadístico, manejo de datos faltantes y revisión ética independiente. No inferir años de vida ganados.

## 8. Condiciones antes de ampliar el producto

No habilitar LLM remoto, perfiles de salud, cuentas, analítica, wearables, comunidad o reclutamiento hasta que se aprueben: arquitectura de privacidad, evaluación de impacto, contratos de tratamiento, retención y borrado, controles de acceso, protocolo de incidentes, seguridad de proveedor, revisión clínica/científica y análisis jurídico aplicable en Chile.

La síntesis neuronal de voz es una excepción acotada solicitada para el MVP: solo transforma en audio una respuesta de Blu elegida expresamente por la persona; no habilita chat generativo ni entrada por micrófono. El texto se envía a Microsoft únicamente después de activar esta opción y pulsar «Escuchar». La integración permanece desactivada por defecto. Antes de habilitarla en un despliegue, confirmar la revisión de privacidad y del proveedor, usar un recurso Speech con nivel **F0 (Free)** y configurar las variables de servidor documentadas en el README. La bandera F0 es una confirmación operativa; no sustituye la verificación del nivel real en Azure. Si el recurso o las variables no están disponibles, Blu conserva el modo local.

**Enmienda 2026-11-05 (aprobación explícita del dueño del producto):** el chat remoto de texto queda habilitado como construcción real, con alcance acotado y registrado en ADR-0005: proveedor intercambiable (API OpenAI-compatible) detrás del BFF; guardianes de entrada/salida invariantes; sin persistencia conversacional; límites de tasa, longitud y tiempo; clave solo en el servidor; degradación a modo local ante fallos; disclosure honesto del modo en la interfaz; `BLU_API_TOKEN` opcional para piloto cerrado. La activación es exclusivamente por configuración del servidor: sin `BLU_LLM_*` configuradas, el comportamiento es el local determinista. Esta enmienda **no** habilita cuentas/sincronización (specs 009–013), reconocimiento de voz en la nube, memoria persistente, analítica ni producción comercial: para escalar a esas capacidades sigue requerido el listado completo de aprobaciones de este §8 (EIPD, contratos, pentest, revisión jurídica y clínica).

**Enmienda V1 2026-11-05 (aprobación explícita del dueño del producto, «opción A»):** se abre el gate V1 **por fases**, registrado en ADR-0006. Queda habilitada la construcción del código de cuentas, sesiones, aislamiento RLS, telemetría sin PII y registro de evidencia (specs 009–013), con activación exclusivamente por configuración (`SUPABASE_*`) y sin crear recursos cloud desde el repositorio. La activación en producción con datos reales exige las firmas C1–C3 de ADR-0006 (EIPD-V1 aprobada, contrato con proveedor gestionado + región, pentest ligero + matriz de aislamiento en CI) y el procedimiento ARCO probado (C5); la revisión ética (C4) se requiere antes del piloto, no antes de cuentas. EIPD-V1: `docs/EIPD-V1-cuentas-sincronizacion.md` (borrador). Sigue gated: memoria conversacional, RAG semántico, voz en la nube, analítica de terceros y producción comercial.
