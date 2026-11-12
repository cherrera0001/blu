# Encargo de arte — 3 poses de Blu (H4, ola C)

**Por qué:** hoy Blu tiene 2 rasters 3D. En «esperando» y «descansando» (incluso cuando la persona vuelve tras
días sin entrar) Blu **lee el periódico**, y para celebrar lleva **casco de obra**. Para alguien que llega en
soledad, eso cuenta que Blu está ocupado en lo suyo, o que lo importante es producir.
Ver `docs/ux/revision-critica-mobile-0.4.md` H4.

## Estilo (no negociable)
- El **mismo** render 3D que `apps/mobile/assets/blu-newspaper.png` y `blu-builder.png`: gota azul, material suave y brillante, ojos ovalados oscuros, sin contorno.
- PNG con fondo transparente, **1200 × 1300 px**, el personaje centrado y los pies en el mismo borde inferior que las poses actuales (para que no «salte» al cambiar).
- Sin texto, sin objetos de trabajo, sin elementos médicos (cruces, fonendoscopio, pastillas), sin corazones gigantes ni sparkles.
- No usar las poses planas 2D de 512 px que hay sin versionar en `assets/`: es otro estilo.

## Las 3 poses
| Archivo | Ánimo (`readCompanion`) | Cuándo se ve | Qué debe transmitir | Referencia de gesto |
|---|---|---|---|---|
| `blu-welcome.png` | `waiting` | Día sin marcas todavía; primera vez | «Qué bueno verte», sin pedir nada | Mira de frente, un brazo levemente abierto, sonrisa tranquila |
| `blu-beside.png` | `resting` | La persona vuelve tras 2 o más días sin marcar | «Aquí sigo, a tu lado», sin reproche | Sentado o apoyado de lado, ojos suaves, cuerpo relajado; **nunca** dormido ni triste |
| `blu-glad.png` | `encouraging` / `celebrate` / `thriving` | Dio al menos un paso hoy | Alegría suave, compartida | Manos juntas o un saludo pequeño, ojos sonrientes; sin saltos eufóricos ni trofeos |

## Integración (una vez entregadas)
1. Copiar los PNG a `apps/mobile/assets/`.
2. En `apps/mobile/src/components/BluCompanion.tsx`, función `assetFor`: `waiting → welcome`, `resting → beside` y el resto → `glad`. El periódico y el casco salen del flujo diario.
3. Verificar en un teléfono que el cambio de pose al marcar se lea como el mismo personaje (la reacción H7 ya anima el cambio).
4. Revisar el peso: con las 3 poses a ~800 KB, el bundle de assets ronda 3,5 MB. Comprimir con `pngquant` (calidad 80–90) si supera ese número.
