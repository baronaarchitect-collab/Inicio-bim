// Recordatorios diarios para generar frecuencia.
//
// Capas (de más a menos confiable), todas opcionales y combinables:
//  1. Push real desde servidor (server/push-server.mjs) si CONFIG.push está configurado.
//  2. Periodic Background Sync (Chrome/Edge con la PWA instalada).
//  3. Notification Triggers (showTrigger) donde el navegador lo soporte.
//  4. Temporizador mientras la app esté abierta + aviso al volver a abrirla.

import { CONFIG } from './config.js';
import { reminderMessage, nextReminderDate, dayKey } from './engine.js';

const STATE_URL = './__reminder_state';
const CACHE = 'despegue-reminders';
let timer = null;

export function notificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function permission() {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

async function registration() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function showNow(title, body) {
  const reg = await registration();
  if (!reg || permission() !== 'granted') return false;
  await reg.showNotification(title, {
    body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'despegue-daily',
    data: { url: './#home' }
  });
  return true;
}

// Guarda un resumen del estado para que el service worker decida si notificar.
async function writeSnapshot(state) {
  if (!('caches' in window)) return;
  const msg = reminderMessage(state);
  const snapshot = {
    enabled: state.notificationsEnabled,
    reminderTime: state.reminderTime,
    streakDate: state.streakDate,
    title: msg.title,
    body: msg.body,
    updatedAt: new Date().toISOString()
  };
  try {
    const cache = await caches.open(CACHE);
    await cache.put(STATE_URL, new Response(JSON.stringify(snapshot), { headers: { 'Content-Type': 'application/json' } }));
  } catch {
    /* almacenamiento bloqueado: seguimos con las otras capas */
  }
}

async function registerPeriodicSync() {
  const reg = await registration();
  if (!reg || !('periodicSync' in reg)) return;
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state !== 'granted') return;
    await reg.periodicSync.register('daily-reminder', { minInterval: 6 * 60 * 60 * 1000 });
  } catch {
    /* no soportado */
  }
}

async function scheduleTrigger(state) {
  const reg = await registration();
  if (!reg || typeof window.TimestampTrigger === 'undefined') return;
  try {
    const pending = await reg.getNotifications({ tag: 'despegue-scheduled', includeTriggered: false });
    pending.forEach((n) => n.close());
    const when = nextReminderDate(state);
    const msg = reminderMessage(state);
    await reg.showNotification(msg.title, {
      body: msg.body,
      tag: 'despegue-scheduled',
      icon: './icons/icon-192.png',
      showTrigger: new window.TimestampTrigger(when.getTime()),
      data: { url: './#home' }
    });
  } catch {
    /* no soportado */
  }
}

function scheduleLocalTimer(state) {
  clearTimeout(timer);
  const delay = nextReminderDate(state) - new Date();
  if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
    timer = setTimeout(() => {
      const msg = reminderMessage(state);
      showNow(msg.title, msg.body);
    }, delay);
  }
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function syncPushServer(state) {
  const { serverUrl, vapidPublicKey } = CONFIG.push;
  if (!serverUrl || !vapidPublicKey) return;
  const reg = await registration();
  if (!reg || !('pushManager' in reg)) return;
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) });
    }
    await fetch(`${serverUrl.replace(/\/$/, '')}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub,
        reminderTime: state.reminderTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        name: state.name,
        streak: state.streak,
        lastPracticeDate: state.streakDate,
        message: reminderMessage(state)
      })
    });
  } catch {
    /* servidor no disponible: quedan las capas locales */
  }
}

// Llamar cada vez que cambia el estado relevante (lección completada, hora, permiso).
export async function sync(state) {
  await writeSnapshot(state);
  if (!state.notificationsEnabled || permission() !== 'granted') {
    clearTimeout(timer);
    return;
  }
  scheduleLocalTimer(state);
  await Promise.all([registerPeriodicSync(), scheduleTrigger(state), syncPushServer(state)]);
}

// Al abrir la app después de la hora del recordatorio sin haber practicado.
export function missedReminderToday(state, now = new Date()) {
  if (state.streakDate === dayKey(now)) return false;
  const [h, m] = state.reminderTime.split(':').map(Number);
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  return now >= t;
}

// Evento .ics recurrente como respaldo para quien no acepte notificaciones.
export function calendarIcs(state) {
  const [h, m] = state.reminderTime.split(':');
  const start = new Date();
  const stamp = `${dayKey(start).replace(/-/g, '')}T${h}${m}00`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Life City BIM//Despegue BIM//ES',
    'BEGIN:VEVENT',
    `UID:despegue-bim-${Date.now()}@lifecity.com.co`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${stamp}`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:🔥 Lección diaria · Despegue BIM',
    'DESCRIPTION:5 minutos de BIM para mantener tu racha.',
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lección diaria de BIM',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}
