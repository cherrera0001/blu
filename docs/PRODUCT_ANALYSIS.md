# Blu — análisis del texto de constitución

**Versión:** 0.1 · **Fecha:** 2026-11-04 · **Alcance:** análisis del material compartido; no es una revisión bibliográfica o jurídica independiente.

## Evaluación ejecutiva

El texto da una dirección de producto clara y prudente: prioriza bienestar sobre longevidad, distingue asociación de causalidad, propone autonomía y cambios graduales, trata la hipótesis de IA como algo que debe probarse y pone privacidad y trazabilidad en el diseño. Es una buena constitución de producto.

Todavía no es una especificación lista para un piloto clínico o de eficacia. Las referencias están incompletas, varios ejemplos de hábitos no tienen respaldo vinculado, el marco de los siete principios debe versionarse con fuente primaria y el alcance de datos/consentimiento requiere decisiones operativas. La primera entrega debería ser un prototipo de usabilidad, no una intervención sanitaria.

## Qué está bien fundamentado como decisión de producto

- **No prometer longevidad.** Evita traducir asociaciones de poblaciones a garantías individuales.
- **Personalización controlada por la persona.** No castigar incumplimientos ni inferir la causa sin preguntar.
- **Aprendizaje trazable.** Registrar objetivo, acción, resultado y motivo es preferible a reentrenar automáticamente con conversaciones.
- **Una composición modular y un solo orquestador.** Es una forma razonable de limitar complejidad, costo y agencia en una futura versión generativa.
- **Conexión humana y autonomía.** Blu no debe presentarse como sustituto de vínculos ni de profesionales.
- **Métricas no basadas en “años ganados”.** Retención, aceptabilidad, adherencia autoinformada e incidentes son desenlaces iniciales más honestos.

## Brechas que deben cerrarse antes de publicar recomendaciones

| Tema | Riesgo de interpretación | Acción necesaria |
|---|---|---|
| Power 9 vs. siete principios Living Blue Zone | Son marcos relacionados, no intercambiables. | Citar la versión primaria exacta de los siete principios, fecha de consulta y texto/licencia; mantener separado el marco conceptual de la evidencia de intervención. |
| Referencias científicas | Referencias como «PubMed», «OMS +1» y «livingbluezone.org +2» no identifican un artículo, guía o afirmación concreta. | Completar título, autores/organización, año, DOI/PMID/URL estable, población, diseño, limitaciones y afirmación respaldada. |
| Imágenes ilustrativas | Los enlaces incluidos apuntan a páginas/recursos de temas y países diversos; no constituyen evidencia científica de las recomendaciones. | Retirarlos del material científico o documentar por separado procedencia, derechos y propósito visual. |
| Ejemplos de hábitos | Sugerencias como pausas, sueño o alimentación pueden parecer consejos individualizados aun sin evaluación de contexto. | Publicar solo acciones de bajo riesgo revisadas; explicitar que son opciones, no una prescripción ni una meta universal. |
| Recomendaciones de actividad física y nutrición | La mención de guías generales no basta para justificar el texto de cada recomendación dentro de Blu. | Enlazar cada afirmación al pasaje y versión de una guía vigente; incluir aplicabilidad, límites y fecha de revisión. |
| Revisión de zonas azules / chatbots | Se describen resultados y cantidad de estudios sin cita bibliográfica verificable. | Recuperar registros exactos, revisar métodos y conclusiones; no reproducir cifras hasta verificar el artículo original. |
| Ley chilena 21.719 | El texto da una fecha de entrada en vigor, pero la referencia es genérica y una fecha próxima puede afectar obligaciones de diseño. | Verificar texto consolidado y disposiciones transitorias en fuente oficial vigente; solicitar revisión jurídica, sin usar este prototipo como interpretación legal. |
| Alcohol | La precaución de no recomendar empezar a beber es un buen límite de diseño. | Mantenerla explícita en contenido, pruebas y revisión de fuentes; no inferir beneficio individual. |

## Hipótesis de producto: hacerla comprobable

La hipótesis mezcla al menos tres componentes: conversación, personalización y adaptación del objetivo. Para medir qué aporta Blu, definir por adelantado:

1. **Intervención:** qué contenido, frecuencia, límites y reglas de adaptación recibe cada grupo.
2. **Comparador:** recordatorios estáticos con frecuencia y canal equivalentes para controlar atención y exposición.
3. **Desenlace primario:** una medida de adherencia autoinformada, su ventana y método de puntuación.
4. **Tamaño y análisis:** diferencia mínima relevante, cálculo muestral, aleatorización, pérdidas y plan estadístico previo.
5. **Seguridad:** cómo clasificar recomendaciones inapropiadas, presión/culpa, eventos adversos y privacidad.

Ocho semanas pueden servir para factibilidad, aceptabilidad y estimar parámetros del estudio; por sí solas no bastan para afirmar eficacia sostenida o cambios clínicos. El protocolo debe registrarse antes de reclutar y contar con revisión ética/institucional y estadística independiente.

## Decisión de construcción adoptada

La primera versión es un **prototipo local de interacción**, no el asistente de IA descrito en la visión:

- Solo frontend; no API, base de datos remota, cuenta, RAG, voz, wearables ni proveedor LLM.
- Chat predefinido y acotado, anunciado como demostración; sin persistencia de mensajes.
- Hasta tres elecciones y registros autoinformados en `localStorage`, solo después de aceptar el aviso; el almacenamiento no está cifrado.
- Cambios del plan solo por acción explícita; adaptación reversible.
- El contenido no se presenta como recomendación científica aprobada.

Este recorte evita solicitar datos de salud o transmitir conversaciones mientras se validan comprensión, flujo y aceptabilidad. `localStorage` es solo para demostración local; no es una solución adecuada para datos sensibles, uso compartido o despliegue de investigación.

## Decisiones pendientes para la siguiente fase

1. Aprobar fuentes, vocabulario y rúbrica de evidencia antes de un catálogo científico.
2. Decidir qué personalización necesita verdaderamente un modelo y qué puede resolverse con reglas.
3. Si se propone LLM: elegir proveedor, revisar retención/entrenamiento/transferencias, implementar aislamiento de instrucciones, evaluación adversarial y botón de desactivación.
4. Definir identidad, autenticación, exportación, borrado, retención y alojamiento antes de persistencia remota.
5. Obtener revisión legal y ética para Chile antes de datos sensibles, integraciones o reclutamiento.
6. Probar accesibilidad y experiencia en móvil con participantes adultos, sin recoger datos clínicos innecesarios.
