# Spec de diseño V1: Cuentas con correo verificado (BLU-101-V1) — gate abierto por fases

**Estado:** diseño aprobado para construcción (ADR-0006, gate V1 2026-11-05); activación en
producción condicionada a firmas C1–C3/C5 · **Fase:** V1 · **Relaciona:** BLU-104/105 · ADR-0002/0006

> Construcción habilitada sin crear recursos cloud; activación solo por `SUPABASE_*` configuradas
> por el dueño del producto. El correo es el único dato de identidad obligatorio; todo lo demás
> sigue siendo opt-in (constitución II: minimización). Ver EIPD-V1 (borrador) antes de producción.

**Implementación (2026-11-05, primera vertical):**
- `src/lib/v1/config.ts` — activación exclusiva por `SUPABASE_URL` + `SUPABASE_ANON_KEY`
  (sin ellas: app local intacta, `/cuenta` muestra aviso honesto).
- `src/lib/v1/account-store.ts` — cliente Auth REST mínimo (fetch, cero dependencias):
  signIn/signUp/signOut/restoreSession; errores estables (nunca mensajes crudos del servidor);
  sesión en localStorage (`blu.account.v1`) sin contraseña; signUp exige consentimiento del
  propósito «sincronización»; la anon key es pública por diseño (RLS es la frontera real).
- `src/app/cuenta/` — pantalla accesible (etiquetas, aria-live, validación de correo y
  contraseña ≥ 8); modo local honesto cuando V1 no está configurado.
- Pendiente sobre esta base: verificación de correo, caducidad/rotación (specs/010), tablas
  con RLS owner-only (specs/009) y montaje en navegación (diferido a limpiar WIP ajeno).

## Flujo

1. **Registro**: correo (+ apodo opcional, reutiliza `blu.profile.v1` si existe local).
2. **Verificación**: **magic link** sobre OTP — justificación: sin código que transcribir
   (accesibilidad), sin secreto de un solo uso almacenado en texto plano, mismo canal.
3. **Anti-enumeración**: respuesta idéntica para «correo nuevo» y «correo existente»
   («Si el correo es válido, te enviamos un enlace»); el enlace de un correo existente ofrece
   login silencioso.
4. **Primera sesión**: oferta de importar el estado local (`blu-export-*.json`) una vez;
   tras confirmar sincronización, el estado local se marca como importado (copia de respaldo).
5. **Borrado de cuenta**: mismo contrato que el borrado local — listado de categorías
   eliminadas + verificación (specs/009, ARCO).

## Esquema

```ts
interface Account {
  userId: string;         // del proveedor de identidad
  email: string;          // cifrado en reposo (pgsodium/app-level); índice por hash
  createdAt: string;
  emailVerifiedAt: string;
  deletedAt: string | null;
}
```

- `email` nunca en logs ni telemetría (BLU-1404: `product_event` no lo transporta).
- Apodo: opcional, mismo límite de 24 caracteres del MVP.

## Decisiones

1. **Sin contraseña en V1** (magic link = factor posesión). Evaluar segundo factor solo si el
   análisis de riesgo lo exige documentado.
2. **Cambio de correo**: verifica el nuevo antes de activarlo; el antiguo recibe aviso.
3. **Menores**: flujo bloqueado con fecha de nacimiento < 18 (V1 con backend la valida en
   servidor; el copy del MVP ya lo declara).

## Plan de pruebas (al implementar)

1. Respuesta idéntica para correo nuevo/existente (diferencia de tiempos < umbral razonable).
2. Magic link: uso único, expira en 15 min, inválido tras primer uso.
3. Importación local: conteo verificado por categoría contra el export.
4. Borrado: 0 filas tras purga + confirmación con el mismo contrato del borrado local.

## Preguntas para aprobadores

1. ¿Proveedor de email transaccional (residencia, retención de logs)?
2. ¿Cifrado de columna email a nivel aplicación o del proveedor (justificar)?
