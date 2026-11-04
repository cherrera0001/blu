# Blu — Arquitectura C4

**Versión:** 0.1 · **Estado:** objetivo propuesto; el prototipo implementa solo el contenedor web local.

## Nivel 1 — Contexto

```mermaid
flowchart LR
  person["Persona adulta"]
  blu["Blu — acompañamiento de hábitos<br/>No clínico; no validado"]
  evidence["Registro editorial de evidencia<br/>(revisión humana)"]
  person <--> |"elige hábitos, registra acciones<br/>y recibe reflexión"| blu
  evidence --> |"contenido aprobado y versionado"| blu
```

En el prototipo no existe servicio de evidencia en línea: el catálogo de hábitos es contenido estático sin afirmación de eficacia aprobada. No hay proveedores externos ni transmisión de datos.

## Nivel 2 — Contenedores

```mermaid
flowchart TB
  user["Persona"]
  subgraph browser["Dispositivo / navegador"]
    web["Aplicación web Next.js<br/>UI + reglas de demostración"]
    local["Almacenamiento local del navegador<br/>preferencias y check-ins mínimos"]
    web <--> local
  end
  editor["Revisión humana editorial<br/>fuera del runtime"]
  user <--> web
  editor -. "publica referencias verificadas<br/>en una fase futura" .-> web
```

**Implementado:** aplicación Next.js con estado local; el chat es determinista y no persiste el texto de la conversación. La información del navegador no está cifrada por Blu.

**Futuro sujeto a aprobación:** cliente web → API autenticada → servicio de aplicación → base de datos cifrada; servicio de evidencia con catálogo editorial aprobado; proveedor de modelo opcional detrás de una puerta de privacidad y seguridad. No implementar esa topología por defecto ni enviar conversaciones a un LLM.

## Nivel 3 — Componentes lógicos

- **Interfaz:** onboarding/consentimiento, selector, check-in, revisión, adaptación, borrado.
- **Dominio local:** catálogo, validación de estado, cómputo descriptivo de siete días.
- **Guardián de seguridad:** límites no clínicos, respuesta segura ante preguntas médicas y rechazo de recomendaciones no respaldadas (en la versión con modelo).
- **Capa de evidencia (futura):** fuente, versión, población, diseño, limitaciones, fecha de revisión, aprobador y recomendación vinculada.
- **Orquestador (futuro):** flujo acotado y trazable; no ejecuta acciones autónomas ni cambia políticas.

## Decisiones arquitectónicas

1. Prototipo local-first para evitar transmisión de datos personales en esta etapa.
2. No añadir backend ni dependencia de IA hasta precisar necesidad, amenazas, consentimiento y retención.
3. Mantener el chat de demostración separado de cualquier afirmación de IA personalizada.
4. Toda adaptación requiere una acción del usuario; no aprender ni reentrenar automáticamente.
5. Evaluar Next.js/FastAPI/PostgreSQL solo cuando un requisito real necesite cuentas o sincronización; el texto inicial los propone, pero no los valida como decisión final.

## Flujos principales

1. Aviso y consentimiento → selección 1–3 → guardar localmente.
2. Persona marca una acción → estado asociado a fecha local → resumen descriptivo.
3. Persona solicita simplificar → elige hábito y barrera de una lista → se registra cambio y queda visible.
4. Persona borra datos → eliminar estado local y volver al onboarding.

## Requisitos transversales

- Fallar visiblemente ante corrupción o bloqueo del almacenamiento.
- No registrar texto del chat ni identificadores.
- No cargar fuentes remotas, píxeles de analítica ni SDKs de terceros.
- Mantener contenido estático claramente rotulado como no validado hasta revisión científica.
- Antes de nube: aislamiento por usuario, autorización en servidor, cifrado, rotación de claves, límites de retención, exportación/borrado y evaluación de proveedores.
