# Spec: Flujo principal y jerarquía visual del dashboard

**Estado:** implementada y validada · **Fecha:** 2026-11-05 · **Fase:** MVP
**Alcance:** presentación y navegación de dashboard existente; sin nuevas capacidades, datos,
dependencias, proveedores ni solicitudes de red.

## Evidencia y diagnóstico

Las capturas de producción muestran un hero verde bosque que no corresponde a la paleta oficial
azul/celeste de Blu, una cabecera de salto siempre visible, una revisión que representa siete días
vacíos con barras y una lista con scroll interno, y dos cifras cuya ventana permanece en siete días
aunque se cambia el período. El código local confirma estos problemas: el hero usa colores
literales verdes, `.skip-link` no tiene estilo, las barras se renderizan con cero acciones y el
historial está dentro de un contenedor con `maxHeight`/`overflowY`.

La fuente de marca aplicada al producto es el commit `26dfb49` (paleta de holablu.com): deep
`#12324f`, azul `#2f8fbf`, celeste `#6ec8f0`, glow `#b8e9ff`, foam `#e8f7ff`, sol `#f5c400` y
coral `#ff6b5c`. El verde no es color principal autorizado. Se conserva el azul oscuro como tinta
y se limita el azul intenso a acciones y acentos; la superficie de bienvenida será clara y compacta.

## Experiencia que se conserva

- Onboarding, selección de hasta tres hábitos, consentimiento y guardado local.
- Check-in diario con actualización inmediata del progreso.
- Resumen descriptivo con selector de 7, 14 o 30 días.
- Revisión semanal opcional, conversación y disclosures actuales.
- Exportación, gestión de consentimiento y borrado verificable.

No se añade un score inicial ni se denomina diagnóstico a la autoevaluación existente: el PRD
excluye una puntuación clínica y el MVP no implementa tal score en el flujo principal.

## Criterios de aceptación

1. El hero usa exclusivamente tokens de marca oficiales; deja de dominar la pantalla y presenta
   primero el paso de hoy y su progreso, sin depender del avatar para comprender la acción.
2. Los elementos del resumen, plan, chat y datos personales se mantienen navegables y no se
   ocultan; los controles opcionales se agrupan como secundarios.
3. Las cifras y el detalle del historial responden al período seleccionado.
4. Con cero registros no se muestra una gráfica vacía ni un listado repetitivo de días sin datos;
   se explica el estado y se señala el check-in como siguiente paso.
5. El historial con datos fluye en la página, sin scroll anidado ni límite de altura.
6. El enlace de salto queda visualmente oculto fuera de foco; al recibir foco de teclado es visible
   y navega al contenido principal.
7. El contenido del chat y la idea del día se presentan como una misma zona de acompañamiento,
   manteniendo sus disclosures y sin inventar evidencia.
8. En móvil (390 px) y escritorio (1440 px) no hay overflow horizontal; foco visible y contraste
   perceptible; movimiento reducido sigue respetándose.
9. Se mantienen los datos, el comportamiento y las rutas existentes; no hay cambios de red,
   dependencias ni almacenamiento.

## Pruebas y evidencia requerida

- TDD para el estado vacío, resumen por período y enlace de salto.
- Pruebas automatizadas actuales de app y accesibilidad.
- Revisión visual local a 390×844 y 1440×900, además de teclado, consola y recursos.
- Ejecutar `npm test`, `npm run lint`, `npm run build` y `npm run eval:security`.

## Validación realizada

- TDD: las pruebas focalizadas fallaron antes de la implementación; después, `npx vitest run
  src/app/BluApp.test.tsx src/app/visual-contract.test.ts` pasó (2 archivos, 52 pruebas).
- `npm test`: pasó (41 archivos, 359 pruebas).
- `npm run lint`: 0 errores; permanece 1 warning preexistente de `<img>` en
  `src/app/BluPresence.tsx`.
- `npm run build`: pasó, incluyendo TypeScript y generación de rutas.
- `npm run eval:security`: pasó (3 pruebas).
- `git diff --check`: pasó.
- Navegador local: revisados onboarding, dashboard vacío y dashboard con un check-in. A 390×844
  y 1440×900 no hubo overflow horizontal. El período seleccionado actualiza resumen y días;
  con datos, el historial fluye sin scroll interno.
- Teclado: el enlace de salto queda recortado visualmente fuera de foco; al llegar con Tab se
  muestra con anillo visible y Enter navega a `#contenido-principal`.
- `prefers-reduced-motion: reduce`: activo en ambas dimensiones; consola sin errores o warnings.
  Las solicitudes observadas durante la carga local fueron recursos de `localhost`.
- Producción (`https://blu-bay-kappa.vercel.app`) aún muestra el hero verde y el enlace de salto
  visible, a diferencia del build local. No se desplegó este cambio.
