# Matriz de evaluación — demo de Blu

> **ADVERTENCIA DE VERIFICACIÓN (2026-11-05):** no se encontraron reglas oficiales de la
> hackathon (problema, criterios de evaluación, formato, fechas o restricciones) en los
> materiales accesibles: se buscó en el repositorio de Blu y en las carpetas de la pasantía
> sin resultados. **Esta matriz es PROVISIONAL y no está atribuida a Georgia Tech ni a ningún
> organismo.** Reemplazar fila a fila con la rúbrica oficial cuando se disponga de ella; la
> columna "evidencia" ya apunta a pruebas automatizadas reproducibles para cada fila.

## Matriz provisional

| # | Criterio (provisional) | Funcionalidad demostrable | Prueba automatizada | Evidencia |
|---|---|---|---|---|
| 1 | Propósito claro y límites honestos | Welcome con presentación en 1ª persona + disclaimer no clínico | `BluApp.test.tsx`, `a11y-axe.test.tsx` | Captura `01-welcome-mobile.png` |
| 2 | Elección personal del hábito | Selector de 1–3 temas con consentimiento diferenciado | `BluApp.test.tsx` ("persists separated purposes…") | Tour paso 2 |
| 3 | Primer paso práctico e instrucciones simples | Acción concreta por hábito + "Otras versiones" (versión pequeña) | `BluApp.test.tsx` (check-in y adaptación) | Capturas `03`, `08` |
| 4 | Check-in diario fácil y sin culpa | «Lo hice»/«Desmarcar»; sin rachas ni castigos; contador descriptivo | `BluApp.test.tsx` (toggle check-in) | Captura `03-checkin.png` |
| 5 | Revisión semanal veraz sin clínica | Resumen 7 días reales + formulario sentir/decidir + "registro personal, no medida de salud" | `BluApp.test.tsx` (weekly review) | Capturas `05`, `06` |
| 6 | Adaptación explícita y aprobada | Motivo predefinido + cambio visible + deshacer; nada automático | `BluApp.test.tsx` (simplify/undo) | Captura `08-adaptacion-aplicada.png` |
| 7 | Evidencia y límites de recomendaciones | Cada idea cita fuente con estado (verificada/pendiente); nota "no son recomendaciones clínicas" | `evidence/` + `bank.json` (campo `evidence` por pregunta) | Captura `06` (evidence-note) |
| 8 | Línea base transparente y no clínica | Score experimental con fórmula, cobertura real (29/29) y recálculo al revisar | `baseline.test.ts`, `QuestionnaireApp.test.tsx` | Captura `11-lineabase.png` |
| 9 | Privacidad, borrado y exportación | Export JSON versionado completo; borrado total verificado con reporte de fallos | `blu.test.ts`, `storage.test.ts` | Captura `09-privacidad.png`; tour paso 8 |
| 10 | Accesibilidad | Navegación por teclado, roles/labels, contraste AA, foco visible, `prefers-reduced-motion` | `a11y.test.tsx`, `a11y-axe.test.tsx`, `BluPresence.test.tsx` | Suite a11y en verde |
| 11 | Conversación honesta (modo declarado) | Disclosure dinámico según modo efectivo (reglas/IA remota/modo local) | `BluApp.test.tsx` (chat disclosure), `conversation.test.ts` | Capturas `04`, `04b` |
| 12 | Presencia de la guía sin engaños | Estados reales (welcome/responding/acknowledge/unavailable), sin estado "escuchando", decorativo | `BluPresence.test.tsx` + integración UX-07 | Capturas `02b`, `04b` |
| 13 | Robustez y errores visibles | Fallback local con microcopy por código (429 vs red), datos corruptos con error + reinicio | `conversation.test.ts`, `review.test.ts` | Tour (modo local) |
| 14 | Seguridad de la IA (si aplica) | Guardián de entrada (clínica/inyección no invocan proveedor), validación de salida, sin persistencia | `redteam.test.ts`, `route.test.ts` | `eval:security` 3/3 |

## Cobertura medida (2026-11-05)

- Suite: **304 pruebas, 32 archivos — 100 % en verde**; lint 0; build OK; `eval:security` 3/3;
  `npm audit` 0 vulnerabilidades (Node 24).
- Recorrido de demo completo ejecutado 3 veces con navegador real (capturas en
  `C:\Users\cherrera\AppData\Local\Temp\blu-tour\`, log `tour.log`).

## Criterios que NO pudieron verificarse

- Todos los criterios **oficiales** de la hackathon: la rúbrica no estaba disponible en los
  materiales revisados. Acción pendiente: obtener el enunciado oficial y mapear esta matriz.
- **Eficacia conductual** (mejora de adherencia/resultados): requiere estudio con desenlaces
  preespecificados; el PRD la declara hipótesis no demostrada (H1) y este ciclo no la mide.

## Ampliación del ciclo 8 (2026-11-05)

| Criterio (provisional) | Funcionalidad demostrable | Prueba | Evidencia |
|---|---|---|---|
| Apoyo diario amable sin invasión | Recordatorio local opt-in: máximo 1/día, solo si quedan pasos sin marcar, desactivable | `reminders.test.ts` (8), `BluApp.test.tsx` (3) | UI del dashboard |
| Navegación accesible | Skip link como primer enlace + `main` único con landmark | `BluApp.test.tsx` (BLU-1501) | Captura `02b` |
| Agrupación móvil | Secciones secundarias en `<details>` (espacio, revisión guardada) | `BluApp.test.tsx` (UX-05) | Recorrido headless |
