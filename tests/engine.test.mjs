import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { CONFIG } from '../js/config.js';
import { pathForProfile } from '../js/content.js';

const at = (s) => new Date(s);

function fresh(profile = 'hidrosanitario', now = at('2026-10-01T10:00:00')) {
  const s = E.defaultState(now);
  s.profile = profile;
  s.onboarded = true;
  return s;
}

test('fechas locales', () => {
  assert.equal(E.daysBetween('2026-10-01', '2026-10-03'), 2);
  assert.equal(E.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(E.addDays('2026-03-01', -1), '2026-02-28');
});

test('racha: sube un día por día y se reinicia si se salta', () => {
  const s = fresh();
  E.completeLesson(s, 'u1l1', {}, at('2026-10-01T10:00:00'));
  E.completeLesson(s, 'u1l2', {}, at('2026-10-01T18:00:00'));
  assert.equal(s.streak, 1);
  E.completeLesson(s, 'u1l3', {}, at('2026-10-02T09:00:00'));
  assert.equal(s.streak, 2);
  const r = E.refreshStreak(s, at('2026-10-05T09:00:00'));
  assert.equal(r.lost, true);
  assert.equal(s.streak, 0);
  assert.equal(s.longestStreak, 2);
});

test('racha: el protector cubre un día perdido', () => {
  const s = fresh();
  E.completeLesson(s, 'u1l1', {}, at('2026-10-01T10:00:00'));
  s.streakFreezes = 1;
  const r = E.refreshStreak(s, at('2026-10-03T08:00:00'));
  assert.equal(r.frozeUsed, 1);
  assert.equal(s.streakFreezes, 0);
  E.completeLesson(s, 'u1l2', {}, at('2026-10-03T08:05:00'));
  assert.equal(s.streak, 2);
});

test('vidas: se pierden y se regeneran con el tiempo', () => {
  const s = fresh();
  const t0 = at('2026-10-01T10:00:00');
  E.loseHeart(s, t0);
  E.loseHeart(s, t0);
  assert.equal(s.hearts, CONFIG.maxHearts - 2);
  E.refreshHearts(s, new Date(t0.getTime() + CONFIG.heartRegenMinutes * 60000 + 1000));
  assert.equal(s.hearts, CONFIG.maxHearts - 1);
  E.refreshHearts(s, new Date(t0.getTime() + 10 * CONFIG.heartRegenMinutes * 60000));
  assert.equal(s.hearts, CONFIG.maxHearts);
});

test('XP, gemas, bonus perfecto y meta diaria', () => {
  const s = fresh();
  s.dailyGoal = 20;
  const r1 = E.completeLesson(s, 'u1l1', { mistakes: 0 }, at('2026-10-01T10:00:00'));
  assert.equal(r1.xpGained, CONFIG.xpPerLesson + CONFIG.xpPerfectBonus);
  assert.equal(r1.goalReachedNow, false);
  const r2 = E.completeLesson(s, 'u1l2', { mistakes: 2 }, at('2026-10-01T11:00:00'));
  assert.equal(r2.xpGained, CONFIG.xpPerLesson);
  assert.equal(r2.goalReachedNow, true);
  assert.ok(r1.newAchievements.some((a) => a.id === 'first'));
});

test('desbloqueo secuencial y extras tras la especialidad propia', () => {
  const s = fresh('electrico');
  let st = E.lessonStatuses(s);
  assert.equal(st.u1l1, 'current');
  assert.equal(st.u1l2, 'locked');
  assert.equal(st.hid1, 'locked');
  const path = pathForProfile('electrico');
  for (const u of path.filter((u) => ['u1', 'u2', 'u3', 'u4', 'esp-ele'].includes(u.id))) {
    for (const l of u.lessons) E.completeLesson(s, l.id, {}, at('2026-10-01T10:00:00'));
  }
  st = E.lessonStatuses(s);
  assert.equal(st.u6l1, 'current');
  assert.equal(st.hid1, 'current');
  assert.equal(st.hid2, 'locked');
});

test('upsell: hito a mitad de curso una sola vez y cooldown para "sin vidas"', () => {
  const s = fresh('arquitecto');
  const u4 = pathForProfile('arquitecto').find((u) => u.id === 'u4');
  for (const l of u4.lessons) E.completeLesson(s, l.id, {}, at('2026-10-01T10:00:00'));
  const trig = E.upsellTriggerAfterLesson(s, u4);
  assert.equal(trig, 'midway');
  assert.equal(E.canShowUpsell(s, 'midway'), true);
  E.markUpsellShown(s, 'midway', at('2026-10-01T10:00:00'));
  assert.equal(E.canShowUpsell(s, 'midway'), false);
  assert.equal(E.canShowUpsell(s, 'hearts', at('2026-10-02T10:00:00')), false);
  assert.equal(E.canShowUpsell(s, 'hearts', at('2026-10-05T10:00:00')), true);
  s.upsell.bookedAt = '2026-10-05T10:00:00';
  assert.equal(E.canShowUpsell(s, 'complete'), false);
});

test('recordatorio: mañana si ya practicó hoy, hoy si no', () => {
  const s = fresh();
  s.reminderTime = '19:00';
  const morning = at('2026-10-01T08:00:00');
  assert.equal(E.nextReminderDate(s, morning).getDate(), 1);
  E.completeLesson(s, 'u1l1', {}, morning);
  assert.equal(E.nextReminderDate(s, at('2026-10-01T09:00:00')).getDate(), 2);
  const msg = E.reminderMessage(s, at('2026-10-02T19:00:00'));
  assert.match(msg.title, /racha de 1 día/);
});
