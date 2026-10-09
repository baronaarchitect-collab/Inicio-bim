// Servidor opcional de recordatorios push para Despegue BIM.
// Envía la notificación diaria aunque la app esté cerrada.
//
//   cd server && npm install
//   npx web-push generate-vapid-keys          -> copia las llaves
//   VAPID_PUBLIC=... VAPID_PRIVATE=... VAPID_SUBJECT=mailto:tu@correo.com npm start
//
// Luego en js/config.js: push.serverUrl = 'https://tu-servidor' y push.vapidPublicKey = VAPID_PUBLIC.

import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import webpush from 'web-push';

const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = new URL('./data/', import.meta.url);
const DB = new URL('./subscriptions.json', DATA_DIR);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const { VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT = 'mailto:proyectos@lifecity.com.co' } = process.env;
if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('Faltan VAPID_PUBLIC y VAPID_PRIVATE. Genera con: npx web-push generate-vapid-keys');
  process.exit(1);
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

mkdirSync(DATA_DIR, { recursive: true });
let subs = existsSync(DB) ? JSON.parse(readFileSync(DB, 'utf8')) : {};
const persist = () => writeFileSync(DB, JSON.stringify(subs, null, 2));

function localParts(timezone, date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

async function tick() {
  let changed = false;
  for (const [id, s] of Object.entries(subs)) {
    let now;
    try {
      now = localParts(s.timezone || 'America/Bogota');
    } catch {
      now = localParts('America/Bogota');
    }
    const [h, m] = (s.reminderTime || '19:00').split(':').map(Number);
    const due = now.minutes >= h * 60 + m;
    if (!due || s.lastPracticeDate === now.day || s.lastNotifiedDay === now.day) continue;
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify(s.message || { title: '🔥 Hora de tu lección BIM', body: '5 minutos de BIM para mantener tu racha.' }));
      s.lastNotifiedDay = now.day;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) delete subs[id];
      else console.error('push error', err.statusCode, err.body);
    }
    changed = true;
  }
  if (changed) persist();
}

function send(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, subscribers: Object.keys(subs).length });
    if (req.method === 'POST' && req.url === '/subscribe') {
      let raw = '';
      req.on('data', (c) => {
        raw += c;
        if (raw.length > 20000) req.destroy();
      });
      req.on('end', () => {
        try {
          const body = JSON.parse(raw);
          if (!body.subscription?.endpoint) return send(res, 400, { error: 'subscription requerida' });
          const id = body.subscription.endpoint;
          const prev = subs[id] || {};
          subs[id] = {
            ...prev,
            subscription: body.subscription,
            reminderTime: /^\d{2}:\d{2}$/.test(body.reminderTime) ? body.reminderTime : '19:00',
            timezone: String(body.timezone || 'America/Bogota').slice(0, 64),
            name: String(body.name || '').slice(0, 40),
            streak: Number(body.streak) || 0,
            lastPracticeDate: body.lastPracticeDate || null,
            message: body.message && { title: String(body.message.title).slice(0, 120), body: String(body.message.body).slice(0, 300) },
            updatedAt: new Date().toISOString()
          };
          persist();
          send(res, 200, { ok: true });
        } catch {
          send(res, 400, { error: 'JSON inválido' });
        }
      });
      return;
    }
    send(res, 404, { error: 'no encontrado' });
  })
  .listen(PORT, () => console.log(`Despegue BIM push server en :${PORT}`));

setInterval(tick, 60 * 1000);
tick();
