import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSubscription, isValidSubscriptionId, subscriptionIdFromEvent, ownerUid } from '../functions/paypal-logic.js';
import { isPremiumUnit } from '../js/engine.js';
import { UNITS } from '../js/content.js';

const PLAN = 'P-16844365R64407219NLEEUPQ';
const sub = (o = {}) => ({ id: 'I-ABC123DEF456', plan_id: PLAN, status: 'ACTIVE', custom_id: 'uid1', subscriber: { email_address: 'a@b.co' }, ...o });

test('ids de suscripción válidos', () => {
  assert.equal(isValidSubscriptionId('I-ABC123DEF456'), true);
  assert.equal(isValidSubscriptionId('I-abc'), false);
  assert.equal(isValidSubscriptionId('../x'), false);
  assert.equal(isValidSubscriptionId(undefined), false);
});

test('ACTIVE del plan correcto y del mismo usuario = PRO', () => {
  const r = evaluateSubscription(sub(), { planId: PLAN, uid: 'uid1' });
  assert.equal(r.ok, true);
  assert.equal(r.premium, true);
  assert.equal(r.record.payerEmail, 'a@b.co');
});

test('rechaza otro plan u otro usuario', () => {
  assert.equal(evaluateSubscription(sub({ plan_id: 'P-OTRO' }), { planId: PLAN }).reason, 'wrong_plan');
  assert.equal(evaluateSubscription(sub(), { planId: PLAN, uid: 'uid2' }).reason, 'other_user');
  assert.equal(evaluateSubscription(null, { planId: PLAN }).reason, 'not_found');
});

test('pendiente, cancelada y suspendida no dan PRO', () => {
  assert.deepEqual([evaluateSubscription(sub({ status: 'APPROVED' }), { planId: PLAN }).pending, evaluateSubscription(sub({ status: 'APPROVED' }), { planId: PLAN }).premium], [true, false]);
  for (const status of ['CANCELLED', 'SUSPENDED', 'EXPIRED']) assert.equal(evaluateSubscription(sub({ status }), { planId: PLAN }).premium, false);
});

test('id de suscripción desde eventos de webhook y dueño', () => {
  assert.equal(subscriptionIdFromEvent({ event_type: 'BILLING.SUBSCRIPTION.CANCELLED', resource: { id: 'I-X1' } }), 'I-X1');
  assert.equal(subscriptionIdFromEvent({ event_type: 'PAYMENT.SALE.COMPLETED', resource: { billing_agreement_id: 'I-X2' } }), 'I-X2');
  assert.equal(subscriptionIdFromEvent({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: {} }), null);
  assert.equal(ownerUid({ custom_id: 'u1' }, 'u2'), 'u1');
  assert.equal(ownerUid({}, 'u2'), 'u2');
});

test('solo el Playbook 1 es gratis', () => {
  const free = UNITS.filter((u) => !isPremiumUnit(u)).map((u) => u.id);
  assert.deepEqual(free, ['u1']);
});
