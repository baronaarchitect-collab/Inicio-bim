// Lógica pura (sin red ni Firebase) para decidir el estado PRO a partir de PayPal.
// Se prueba en tests/paypal-logic.test.mjs

// Estados de suscripción de PayPal: APPROVAL_PENDING, APPROVED, ACTIVE, SUSPENDED, CANCELLED, EXPIRED.
const PENDING = ['APPROVAL_PENDING', 'APPROVED'];

export function isValidSubscriptionId(id) {
  return typeof id === 'string' && /^I-[A-Z0-9]{6,40}$/.test(id);
}

// Evalúa una suscripción obtenida de GET /v1/billing/subscriptions/{id}.
// uid: si se pasa, la suscripción debe haberse creado para ese usuario (custom_id).
export function evaluateSubscription(sub, { planId, uid } = {}) {
  if (!sub || !sub.id) return { ok: false, reason: 'not_found' };
  if (planId && sub.plan_id !== planId) return { ok: false, reason: 'wrong_plan' };
  if (uid && sub.custom_id && sub.custom_id !== uid) return { ok: false, reason: 'other_user' };
  const status = sub.status;
  return {
    ok: true,
    premium: status === 'ACTIVE',
    pending: PENDING.includes(status),
    record: {
      id: sub.id,
      status,
      planId: sub.plan_id,
      payerEmail: sub.subscriber?.email_address || null,
      nextBillingTime: sub.billing_info?.next_billing_time || null,
      startTime: sub.start_time || null
    }
  };
}

// Extrae el id de suscripción de un evento de webhook de PayPal.
export function subscriptionIdFromEvent(event) {
  const type = event?.event_type || '';
  const r = event?.resource || {};
  if (type.startsWith('BILLING.SUBSCRIPTION.')) return r.id || null;
  if (type.startsWith('PAYMENT.SALE.')) return r.billing_agreement_id || null;
  return null;
}

// Usuario dueño de la suscripción: custom_id (uid) o el vínculo guardado en Firestore.
export function ownerUid(sub, linkedUid) {
  return sub?.custom_id || linkedUid || null;
}
