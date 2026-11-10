# Sistema gráfico de Blu

## Fuentes originales (Fase 1)

| Recurso | Ruta local | Dimensiones | Formato |
|---|---|---|---|
| blu-newspaper.png | `design/blu-source/blu-newspaper.png` | 1208×1302 | PNG RGBA |
| blu-builder.png | `design/blu-source/blu-builder.png` | 1254×1254 | PNG RGBA |
| blu-surprise.mp4 | `design/blu-source/blu-surprise.mp4` | vídeo | MP4 (~2.5 MB) |
| Fotogramas | `design/blu-frames/frame-001..020.png` | 720×405 | PNG |
| Contact sheet | `design/blu-frames/contact-sheet.png` | 2880×810 | PNG |

Los PNG de `public/` coinciden byte a byte con los originales descargados (`cmp` = 0).

## Análisis visual (Fase 2)

### Silueta
- **Newspaper / builder (PNG):** cuerpo en gota / blob, base ancha, ápice redondeado.
- **Vídeo companion:** más ovoide / huevo (estudio claro), manos con dedos y gesto finger-heart + corazón flotante (frame-018).
- Piernas: dos elipses/cilindros cortos integrados a la base.
- Brazos: apéndices tubulares sin codos marcados; newspaper/builder sin dedos visibles.

### Paleta HEX (muestreo + referencias)

| Token | HEX | Uso |
|---|---|---|
| body-hi | `#A8D8F8` | Highlight superior izquierdo |
| body-mid | `#60B8F8` | Volumen medio |
| body-deep | `#1878F8` | Sombra inferior |
| body-shadow | `#1070F8` | Piernas / AO |
| eye | `#1A1A1B` | Ojos y trazos faciales |
| mouth-inner | `#0E5AD0` | Interior de sonrisa abierta |
| paper | `#D0D0D0` | Periódico |
| helmet | `#FFD54A` | Casco constructor |
| belt | `#A06A3F` | Cinturón |

### Expresiones verificadas
- **Newspaper**: sonrisa suave, ojos abiertos ovalados, brazos sujetando periódico.
- **Builder**: sonrisa abierta, casco amarillo, cinturón, plano enrollado, brazo en saludo.
- **Vídeo**: saludo con mano; ojos cerrados + gesto corazón; postura frontal sin props.

### Diferencias entre versiones
- Raster 3D (holablu PNG) tiene shading clay más rico; SVG prioriza geometría editable y fidelidad de silueta/paleta/accesorios.
- El estilo **companion** (vídeo) introduce manos con dedos — solo en variantes companion/master/happy/resting derivadas del vídeo.

## Vectorización (Fases 3–4)

Directorio: `public/blu/svg/`

| Archivo | Rol |
|---|---|
| blu-master.svg | Versión principal (saludo) |
| blu-neutral.svg | Expresión neutra |
| blu-happy.svg | Alegre + saludo |
| blu-surprised.svg | Sorpresa |
| blu-resting.svg | Reposo + gesto cariño (vídeo) |
| blu-companion.svg | Tercer estilo de avatar (evolución del vídeo) |
| blu-builder.svg | Constructor (casco/cinturón/plano) |
| blu-reading.svg | Leyendo periódico |
| blu-icon.svg | Icono UI simplificado |

Grupos SVG identificables: `#body`, `#legs`, `#arms`, `#face`, `#prop-*`.
ViewBox consistente: `0 0 200 220`. Sin rasters embebidos.

## Uso en app

- Raster oficial holablu: `/blu-newspaper.png`, `/blu-builder.png` (poses legacy).
- Tercer estilo: SVG companion + expresiones por estado de presencia.
- Pose `companion` en `readCompanion` cuando el ánimo es `encouraging`.

## Fidelidad

| Criterio | Estado |
|---|---|
| Silueta reconocible | Sí |
| Paleta alineada a muestreo | Sí |
| Geometría SVG editable | Sí (paths/elipses, sin base64) |
| Accesorios newspaper/builder | Presentes en variantes dedicadas |
| Shading 3D pixel-perfect | No — aproximación vectorial deliberada |
| Dedos | Solo donde el vídeo lo verifica |

## Animación (recomendaciones)

- CSS: `transform` en `#arms` / `#face` para bob y blink.
- SVG SMIL/CSS: swap de `#face` children por estado.
- Rive: exportar grupos `#body/#arms/#face` como artboards con state machine idle→wave→heart.
