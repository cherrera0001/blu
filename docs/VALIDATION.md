# Blu — evidencia de validación del prototipo

**Fecha:** 2026-11-04 · **Versión:** prototipo local 0.1

## Pruebas automatizadas

| Comando | Resultado | Cobertura principal |
|---|---|---|
| `npm test` | Aprobado — 12 pruebas en 2 archivos | Validación de almacenamiento, límite 1–3, check-in semanal, adaptación/deshacer, consentimiento, conversación acotada y borrado. |
| `npm run lint` | Aprobado | Reglas ESLint/Next para componentes y pruebas. |
| `npm run build` | Aprobado | Compilación optimizada y verificación TypeScript. |
| `npm audit` | Aprobado — 0 vulnerabilidades reportadas | Dependencias directas y transitivas. |

Pruebas automatizadas: `src/lib/blu.test.ts` y `src/app/BluApp.test.tsx`.

## Recorrido manual de navegador

Realizado en el navegador local contra `http://localhost:3000`; no se usaron cuentas ni datos reales:

- La selección de un cuarto hábito fue bloqueada.
- Antes de aceptar el aviso, la selección permaneció en memoria de la página y `blu.local.v1` siguió ausente.
- Tras aceptar, se guardaron consentimiento y hábitos elegidos.
- El check-in actualizó el conteo semanal; la adaptación mostró acción anterior y nueva y pudo deshacerse.
- Tras recargar, check-in y adaptación persistieron; el historial conversacional no.
- Una pregunta sobre dolor/diagnóstico recibió el límite no clínico.
- «Borrar mis datos» pidió confirmación, devolvió al onboarding y dejó `localStorage["blu.local.v1"]` en `null`.

## Límites de esta evidencia

- El recorrido manual no es un estudio con usuarios ni demuestra utilidad, aceptabilidad o eficacia.
- No prueba seguridad de `localStorage`, resistencia a XSS, accesibilidad WCAG completa ni compatibilidad entre dispositivos.
- No se probaron datos clínicos, menores, integraciones de salud, backend ni proveedor de IA: esas superficies no están habilitadas.
- Las afirmaciones y referencias científicas del texto de origen siguen pendientes de verificación.
