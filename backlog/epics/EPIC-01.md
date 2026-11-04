# EPIC-01 — Identidad, autenticación, consentimiento y privacidad

**Objetivo de épica:** permitir que cada persona tenga su propio espacio privado en Blu con
consentimiento informado, reversible y versionado, antes de cualquier dato en la nube.
Hoy el MVP es local-first: esta épica formaliza la identidad cuando exista backend (V1)
y el consentimiento diferenciado desde el MVP.

---

### BLU-101 — Registro mínimo sin datos innecesarios

> **Estado (2026-11-04, ciclo V1-prep):** Diseño V1 completo en `specs/012-v1-accounts/ (magic link, anti-enumeración, importación del export local, borrado ARCO; email cifrado fuera de logs)`. Implementación GATED a PRD §8.

> **Estado (2026-11-04):** Implementado el alcance local: apodo opcional (blu.profile.v1, máx. 24 caracteres, sin correo ni datos personales; src/lib/profile.ts + tests). El registro con correo verificado queda **gated a V1**: requiere backend y verificación (PRD §8, ADR-0001); ver nota en la historia.

**Historia:** Como persona usuaria, quiero crear una cuenta solo con mi correo, para usar Blu sin entregar datos que no necesita.
**Valor/contexto:** minimización de datos desde el primer paso; reduce superficie de privacidad y fricción. En el MVP no hay backend: esta historia diseña el flujo y lo implementa con almacenamiento local simulado, listo para conectar al backend de V1.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** MVP (diseño + flujo local), V1 (cuenta real)
**Dependencias:** ninguna.
**Gherkin:**
```gherkin
Escenario: Registro con solo correo
  Dado que una persona abre Blu por primera vez
  Cuando elige "crear cuenta" e ingresa un correo válido
  Entonces se crea su espacio y ve el aviso de consentimiento
  Y no se le piden nombre, edad, teléfono ni género

Escenario: Correo inválido
  Dado que una persona ingresa "correo-malo"
  Cuando intenta continuar
  Entonces ve un mensaje accesible indicando que el correo no es válido
```
**Casos:** positivo — correo válido aceptado. Negativo — correos malformados rechazados con mensaje claro. Límite — correos de más de 254 caracteres; doble envío del formulario no crea dos espacios.
**Accesibilidad y seguridad:** formulario operable por teclado y lector de pantalla; sin autocompletado de datos sensibles; verificación de correo sin enumerar usuarios (mismo mensaje para "existe" y "nuevo" en V1 con backend).
**Evidencia requerida:** pruebas unitarias de validación de correo; prueba E2E del flujo; registro de decisión sobre verificación (magic link vs OTP) en ADR o spec.
**DoR:** alcance local vs backend definido; copy de privacidad revisado.
**DoD:** flujo implementado y probado; ningún campo extra persistido; documentación de minimización actualizada.

---

### BLU-102 — Consentimiento versionado y diferenciado por propósito

**Historia:** Como persona usuaria, quiero saber qué se hace con mis datos y poder aceptar o rechazar cada finalidad por separado, para decidir con información.
**Valor/contexto:** base legal y ética del producto; el consentimiento actual del prototipo es un único checkbox — se convierte en registro versionado con propósitos separados (funcionamiento, mejora del producto, investigación).
**Prioridad:** P0 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-101.
**Gherkin:**
```gherkin
Escenario: Aceptar solo el propósito operativo
  Dado el aviso de consentimiento con tres propósitos listados
  Cuando acepto solo "guardar mi plan y registros"
  Entonces puedo usar Blu normalmente
  Y ningún dato se usa para investigación ni mejora

Escenario: Retirar un consentimiento
  Dado que acepté "mejora del producto" hace días
  Cuando lo retiro desde privacidad
  Entonces el cambio queda registrado con fecha y versión del aviso
  Y mi uso del producto no se ve afectado

Escenario: Versión nueva del aviso
  Dado que cambia el texto del aviso a la versión 2
  Cuando vuelvo a Blu
  Entonces debo revisar y decidir de nuevo antes de continuar
```
**Casos:** positivo — aceptar/rechazar por propósito. Negativo — rechazar todo impide guardar datos (mensaje honesto, sin bloqueo engañoso). Límite — consentimiento de menores: se declara no dirigido a menores y se bloquea registro con fecha de nacimiento < 18 (V1 con backend).
**Accesibilidad y seguridad:** textos en lenguaje claro (nivel lectura media); cada propósito con ejemplo concreto; decisión registrada (versión, fecha, acción) sin contenido sensible.
**Evidencia requerida:** pruebas del registro de consentimiento (versión + fecha + acción); prueba de re-prompt ante nueva versión; revisión del copy por al menos una persona externa.
**DoR:** textos de aviso aprobados; modelo de datos de consentimiento definido en spec.
**DoD:** `ConsentRecord` versionado implementado; pruebas verdes; copy publicado en repo.

---

### BLU-103 — Panel de privacidad: ver, exportar y borrar

