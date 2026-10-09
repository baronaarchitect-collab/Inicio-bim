// Configuración editable de Despegue BIM.
// Todo lo que cambia entre despliegues (links de pago, agenda, push) vive aquí.

export const CONFIG = {
  appName: 'Despegue BIM',
  brand: 'Life City BIM Management Hub',
  author: 'Juan David Barona',

  // Gamificación
  maxHearts: 5,
  heartRegenMinutes: 30, // 1 vida cada N minutos
  xpPerLesson: 10,
  xpPerfectBonus: 5,
  gemsPerLesson: 5,
  gemsPerfectBonus: 10,
  streakFreezeCost: 200,
  dailyGoalOptions: [
    { xp: 10, label: 'Casual', detail: '1 lección al día · ~5 min' },
    { xp: 20, label: 'Regular', detail: '2 lecciones al día · ~10 min' },
    { xp: 30, label: 'Serio', detail: '3 lecciones al día · ~15 min' },
    { xp: 50, label: 'Intenso', detail: '5 lecciones al día · ~25 min' }
  ],

  // Recordatorios
  defaultReminderTime: '19:00',
  push: {
    // Servidor opcional (ver server/README). Vacío = solo recordatorios locales.
    serverUrl: '',
    vapidPublicKey: ''
  },

  // Firebase (login + estado PRO). Mientras apiKey empiece por "TU_", la app funciona
  // sin cuentas y sin muro de pago (todo gratis). Ver docs/SUSCRIPCIONES.md.
  firebase: {
    apiKey: 'TU_API_KEY',
    authDomain: 'TU_PROYECTO.firebaseapp.com',
    projectId: 'TU_PROYECTO',
    appId: 'TU_APP_ID',
    functionsRegion: 'us-central1'
  },

  // Suscripción PRO con PayPal (client-id y plan son públicos; el secret va en Cloud Functions).
  paypal: {
    clientId: 'AeUsR4xqDPqAnX1ijFu6NzD7n_rQZ-rPD9NcTMe_qP7oezKL8XcZNIWSdEovwguX7_wHMwKs8wJwN_b8',
    planId: 'P-16844365R64407219NLEEUPQ',
    manageUrl: 'https://www.paypal.com/myaccount/autopay/'
  },

  // Producto de pago único: Checklist BIM (botón alojado de PayPal) + playbooks de regalo.
  checklist: {
    clientId: 'BAAwMWaLtA_WE3Al3WTZhvHGDiP1NuGusXOxcTlSxg5NVg0rIBfGV-HRoOYuCSM7XVRkV3RfmMAxSUT42o',
    hostedButtonId: 'QUCSGW7YDPB8A',
    currency: 'USD',
    title: 'Checklist BIM de despegue',
    subtitle: 'Los checklists de modelado, planimetría, cantidades y MEP listos para tu próximo proyecto en Revit.',
    includes: [
      '✅ Checklist de modelado arquitectónico',
      '✅ Checklist de planimetría (conceptual y constructiva)',
      '✅ Checklist de cantidades (m², ML, unidad)',
      '✅ Checklists eléctrico, hidrosanitario y HVAC'
    ],
    gifts: ['📘 Playbook Inicio BIM (3 mitos)', '📗 Playbook Modelado, Planimetría y Cantidades', '📙 Playbook Consultoría BIM'],
    delivery: 'Te enviamos el checklist y los 3 playbooks al correo de tu cuenta PayPal.'
  },

  premium: {
    title: 'Despegue BIM PRO',
    freeUnits: ['u1'], // Playbook 1 gratis como gancho
    benefits: [
      '🏛️ Los 3 pilares: modelado, planimetría y cantidades',
      '🛠️ Tu ruta de especialidad + todas las demás',
      '🧩 Coordinación y gestión BIM (Playbook 3)',
      '☁️ Progreso guardado en la nube en todos tus dispositivos',
      '🔥 Rachas, logros y recordatorios sin límites'
    ]
  },

  // Upsell: Consultoría 1:1 (Pago + agenda)
  upsell: {
    title: 'Consultoría BIM 1:1 · Auditoría 360°',
    subtitle: 'Llevamos lo que aprendiste a un proyecto real de tu oficina.',
    priceLabel: '', // ej. 'USD 120 · 60 min'. Vacío = "Consulta el valor".
    durationLabel: 'Sesión 1:1 en vivo · 60 min',
    // Reemplaza por tus links reales (Wompi, MercadoPago, Stripe, PayU...).
    paymentUrl: 'https://lifecity.com.co/pago-consultoria',
    // Reemplaza por tu link de agenda (Calendly, Google Calendar booking...).
    bookingUrl: 'https://lifecity.com.co/agenda-consultoria',
    // Opcional: webhook de n8n que recibe el lead cuando hace clic en pagar.
    leadWebhookUrl: '',
    contactWhatsapp: '573173371577',
    // No mostrar el mismo modal de upsell más de una vez en N días (salvo hitos).
    cooldownDays: 3
  }
};
