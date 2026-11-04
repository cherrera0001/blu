# Feature Specification: Onboarding con autodiagnóstico de hábitos

**Feature Branch**: `001-onboarding-questionnaire`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Autodiagnóstico de bienestar y hábitos (no médico) con banco de preguntas versionado, cuestionario progresivo con omisión y ramificación, y puntuación orientativa experimental por principio. Historias: BLU-201, BLU-202, BLU-203, BLU-204."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Validar y recorrer el banco de preguntas (Priority: P1)

La persona responde el cuestionario del banco versionado (7 principios × ≥5 preguntas). La app
valida el banco al cargarlo, recorre las preguntas respetando omisiones y saltos (`skipIf`),
y rechaza bancos corruptos con error visible.

**Why this priority**: sin motor y banco válidos no existe el autodiagnóstico; es la base de
BLU-201/202/203.

**Independent Test**: cargar `src/data/onboarding/bank.json`, responder un recorrido completo con
respuestas y omisiones en pruebas unitarias del motor, verificando el orden efectivo de preguntas
y el manejo de `skipIf`.

**Acceptance Scenarios**:

1. **Given** un banco JSON válido, **When** se valida, **Then** carga 7 principios con ≥5 preguntas cada uno y sin referencias `skipIf` rotas ni ciclos.
2. **Given** un banco con una pregunta que referencia `skipIf` inexistente, **When** se valida, **Then** se lanza error describiendo el problema (nunca se carga a medias).
3. **Given** respuestas donde `vin-01 = 3`, **When** se resuelve el recorrido, **Then** `vin-04` queda omitida según su regla.

---

### User Story 2 - Guardado progresivo y reanudación (Priority: P2)

La persona puede cerrar y retomar el cuestionario exactamente donde quedó; omitir una pregunta
sensible no penaliza; el estado parcial persiste localmente con su versión del banco.

**Why this priority**: reduce abandono y respeta ritmo propio (BLU-202); habilita pruebas de
reanudación antes de la UI.

**Independent Test**: en pruebas del componente, avanzar N preguntas, desmontar, remontar y
verificar que se retoma en la pregunta N+1 con respuestas previas intactas.

**Acceptance Scenarios**:

1. **Given** 6 de 12 preguntas respondidas, **When** se recarga la app, **Then** se retoma en la pregunta 7 con las respuestas previas intactas.
2. **Given** una pregunta omisible, **When** la persona elige "prefiero no responder", **Then** se registra como omitida y no afecta la puntuación de su principio salvo confianza reducida.
3. **Given** un estado guardado con `bankVersion` distinta a la actual, **When** se reanuda, **Then** se conserva la versión original del intento y se avisa si el banco cambió.

---

### User Story 3 - Puntuación orientativa experimental por principio (Priority: P3)

Al completar el cuestionario, la persona ve por cada principio un nivel orientativo
(«espacio para cuidarte» / «en desarrollo» / «fortaleza») rotulado como experimental y no
diagnóstico, con confianza reducida si hay omisiones.

**Why this priority**: entrega el valor visible del autodiagnóstico (BLU-204) con honestidad
metodológica; sin él el cuestionario no "cierra".

**Independent Test**: con respuestas de ejemplo, el cálculo produce niveles y bandas esperados;
con >30% de omisiones en un principio, marca confianza reducida; con 100% omitidas, no emite nivel.

**Acceptance Scenarios**:

1. **Given** un principio con respuestas de valores bajos, **When** se calcula, **Then** el nivel es «espacio para cuidarte» (banda 0–39).
2. **Given** >30% de omisiones en un principio, **When** se muestra, **Then** aparece «menor confianza» junto al nivel.
3. **Given** un principio totalmente omitido, **When** se muestra el perfil, **Then** no se emite nivel para ese principio.

---

### Edge Cases

- Banco con JSON corrupto o esquema inválido → error visible, app en modo seguro.
- Respuesta con valor fuera de las alternativas → rechazada al guardar la respuesta.
- Estado local corrupto → mensaje visible y opción de reinicio (política de errores del MVP).
- Recorrido con todas las preguntas omitidas → perfil sin niveles, invitación a rehacer o elegir manualmente.
- Pregunta `likert5`/`single_choice` respondida con tipo incorrecto → rechazo de la respuesta.
- `skipIf` que forma ciclo → detectado en validación del banco (nunca en runtime).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST validar el banco al cargarlo: 7 principios conocidos, ≥5 preguntas por principio, IDs únicos, tipos soportados (`single_choice`, `likert5`, `multi_choice`), alternativas con valores válidos y `skipIf` acíclicos con referencias existentes.
- **FR-002**: El motor MUST resolver el recorrido efectivo de preguntas aplicando las omisiones por `skipIf` según las respuestas ya dadas.
- **FR-003**: Las respuestas MUST validarse contra las alternativas de su pregunta antes de persistirse.
- **FR-004**: El estado del cuestionario MUST persistirse localmente por pregunta con `bankVersion`, permitiendo reanudación tras recarga.
- **FR-005**: El cálculo MUST producir por principio un índice 0–100 (promedio de valores respondidos normalizado), con bandas 0–39/40–69/70–100 y confianza reducida si >30% de omisiones; sin respuestas no hay nivel.
- **FR-006**: Las preguntas `multi_choice` MUST excluirse del índice (`countsTowardScore=false`) y usarse solo como barreras declaradas.
- **FR-007**: La UI MUST rotular el resultado como autoevaluación experimental, no diagnóstica.
- **FR-008**: Toda pregunta `skippable` MUST ofrecer "prefiero no responder" visible.
- **FR-009**: Errores de validación del banco o del estado local MUST ser visibles con opción explícita de reinicio (nunca silenciados).
- **FR-010**: Ninguna pregunta del banco MUST solicitar síntomas, diagnósticos, medicación ni datos identificatorios (validación editorial automatizada).

### Key Entities *(include if feature involves data)*

- **QuestionBank**: versión, locale, principios y preguntas con metadatos de omisión, saltos y evidencia.
- **Assessment**: intento de evaluación con `bankVersion`, respuestas por pregunta (valor u omitida) y estado de avance.
- **PrincipleResult**: principio, índice 0–100, banda, confianza y conteo de respondidas/omitidas.
- **Profile**: conjunto de `PrincipleResult` por principio, rotulado experimental.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de las preguntas del banco (35) validadas por pruebas automatizadas de esquema y recorrido.
- **SC-002**: Reanudación correcta en ≥99% de simulaciones (prueba repetida con estados intermedios).
- **SC-003**: Reglas `skipIf` del banco cubiertas al 100% por pruebas dedicadas.
- **SC-004**: El resultado muestra el rotulo "experimental, no diagnóstico" en 100% de los renders (prueba de UI).
- **SC-005**: Ningún cálculo emite nivel para un principio sin respuestas (prueba negativa).

## Assumptions

- El MVP persiste en `localStorage` sin cifrado; el aviso de consentimiento vigente lo declara.
- El banco es contenido estático versionado en el repo (sin backend de contenido).
- La UI del cuestionario es una página nueva `/cuestionario` accesible desde el onboarding; no reemplaza el flujo manual existente.
- La ramificación implementada es la de `skipIf` por respuesta (BLU-203 en su alcance mínimo); ramificaciones más ricas se especificarán aparte si el piloto lo requiere.
