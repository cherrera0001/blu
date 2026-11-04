# Blu — Historias de usuario y aceptación

**Versión:** 0.1

## Historias del MVP local

### US-01 — Entender el prototipo

Como persona usuaria, quiero saber qué hace Blu y dónde guarda información para decidir si continuar.

- Dado que abro Blu por primera vez, cuando veo el onboarding, entonces explica que no es clínico, no usa IA generativa, guarda datos solo en el navegador y no cifra ese almacenamiento.
- No se habilita el guardado del plan antes de aceptar el aviso.

### US-02 — Elegir hábitos propios

Como persona usuaria, quiero elegir entre uno y tres hábitos para enfocar mi atención.

- Puedo escoger cualquiera de los siete pilares.
- La interfaz no permite seleccionar un cuarto hábito.
- Puedo cambiar mi selección sin perder la opción de borrar todos los datos.

### US-03 — Registrar una acción diaria

Como persona usuaria, quiero marcar si realicé una acción para revisar mi propio progreso.

- Marcar y desmarcar es reversible.
- El registro se asocia a la fecha local y persiste tras recargar en el mismo navegador.
- El texto evita «fallaste», rachas punitivas o inferencias sobre motivación.

### US-04 — Revisar mi semana

Como persona usuaria, quiero ver un resumen de siete días para reflexionar.

- Muestra acciones registradas, período y límite autoinformado.
- No lo presenta como medición objetiva de salud ni como efecto de Blu.

### US-05 — Adaptar una meta

Como persona usuaria, quiero hacer más pequeño un hábito cuando no encaja en mi semana.

- Blu no cambia nada automáticamente.
- Selecciono el hábito y motivo de una lista cerrada; veo antes/después y puedo deshacer o modificar en la siguiente interacción.
- Se guarda la adaptación con fecha y queda visible en el historial.

### US-06 — Conversar con límites claros

Como persona usuaria, quiero recibir una respuesta breve sin que se expongan mis mensajes.

- El chat de demostración no realiza solicitudes de red ni persiste los mensajes.
- La interfaz pide no compartir identificadores ni información médica.
- Solicitudes clínicas reciben una respuesta de límite y derivación a profesional.

### US-07 — Borrar mis datos

Como persona usuaria, quiero eliminar mi estado local.

- Una acción explícita borra la clave de Blu y devuelve al inicio.
- Un fallo de borrado se muestra claramente; no se confirma éxito sin verificarlo.

## Historias futuras no implementadas

- Exportar y borrar datos sincronizados desde un backend con confirmación verificable.
- Consultar referencias científicas trazables para cada recomendación aprobada.
- Participar voluntariamente en una evaluación de producto con consentimiento separado.

Estas historias requieren criterios de seguridad, accesibilidad, privacidad y evidencia antes de entrar al desarrollo.
