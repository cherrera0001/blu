# Blu Constitution

## Core Principles

### I. Evidence-first
Toda afirmación sobre salud o bienestar requiere una fuente aprobada en el registro de evidencia
(EPIC-13) o debe publicarse rotulada como «sin evidencia verificada». Sin fuente aprobada no hay
afirmaciones de eficacia, causalidad ni longevidad. Las recomendaciones citan su relación exacta
con las fuentes y su fecha de revisión.

### II. Privacy and Security by Design
Minimización de datos en cada decisión: no se recoge lo que no se necesita. Datos sensibles solo
con consentimiento diferenciado y versionado. Fronteras de confianza explícitas (cliente ↔ API ↔
base de datos ↔ proveedor). Amenazas evaluadas con STRIDE antes de ampliar superficie. Nunca PII
en logs, telemetría ni prompts de terceros.

### III. Testability by Design
Cada funcionalidad nace de criterios de aceptación verificables y pruebas automatizadas que los
ejecutan (TDD: RED → GREEN → REFACTOR). Ninguna historia se marca Done por compilar: exige
evidencia ejecutada y revisada, conectada a su issue.

### IV. Accessibility by Design
WCAG 2.2 AA como referencia: teclado, lector de pantalla, foco visible, contraste, lenguaje claro.
Una funcionalidad no está completa si excluye a una persona por cómo fue construida.

### V. Human-in-the-Loop
La persona decide: aceptar, modificar o rechazar objetivos; retirar consentimientos; borrar datos.
La revisión humana aprueba evidencia, contenido sensible, cambios de reglas y de políticas del
asistente. Nada crítico cambia en silencio ni de forma autónoma.

### VI. Trazabilidad de decisiones y requisitos
Historia → criterio → prueba → resultado → issue, encadenados y reproducibles. Decisiones
arquitectónicas significativas se documentan como ADR en `docs/adr/` con contexto, opciones,
decisión, consecuencias y fecha.

### VII. Prohibición de afirmaciones médicas sin respaldo
Nada de diagnóstico, tratamiento, triaje, prescripción, dosis ni sustitución de profesionales.
Preguntas clínicas reciben respuesta segura de derivación. El guardián valida toda salida del
asistente contra esta prohibición (deny-by-default).

### VIII. Aprendizaje controlado y auditable
El sistema no se modifica a sí mismo: reglas, políticas y modelos cambian solo por decisión
humana versionada (PR/ADR). Retroalimentación de usuarios se usa agregada y con consentimiento.
Hipótesis de producto se prueban, nunca se asumen (separar uso de eficacia).

### IX. Arquitectura modular
Dominio puro desacoplado de UI y de proveedores externos (LLM, almacenamiento, notificaciones).
Contratos explícitos entre módulos; dependencias sustituibles por adaptadores. Evaluar FastAPI,
PostgreSQL/Supabase, pgvector u otros solo cuando un requisito real los justifique (ADR previo).

### X. Reducción de complejidad innecesaria
YAGNI: la solución más simple que cumpla los criterios gana. No multiagente, no microservicios, no
backend propio antes de demostrar la necesidad. Complejidad extra requiere justificación
documentada y aprobada.

## Additional Constraints

- **Stack vigente:** Next.js + TypeScript + React; pruebas con Vitest y Testing Library; CI en
  GitHub Actions. Cualquier tecnología adicional pasa por ADR.
- **Localidad de datos:** el MVP no transmite datos personales; cualquier backend exige las
  aprobaciones del PRD (privacidad, seguridad, jurídico, revisión científica).
- **Contenido:** versionado como datos (JSON esquematizado) con validación al cargar y errores
  visibles; nunca excepciones silenciosas.

## Development Workflow

1. Historia Ready (backlog) → especificación (`/speckit-specify`) → plan (`/speckit-plan`) →
   tareas (`/speckit-tasks`) → implementación TDD (`/speckit-implement`).
2. TDD obligatorio: pruebas que fallan primero; refactor preservando comportamiento.
3. CI verde (lint + pruebas + build) como condición de merge; evidencia archivada en el issue.
4. Revisión de código por pares; revisión de copy sensible por una segunda persona.
5. Análisis de consistencia (`/speckit-analyze`) antes de implementar specs grandes.

## Governance

Esta constitución tiene precedencia sobre cualquier práctica del repositorio. Sus enmiendas
requieren PR con justificación, aprobación del equipo y fecha de ratificación. Todo PR debe
verificar cumplimiento de los principios I–X; la complejidad debe justificarse contra el
principio X. En conflicto con la constitución del usuario final (salud, dignidad, autonomía),
siempre gana el usuario.

**Version**: 1.0.0 | **Ratified**: 2026-11-04 | **Last Amended**: 2026-11-04
