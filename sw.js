// Service worker de Despegue BIM: offline + recordatorios.
const VERSION = 'despegue-v2';
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/content.js',
  './js/engine.js',
  './js/reminders.js',
  './js/account.js',
  './js/paypal.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const REMINDER_CACHE = 'despegue-reminders';
const STATE_URL = './__reminder_state';
const NOTIFIED_URL = './__reminder_notified';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== REMINDER_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero para el código propio (así las actualizaciones llegan), caché como respaldo offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function readJson(url) {
  const cache = await caches.open(REMINDER_CACHE);
  const res = await cache.match(url);
  return res ? res.json() : null;
}

// Periodic Background Sync: notifica si ya pasó la hora y hoy no ha practicado.
async function maybeRemind() {
  const s = await readJson(STATE_URL);
  if (!s || !s.enabled) return;
  const now = new Date();
  const today = dayKey(now);
  if (s.streakDate === today) return;
  const [h, m] = (s.reminderTime || '19:00').split(':').map(Number);
  const due = new Date(now);
  due.setHours(h, m, 0, 0);
  if (now < due) return;
  const last = await readJson(NOTIFIED_URL);
  if (last && last.day === today) return;
  await self.registration.showNotification(s.title || 'Hora de tu lección BIM', {
    body: s.body || '5 minutos de BIM para mantener tu racha.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'despegue-daily',
    data: { url: './#home' }
  });
  const cache = await caches.open(REMINDER_CACHE);
  await cache.put(NOTIFIED_URL, new Response(JSON.stringify({ day: today })));
}

self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'daily-reminder') e.waitUntil(maybeRemind());
});

// Push desde server/push-server.mjs
self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data && e.data.text() };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || '🔥 Hora de tu lección BIM', {
      body: data.body || '5 minutos de BIM para mantener tu racha.',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: 'despegue-daily',
      data: { url: data.url || './#home' }
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
