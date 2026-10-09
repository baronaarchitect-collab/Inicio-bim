# Despegue BIM · Life City BIM Management Hub

PWA estilo Duolingo para que **arquitectos e ingenieros de especialidades** aprendan BIM en 5 minutos al día con los playbooks de Life City. Sirve para crear el hábito con rachas, vidas, XP y recordatorios diarios, y lleva al alumno hacia la **consultoría 1:1** (pago + agenda).

## Ruta de aprendizaje (orden de los playbooks)

| # | Unidad | Fuente |
|---|--------|--------|
| 1 | Despegue: 3 mitos de BIM + guía de implementación | Playbook 1 · Tres mitos sobre iniciar en BIM |
| 2 | Pilar 1: Modelado (preparación, orden, control técnico) | Playbook 2 · Los 3 pilares |
| 3 | Pilar 2: Planimetría (conceptual, A-01…A-06, constructivos) | Playbook 2 |
| 4 | Pilar 3: Cantidades (m², ML, unidad, tablas) → 🎁 upsell | Playbook 2 |
| 5 | **Tu especialidad**: Arquitectura · Eléctrica · Hidrosanitaria · HVAC · Estructural | Playbook 2 · checklists |
| 6 | Coordinación y gestión BIM (auditorías, gate, sistema de coordinación, CDE, KPIs) → 🎁 upsell | Playbook 3 · Consultoría BIM |
| + | Extra: las demás especialidades se desbloquean al terminar la propia | — |

El tronco común es igual para todos. En el onboarding el alumno elige su especialidad y la unidad 5 cambia según esa elección.

## Funcionalidades

- **Ejercicios**: tarjeta de concepto, opción múltiple, verdadero/falso, completar la frase, ordenar pasos y emparejar. Si fallas un ejercicio, vuelve al final de la lección.
- **Gamificación**: 5 vidas (se recupera 1 cada 30 min, y también practicando), XP, meta diaria, racha 🔥, protector de racha 🧊 (se compra con gemas 💎), coronas por lección perfecta y 10 logros.
- **Recordatorios**: el alumno elige la hora en el onboarding. Hay varias capas:
  1. Notificación push real desde `server/` (opcional, funciona con la app cerrada).
  2. Periodic Background Sync (Chrome/Edge con la PWA instalada).
  3. Notification Triggers donde el navegador los soporte.
  4. Temporizador mientras la app está abierta, más un aviso al volver a abrirla.
  5. Respaldo: archivo `.ics` con un evento diario para Google Calendar.
- **Upsell a la consultoría 1:1**:
  - Pestaña ⭐ fija y nodo 🎁 en la ruta.
  - Aparece en estos momentos: al terminar los 3 pilares, al terminar la especialidad, al terminar el curso, con una racha de 7 días y al quedarse sin vidas (máximo una vez cada 3 días).
  - Flujo en 2 pasos: **Pagar** y luego **Agendar**.
  - Los links llevan UTM, perfil, % de avance, nombre y correo.
  - Puede enviar el lead a un webhook de **n8n**.
- **Suscripción PRO (freemium)**:
  - El Playbook 1 es gratis. Desde el Pilar 1 se pide cuenta (Firebase: Google o correo) y suscripción con PayPal.
  - Una Cloud Function verifica el pago con PayPal y un webhook mantiene el estado (renovación, cancelación, suspensión).
  - El progreso se sincroniza en la nube.
  - Configuración paso a paso: [docs/SUSCRIPCIONES.md](docs/SUSCRIPCIONES.md).
- **Videos de YouTube por lección** (sirven los no listados): botón "▶ Ver video" en la tarjeta de concepto y una 🎬 Videoteca en Practicar. Para agregarlos, pega los links en `js/videos.js`.
- **Offline**: el service worker guarda la app en caché. El progreso se guarda en `localStorage`, en el dispositivo.

## Configuración (`js/config.js`)

| Clave | Para qué |
|-------|----------|
| `upsell.paymentUrl` | Link de pago (Wompi, MercadoPago, Stripe, PayU…). **Hoy tiene un placeholder: reemplázalo.** |
| `upsell.bookingUrl` | Link de agenda (Calendly, Google Calendar booking…). **Hoy tiene un placeholder: reemplázalo.** |
| `upsell.priceLabel` | Ej. `'USD 120 · 60 min'`. Si está vacío, se muestra "Consulta el valor". |
| `upsell.leadWebhookUrl` | Webhook de n8n que recibe `{event, name, email, profile, progressPct, streak, xp}`. |
| `firebase` | Config web de Firebase. Con `TU_…` no hay cuentas ni muro de pago. |
| `paypal.clientId` / `paypal.planId` | Botón de suscripción de PayPal (valores públicos). |
| `premium.freeUnits` | Unidades gratuitas (por defecto `['u1']`). |
| `push.serverUrl` / `push.vapidPublicKey` | Activan el push real (ver abajo). |
| `heartRegenMinutes`, `xpPerLesson`, `streakFreezeCost`… | Ajustes de la gamificación. |

El contenido está en `js/content.js`. Para agregar una lección basta con agregar un objeto con el mismo esquema, y los tests validan su forma.

## Ejecutar

```bash
npm start        # sirve la app en http://localhost:8080
npm test         # valida el contenido y la lógica del juego
```

Para publicarla, sube la carpeta a cualquier hosting estático con HTTPS: GitHub Pages, Netlify, Vercel o Cloudflare Pages. No necesita build.

## Push real con la app cerrada (opcional)

```bash
cd server && npm install
npx web-push generate-vapid-keys
VAPID_PUBLIC=... VAPID_PRIVATE=... VAPID_SUBJECT=mailto:proyectos@lifecity.com.co ALLOWED_ORIGIN=https://tu-dominio npm start
```

Después pon `push.serverUrl` y `push.vapidPublicKey` en `js/config.js`. El servidor revisa cada minuto la hora local de cada alumno y solo notifica a quien no ha practicado ese día.

## Estructura

```
index.html            entrada de la PWA
css/styles.css        estilos (modo claro/oscuro, mobile-first)
js/config.js          configuración editable
js/content.js         lecciones por playbook y rutas por especialidad
js/engine.js          lógica pura: vidas, racha, XP, desbloqueos, logros, upsell
js/reminders.js       permisos y capas de recordatorio
js/videos.js          links de YouTube por lección
js/account.js         login Firebase, estado PRO, progreso en la nube
js/paypal.js          botón de suscripción de PayPal
functions/            Cloud Functions: activateSubscription + paypalWebhook
firestore.rules       el cliente no puede escribir "premium"
docs/SUSCRIPCIONES.md guía de configuración Firebase + PayPal
js/app.js             interfaz y navegación
sw.js                 offline, periodic sync, push y clic en notificación
server/               servidor push opcional (Node + web-push)
tests/                tests con node:test
```
