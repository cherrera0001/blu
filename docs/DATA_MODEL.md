# Blu — Modelo de datos

**Versión:** 0.1 · El prototipo solo persiste datos locales mínimos.

## Modelo implementado

La clave `blu.local.v1` almacena un objeto versionado con:

| Campo | Tipo | Uso |
|---|---|---|
| `consentAcceptedAt` | fecha ISO o `null` | Registrar aceptación del aviso del prototipo. |
| `selectedHabitIds` | lista de 0–3 IDs del catálogo | Hábitos elegidos actualmente. |
| `checkInsByDate` | mapa de fecha local → lista de IDs | Acciones que la persona marcó en cada día. |
| `adaptations` | lista de eventos | Hábito, acción previa/nueva, motivo predefinido y fecha. |

No se guardan nombre, correo, fecha de nacimiento, ubicación, diagnóstico, medicamento, texto libre ni conversación. Las categorías/acciones se versionan como catálogo estático en código.

## Entidades objetivo para una fase con backend (no implementadas)

```text
User 1—N ConsentRecord
User 1—N HabitPlan 1—N CheckIn
HabitPlan 1—N AdaptationEvent
Recommendation N—N EvidenceSource (vía RecommendationEvidence)
ConversationSession 1—N ConversationTurn (solo si se justifica y consiente)
SafetyEvent (metadatos minimizados; sin texto sensible)
```

Campos propuestos, sujetos a revisión:

- `ConsentRecord`: propósito, versión del aviso, fecha, estado, retiro.
- `HabitPlan`: usuario seudónimo, hábito, versión objetivo, inicio/fin, estado.
- `CheckIn`: plan, fecha/hora local y zona horaria, resultado autoinformado.
- `AdaptationEvent`: plan, objetivo anterior/nuevo, motivo estructurado, autor y regla aplicada.
- `EvidenceSource`: DOI/PMID/URL estable, tipo, población, diseño, resultado, limitaciones, riesgo de sesgo, revisión y estado.
- `RecommendationEvidence`: recomendación, fuente, versión y relación exacta que respalda.
- `ConversationTurn`: contenido solo con necesidad, consentimiento explícito, retención breve y mecanismo de borrado; preferir no persistir.

## Reglas de privacidad y calidad

- No inferir atributos sensibles ni derivar diagnósticos.
- Separar consentimiento por propósito; retirarlo no debe impedir borrar datos.
- Aplicar mínimo privilegio y autorización del lado servidor en cualquier API.
- Definir retención, exportación, rectificación y borrado antes de almacenar en nube.
- Registrar cambios de objetivos sin guardar explicaciones sensibles en texto libre.
- Usar fechas y zona horaria de forma explícita; conservar únicamente precisión necesaria.
- No usar estos datos para entrenamiento de modelos.
- Los campos futuros no constituyen una determinación de cumplimiento legal; requieren revisión jurídica y de privacidad para Chile y cada jurisdicción de despliegue.
