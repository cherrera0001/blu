# Spec de diseño V1: Cuentas con correo verificado (BLU-101-V1) — gated

**Estado:** diseño preparatorio · **Fase:** V1 · **Relaciona:** BLU-104/105 · ADR-0002

> Diseño, no implementación. El correo es el único dato de identidad obligatorio; todo lo demás
> sigue siendo opt-in (constitución II: minimización).

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