**Historia:** Como persona usuaria, quiero ver qué datos tengo en Blu, exportarlos y borrarlos, para mantener el control.
**Valor/contexto:** derechos ARCO; el prototipo ya borra localmente — se extiende con exportación legible y panel visible. El MVP exporta JSON legible descargable.
**Prioridad:** P1 · **Tamaño:** M · **Fase:** MVP
**Dependencias:** BLU-102.
**Gherkin:**
```gherkin
Escenario: Exportar mis datos
  Dado que tengo hábitos y registros guardados
  Cuando elijo "exportar mis datos"
  Entonces descargo un archivo JSON con todo mi estado y la versión del formato

Escenario: Borrar todos los datos
  Dado que confirmo el borrado en el panel
  Cuando se ejecuta
  Entonces la clave local desaparece, se verifica y vuelvo al onboarding

Escenario: Borrado fallido
  Dado que el navegador impide el borrado
  Cuando falla la operación
  Entonces veo un error visible con instrucción para borrar desde el navegador
```
**Casos:** positivo — exportar/borrar con confirmación. Negativo — cancelar la confirmación no borra nada. Límite — estado vacío: exportar informa que no hay datos; borrar sin datos confirma sin error.
**Accesibilidad y seguridad:** confirmación con texto (no solo color); el archivo exportado no incluye datos de terceros; nada se envía a servidor en MVP.
**Evidencia requerida:** pruebas del formato de exportación (esquema versionado); prueba del fallo de borrado simulado; verificación manual documentada.
**DoR:** esquema de exportación definido; copy aprobado.
**DoD:** panel implementado; pruebas verdes; documentación de formato en `docs/`.

---

### BLU-104 — Aislamiento de datos entre personas (backend V1)

> **Estado (2026-11-04, ciclo V1-prep):** Diseño completo en `specs/009-v1-isolation-rls/` (propiedad por `owner_id`, políticas RLS ejecutables sin bypass de servicio, matriz de 6 pruebas de aislamiento, migración desde export v1.0.0, preguntas para aprobadores). Implementación sigue **GATED** a PRD §8.

**Historia:** Como persona usuaria, quiero que nadie más vea mis datos, para confiar en Blu.
**Valor/contexto:** cuando exista backend, el aislamiento se garantiza con autorización en servidor y RLS; sin esto no hay V1 con cuentas.
**Prioridad:** P0 · **Tamaño:** L · **Fase:** V1
**Dependencias:** BLU-101 (backend), BLU-102, ADR de persistencia (EPIC-14).
**Gherkin:**
```gherkin
Escenario: Acceso cruzado bloqueado
  Dado dos cuentas con datos distintos
  Cuando una intenta leer el estado de la otra vía API
  Entonces recibe 403 o los datos de su propia cuenta, nunca los ajenos

Escenario: Token de otra sesión
  Dado un token válido de la cuenta B
  Cuando la cuenta A lo usa para consultar
  Entonces el sistema solo expone datos de B si es su token, o rechaza la operación
```
**Casos:** positivo — cada cuenta solo ve lo suyo. Negativo — IDs secuenciales no permiten enumerar. Límite — datos compartidos explícitamente (futuro) quedan fuera de MVP y deben diseñarse aparte.
**Accesibilidad y seguridad:** autorización verificada en servidor (nunca solo en cliente); pruebas de penetración básicas; RLS con políticas por usuario; logs sin contenido sensible.
**Evidencia requerida:** suite de integración con casos de acceso cruzado; informe de escaneo (zap/sqlmap básico) archivado; revisión de políticas RLS.
**DoR:** ADR de persistencia aprobado; entorno de pruebas con dos usuarios semilla.
**DoD:** políticas RLS activas; pruebas de aislamiento verdes; sin PII en logs verificado.

---


> **Estado (2026-11-04):** **GATED a V1** — requiere backend/cuentas/sincronización; bloqueada por PRD §8 y constitución II/X hasta aprobaciones de privacidad, seguridad, revisión científica, ética y análisis jurídico (ADR-0001).
### BLU-105 — Cierre de sesión y caducidad segura

> **Estado (2026-11-04, ciclo V1-prep):** Diseño completo en `specs/010-v1-sessions/ (politica: 15 min/30 días, rotación con detección de reuso, inactividad 7 días, tokens en memoria, 4 pruebas)`. Implementación GATED a PRD §8.

**Historia:** Como persona usuaria, quiero cerrar sesión y que mi sesión caduque sola, para proteger mi información en dispositivos compartidos.
**Valor/contexto:** STRIDE (suplantación). En MVP local equivale a "salir" que limpia la vista sin borrar datos; en V1, tokens con caducidad y revocación.
**Prioridad:** P2 · **Tamaño:** S · **Fase:** V1
**Dependencias:** BLU-101 (backend), BLU-104.
**Gherkin:**
```gherkin
Escenario: Cierre de sesión
  Dado una sesión activa
  Cuando elijo "salir"
  Entonces el token se revoca y debo autenticarme de nuevo

Escenario: Caducidad por inactividad
  Dado una sesión inactiva por el período definido
  Cuando intento usar una función protegida
  Entonces se me pide autenticarme nuevamente
```
**Casos:** positivo — logout revoca. Negativo — token revocado usado de nuevo es rechazado. Límite — caducidad configurable sin exceder 30 días.
**Evidencia requerida:** pruebas de revocación y caducidad; documentación de política de sesión.
**DoR:** política de sesión definida en spec.
**DoD:** pruebas verdes; política documentada.

> **Estado (2026-11-04):** **GATED a V1** — requiere backend/cuentas/sincronización; bloqueada por PRD §8 y constitución II/X hasta aprobaciones de privacidad, seguridad, revisión científica, ética y análisis jurídico (ADR-0001).
