# Feature Specification: Chat remoto y voz (BLU-1006/1007) — DRAFT, gated

**Branch**: `015-remote-chat-voice` · **Created**: 2026-11-04 · **Status**: **Draft — NO implementar**
**Gate**: PRD §8 (privacidad, seguridad, retención, contratos, ciencia, ética, jurídico) + presupuesto aprobado.

> Documento de diseño listo para ejecutar tras aprobaciones. **Ningún código de esta spec
> debe implementarse antes del visto bueno documentado** (ADR-0003, constitución II/X).
>
> Nota de alcance (2026-11-05): la opción estrecha de Azure TTS de respuestas existentes se
> implementa en specs/014 como excepción opt-in y desactivada por defecto. El **chat remoto de
> texto** se desbloqueó e implementó por separado (ADR-0005, enmienda PRD §8) con proveedor
> intercambiable vía BFF; esta spec conserva su valor para las piezas que siguen gated:
> reconocimiento de voz (STT) en la nube, voz-a-voz continuo y el pipeline de audio completo.

## Requisitos separados (no inferir consentimiento)

| Requisito | Consentimiento propio | Retención |
|---|---|---|
| Chat de texto remoto | Sí, aviso por conversación | 0 (no persistir) |
| Micrófono / audio | Sí, específico antes de activar | 0; transcripción visible antes de enviar |
| Transcripción cloud | Solo si el proveedor está aprobado | Según contrato |
| Voz sintetizada local | Implementado (specs/014) | 0 |
| Voz sintetizada cloud | Solo si aprobada | Según contrato |

## Arquitectura (ruta B, ADR-0003)

```
navegador → POST /api/assistant (Route Handler, clave solo en servidor)
  → guardián de entrada (crisis/clínica/boundary ⇒ respuesta segura, sin llamar proveedor)
  → proveedor sustituible (AssistantProvider remoto; timeout 10 s)
  → guardián de salida (afirmaciones prohibidas ⇒ reemplazo + evento)
  → respuesta + metadatos (sin persistencia, sin logs de contenido)
```

## Criterios verificables (al implementar)

1. Proveedor no invocado ante entrada bloqueada (test con proveedor espía).
2. Salida no se muestra hasta pasar el guardián (test de reemplazo).
3. Timeout/caída ⇒ mensaje visible y seguro; modo local como fallback.
4. Cero claves en bundle/logs; solo variable de servidor (nunca `NEXT_PUBLIC_`).
5. Límites: longitud máxima, cuota por sesión, alerta de gasto (presupuesto duro).
6. Red team clínica/crisis/inyección + controles benignos (suite existente, ampliada).
7. Reconocimiento de voz solo con `processLocally` comprobable + `available()`; si no, micrófono desactivado y texto completo.
8. Consentimiento de micrófono/audio independiente del consentimiento general.

## Plan de desbloqueo (para quien aprueba)

1. Resolver preguntas de specs/009–013 según aplique + EIPD y contrato de tratamiento.
2. Seleccionar proveedor **por retención y condiciones verificadas**, no por cuota $0.
3. Piloto cerrado con acceso controlado, límites y alertas de gasto.
4. Solo entonces implementar esta spec con TDD y la suite de seguridad completa.
