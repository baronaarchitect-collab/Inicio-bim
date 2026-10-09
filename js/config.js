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
