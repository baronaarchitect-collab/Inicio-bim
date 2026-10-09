# Suscripción PRO: Firebase + PayPal

El modelo es **freemium**:
- **Gratis:** el Playbook 1 (3 mitos + guía de implementación).
- **PRO:** desde el Pilar 1 en adelante. El alumno crea su cuenta (Google o correo) y se suscribe con el botón de PayPal.

Una **Cloud Function** confirma el pago directamente con PayPal y activa al usuario. Un **webhook** mantiene el estado al día: renovaciones, cancelaciones y suspensiones.

> Mientras `js/config.js → firebase.apiKey` empiece por `TU_`, no hay cuentas ni muro de pago y todo el curso queda abierto. Así el sitio publicado no se rompe mientras configuras.

## Cómo funciona

```
Alumno ──(1) login Firebase──▶ Auth
   │
   ├─(2) Botón PayPal: plan P-16844365R64407219NLEEUPQ, custom_id = uid
   │        └─▶ PayPal devuelve subscriptionID (I-XXXX)
   │
   ├─(3) activateSubscription(subscriptionID)  [Cloud Function, con su token]
   │        └─▶ GET PayPal /v1/billing/subscriptions/{id}
   │            valida plan + custom_id + status ACTIVE
   │            └─▶ users/{uid}.premium = true
   │
   └─(4) La app escucha users/{uid} en Firestore → desbloquea PRO al instante

PayPal ──webhook──▶ paypalWebhook → verifica la firma → consulta la suscripción → actualiza premium
                  (CANCELLED / SUSPENDED / EXPIRED → premium = false)
```

El navegador **no puede** escribir `premium`. Lo impiden las reglas de `firestore.rules`, y solo las Functions (Admin SDK) pueden cambiarlo.

## Pasos de configuración (una sola vez)

### 1. Firebase
1. Entra a https://console.firebase.google.com, crea el proyecto (ej. `despegue-bim`) y actívale el **plan Blaze**. Las Cloud Functions que llaman a PayPal lo requieren; el uso de este caso suele quedar dentro de la capa gratuita.
2. Ve a **Configuración del proyecto → Tus apps → Web (</>)** y registra la app. Copia `apiKey`, `authDomain`, `projectId` y `appId` en `js/config.js → firebase`.
3. En **Authentication → Sign-in method**, habilita **Google** y **Correo electrónico/contraseña**.
4. En **Authentication → Settings → Authorized domains**, agrega `baronaarchitect-collab.github.io`, o tu dominio si usas otro.
5. En **Firestore Database**, crea la base de datos en modo producción.
6. En `.firebaserc`, cambia `TU_PROYECTO` por el ID de tu proyecto.

### 2. PayPal
1. Entra a https://developer.paypal.com → **Apps & Credentials** (pestaña **Live**) y abre la app cuyo Client ID empieza por `AeUsR4xq…`. Copia el **Secret**.
   - Verifica que el plan `P-16844365R64407219NLEEUPQ` pertenezca a esa misma cuenta.
2. El webhook se crea después del deploy (paso 4).

### 3. Deploy de las Functions y las reglas
```bash
npm install -g firebase-tools
firebase login
cp functions/.env.example functions/.env          # PAYPAL_CLIENT_ID, PAYPAL_PLAN_ID, PAYPAL_ENV=live
firebase functions:secrets:set PAYPAL_CLIENT_SECRET   # pega el Secret de PayPal
firebase functions:secrets:set PAYPAL_WEBHOOK_ID      # por ahora escribe "pendiente"; lo cambias en el paso 4
firebase deploy --only functions,firestore:rules
```
El deploy imprime la URL de `paypalWebhook`.

### 4. Webhook en PayPal
1. En la app de PayPal, ve a **Webhooks → Add Webhook** y pega la URL de `paypalWebhook`.
2. Selecciona estos eventos:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.RE-ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `PAYMENT.SALE.COMPLETED`
3. Copia el **Webhook ID** y guárdalo como secreto:
   ```bash
   firebase functions:secrets:set PAYPAL_WEBHOOK_ID
   firebase deploy --only functions
   ```

### 5. Publicar
Haz commit de `js/config.js` (ya con tu `firebase`) y súbelo. GitHub Pages se actualiza solo.

La `apiKey` de Firebase y el Client ID de PayPal son públicos por diseño. El **Secret** y el **Webhook ID** viven solo en Secret Manager y nunca se suben a git.

## Probar sin cobrar (sandbox)
1. En developer.paypal.com, pestaña **Sandbox**, crea una app y un plan de prueba.
2. Pon el Client ID y el plan de sandbox en `js/config.js → paypal` y en `functions/.env`, con `PAYPAL_ENV=sandbox`. Crea un webhook de sandbox apuntando a la misma función.
3. Paga con una cuenta *personal* de sandbox.
4. Revisa en Firestore que `users/{uid}.premium` quede en `true`.
5. Cancela la suscripción desde la cuenta de sandbox y confirma que vuelva a `false`.

Cuando todo funcione, regresa a los valores live.

## Gestión
- **Ver suscriptores:** Firestore → `users` (campos `premium` y `subscription.status`).
- **Logs:** `firebase functions:log`.
- **Cancelar:** el alumno cancela desde su PayPal (botón "Gestionar en PayPal" en su perfil), y el webhook quita PRO.
- **Cambiar qué es gratis:** `js/config.js → premium.freeUnits`.
