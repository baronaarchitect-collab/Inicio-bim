// Cloud Functions de Despegue BIM: activan y mantienen el estado PRO verificando con PayPal.
//
//  activateSubscription (callable): la app la llama tras aprobar el pago en el botón de PayPal.
//  paypalWebhook (HTTP): PayPal avisa de activaciones, cancelaciones, suspensiones y cobros.
//
// Secretos (nunca en el código):  firebase functions:secrets:set PAYPAL_CLIENT_SECRET
//                                 firebase functions:secrets:set PAYPAL_WEBHOOK_ID
// Parámetros (functions/.env):    PAYPAL_CLIENT_ID, PAYPAL_PLAN_ID, PAYPAL_ENV (live | sandbox)

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { evaluateSubscription, isValidSubscriptionId, ownerUid, subscriptionIdFromEvent } from './paypal-logic.js';

initializeApp();
const db = getFirestore();

const PAYPAL_CLIENT_ID = defineString('PAYPAL_CLIENT_ID');
const PAYPAL_PLAN_ID = defineString('PAYPAL_PLAN_ID', { default: 'P-16844365R64407219NLEEUPQ' });
const PAYPAL_ENV = defineString('PAYPAL_ENV', { default: 'live' });
const PAYPAL_CLIENT_SECRET = defineSecret('PAYPAL_CLIENT_SECRET');
const PAYPAL_WEBHOOK_ID = defineSecret('PAYPAL_WEBHOOK_ID');

const apiBase = () => (PAYPAL_ENV.value() === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com');

async function accessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID.value()}:${PAYPAL_CLIENT_SECRET.value()}`).toString('base64');
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error(`PayPal OAuth ${res.status}`);
  return (await res.json()).access_token;
}

async function getSubscription(id, token) {
  const res = await fetch(`${apiBase()}/v1/billing/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PayPal subscription ${res.status}`);
  return res.json();
}

// Escribe el estado PRO del usuario y el vínculo suscripción → usuario.
async function applyToUser(uid, result) {
  const batch = db.batch();
  batch.set(
    db.doc(`users/${uid}`),
    { premium: result.premium, subscription: { ...result.record, updatedAt: FieldValue.serverTimestamp() } },
    { merge: true }
  );
  batch.set(db.doc(`subscriptions/${result.record.id}`), { uid, status: result.record.status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
}

const OPTS = { secrets: [PAYPAL_CLIENT_SECRET], region: 'us-central1' };

export const activateSubscription = onCall(OPTS, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión primero.');
  const uid = req.auth.uid;
  const id = req.data?.subscriptionID;
  if (!isValidSubscriptionId(id)) throw new HttpsError('invalid-argument', 'subscriptionID inválido.');

  const link = await db.doc(`subscriptions/${id}`).get();
  if (link.exists && link.data().uid !== uid) throw new HttpsError('permission-denied', 'La suscripción pertenece a otra cuenta.');

  const sub = await getSubscription(id, await accessToken());
  const result = evaluateSubscription(sub, { planId: PAYPAL_PLAN_ID.value(), uid });
  if (!result.ok) {
    logger.warn('Suscripción rechazada', { uid, id, reason: result.reason });
    throw new HttpsError(result.reason === 'other_user' ? 'permission-denied' : 'failed-precondition', result.reason);
  }
  await applyToUser(uid, result);
  return { premium: result.premium, pending: result.pending, status: result.record.status };
});

async function verifyWebhook(req, token) {
  const h = (n) => req.get(n);
  const res = await fetch(`${apiBase()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: h('paypal-auth-algo'),
      cert_url: h('paypal-cert-url'),
      transmission_id: h('paypal-transmission-id'),
      transmission_sig: h('paypal-transmission-sig'),
      transmission_time: h('paypal-transmission-time'),
      webhook_id: PAYPAL_WEBHOOK_ID.value(),
      webhook_event: req.body
    })
  });
  if (!res.ok) return false;
  return (await res.json()).verification_status === 'SUCCESS';
}

export const paypalWebhook = onRequest({ ...OPTS, secrets: [PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID] }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const token = await accessToken();
    if (!(await verifyWebhook(req, token))) {
      logger.warn('Webhook con firma inválida');
      return res.status(400).send('invalid signature');
    }
    const id = subscriptionIdFromEvent(req.body);
    if (!id) return res.status(200).send('ignored');

    // Fuente de verdad: el estado actual de la suscripción en PayPal (evita eventos fuera de orden).
    const sub = await getSubscription(id, token);
    const link = await db.doc(`subscriptions/${id}`).get();
    const uid = ownerUid(sub, link.exists ? link.data().uid : null);
    const result = evaluateSubscription(sub, { planId: PAYPAL_PLAN_ID.value() });
    if (!uid || !result.ok) {
      logger.warn('Webhook sin usuario o plan distinto', { id, event: req.body.event_type, reason: result.reason });
      return res.status(200).send('no user');
    }
    await applyToUser(uid, result);
    logger.info('PRO actualizado', { uid, id, status: result.record.status, event: req.body.event_type });
    return res.status(200).send('ok');
  } catch (e) {
    logger.error('Error en webhook', e);
    return res.status(500).send('error'); // PayPal reintenta
  }
});
