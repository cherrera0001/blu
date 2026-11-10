# Spec de diseño V1: Sesiones y caducidad segura (BLU-105) — gated

**Estado:** diseño preparatorio · **Fase:** V1 · **Relaciona:** BLU-104 · THREAT_MODEL (suplantación)

> Diseño, no implementación. Supone la base de ADR-0002 (Supabase Auth o equivalente gestionado).

## Política de sesión

| Parámetro | Valor | Justificación |
|---|---|---|
| Access token | 15 min, rotación automática | ventana de exposición mínima |
| Refresh token | 30 días, rotación con detección de reutilización | reutilización detectada ⇒ revocar familia completa |
| Inactividad | cierre tras 7 días sin uso | dispositivos compartidos olvidados |
| Revocación | inmediata por usuario y por administrador (incidente) | STRIDE suplantación |
| Cierre de sesión | revoca refresh + invalida access en lista corta (jti, 15 min) | cierre efectivo, no cosmético |

## Decisiones

1. **Tokens solo en memoria de la pestaña** (no `localStorage`): mitiga XSS exfiltrando tokens
   persistentes; el costo (re-login al recargar) se acepta para datos de bienestar.
2. **Sin "recordarme"** en V1: un solo dispositivo compartido justifica la fricción.
3. **Caducidad de sesión visible**: aviso a los 12 min de inactividad en formularios sensibles
   (adaptación, consentimiento), con opción de extender (desliza el cierre).
4. **Eventos de sesión** (login, logout, revocación, rotación sospechosa) registrados como
   `security_event` **sin PII** (ver specs/011: solo categoría + timestamp + hash de sesión).

## Plan de pruebas (al implementar)

1. Revocación: tras logout, el refresh token queda inválido (rechazo verificado).
2. Rotación: reusar un refresh rotado revoca la familia.
3. Inactividad: pasados 7 días, la sesión exige re-autenticación.
4. Cierre remoto (simulado desde otro dispositivo) invalida la pestaña activa en ≤15 min.

## Preguntas para aprobadores

1. ¿Proveedor de identidad aceptable (residencia, términos)?
2. ¿Criterio de incidente que dispare revocación masiva?
