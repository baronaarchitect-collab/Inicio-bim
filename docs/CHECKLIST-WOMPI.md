# Plataforma BIM: cuenta gratis + acceso PRO con Wompi (todo gratis)

**App:** https://baronaarchitect-collab.github.io/Inicio-bim/plataforma/

Flujo del producto:

1. **Cuenta gratis:** el usuario la crea con Google o con correo. Puede entrar, pero no ve el checklist.
2. **Pago:** paga con el link de Wompi `https://checkout.wompi.co/l/4O0ONc`.
3. **Activación:** Wompi avisa a un **Apps Script** (gratis). El script busca la cuenta con el **mismo correo** y escribe `checklistProUntil` (hoy + `ACCESS_DAYS`) en Firestore.
4. **Acceso:** la app escucha Firestore y desbloquea el checklist al instante, con proyectos, avance en la nube e idioma ES/EN.
5. **Dentro del checklist:** oferta de consultoría 1:1 en cada proyecto y al llegar al 100%.

Si el usuario pagó **antes** de crear la cuenta, o con un correo que aún no tenía cuenta, el pago queda guardado en `purchases/`. Al iniciar sesión, la app llama a `?action=claim` y el script aplica el pago. Para eso verifica el token de Firebase y exige el correo verificado (los de Google ya vienen verificados).

> Mientras `js/config.js → firebase.apiKey` empiece por `TU_`, el checklist corre en **modo demostración**: abierto y guardado en el dispositivo.

## Por qué es gratis
- **Firebase plan Spark:** Authentication y Firestore. No usa Cloud Functions.
- **Google Apps Script:** el servidor que recibe el webhook y escribe en Firestore con una cuenta de servicio.
- **GitHub Pages:** el hosting.

## 1. Firebase (plan gratuito Spark)
1. Entra a https://console.firebase.google.com y crea el proyecto, por ejemplo `lifecity-bim`.
2. En **Configuración → Tus apps → Web (</>)**, copia `apiKey`, `authDomain`, `projectId` y `appId` en `js/config.js → firebase`.
3. En **Authentication → Sign-in method**, habilita **Google** y **Correo/contraseña**.
4. En **Authentication → Settings → Authorized domains**, agrega `baronaarchitect-collab.github.io`.
5. En **Firestore Database**, crea la base en modo producción. En **Reglas**, pega el contenido de `firestore.rules` y publica.
6. En **Configuración → Cuentas de servicio → Generar nueva clave privada**, descarga el JSON. De él necesitas `client_email` y `private_key`.

## 2. Apps Script
1. Entra a https://script.google.com, crea un **Proyecto nuevo** y pega `wompi/Code.gs`.
2. En **Configuración del proyecto → Propiedades del script**, crea estas propiedades:

| Propiedad | Valor |
|-----------|-------|
| `PROJECT_ID` | id del proyecto de Firebase |
| `FIREBASE_API_KEY` | la `apiKey` web |
| `SA_EMAIL` | `client_email` del JSON |
| `SA_PRIVATE_KEY` | `private_key` del JSON, completa, con `-----BEGIN…` y los `\n` |
| `WOMPI_EVENTS_SECRET` | Wompi → Desarrolladores → **Secreto de eventos** |
| `PAYMENT_LINK_ID` | `4O0ONc` |
| `ACCESS_DAYS` | `30`, o los días que da cada pago |

3. Ve a **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario**.
4. Copia la URL que termina en `/exec` y pégala en `js/config.js → wompi.scriptUrl`. Si cambiaste los días, ajusta también `wompi.accessDays`.

## 3. Wompi
1. En **Desarrolladores → URL de eventos**, pega la URL `/exec` del Apps Script, tanto en producción como en sandbox si vas a probar.
2. Haz un pago de prueba y revisa los **Registros** del Apps Script:
   - Debe aparecer `Pago aprobado … → <uid>`.
   - Si aparece `Transacción de otro link`, el `payment_link_id` real no es `4O0ONc`. Copia el valor del registro en `PAYMENT_LINK_ID`, o déjalo vacío para aceptar todos tus links.
   - Si aparece `Firma de Wompi inválida`, revisa el secreto de eventos (el de producción y el de sandbox son distintos).

Wompi reintenta el aviso si no recibe respuesta. El script es idempotente: cada transacción se aplica una sola vez.

## 4. Publicar
Haz commit de `js/config.js` con `firebase` y `wompi.scriptUrl` y súbelo. GitHub Pages se actualiza solo.

## Notas
- **Renovación manual:** Wompi con link de pago no cobra automáticamente cada mes. Cada pago suma `ACCESS_DAYS` desde el vencimiento vigente, y la app avisa 7 días antes con un botón "Renovar".
- **Seguridad:** `checklistProUntil` y `purchases/` solo los escribe el Apps Script. Las reglas impiden que el navegador los toque, y `emailLower`, que vincula los pagos, solo puede ser el correo verificado del propio usuario.
- **Consultoría 1:1:** el botón lleva a la página de Consultoría del curso (`../#consult`), con su flujo de pago y agenda.

## Links PRO del marketplace y del tablero de coordinación
Las URLs de los playbooks y del dashboard de Overskill **no están en el código público**:
1. En el Apps Script, crea la propiedad `PRO_LINKS` con un JSON `{ "id": "url", … }`. Los ids están en `plataforma/catalog.js`.
2. Ejecuta `seedProLinks()` desde el editor (botón ▶). Eso copia los links a Firestore `proLinks/{id}`.
3. Las reglas solo dejan leer esos documentos a usuarios con `checklistProUntil` vigente.

Los archivos de Drive deben estar compartidos como "Cualquier persona con el enlace". Si no, el miembro PRO verá "Solicitar acceso".
