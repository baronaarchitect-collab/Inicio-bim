import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANS, plansForProfile } from '../js/plans.js';
import { lessonById, PROFILES } from '../js/content.js';
import { GROUPS } from '../plataforma/data.js';
import * as E from '../js/engine.js';

test('cada día de cada plan apunta a una lección y herramienta válidas', () => {
  const gates = GROUPS.map((g) => g.id);
  assert.equal(new Set(PLANS.map((p) => p.id)).size, PLANS.length);
  for (const p of PLANS) {
    assert.ok(p.days.length >= 5, p.id);
    for (const d of p.days) {
      assert.ok(lessonById(d.lesson), `${p.id}: lección ${d.lesson}`);
      assert.ok(d.task.length > 20, `${p.id}: tarea corta`);
      const gate = d.tool?.href.match(/#checklist\/(\w+)/)?.[1];
      if (gate) assert.ok(gates.includes(gate), `${p.id}: gate ${gate}`);
    }
  }
});

test('cada perfil tiene un plan recomendado propio primero', () => {
  for (const pr of PROFILES) {
    const first = plansForProfile(pr.id)[0];
    assert.ok(first.for !== 'all' && first.for.includes(pr.id), pr.id);
  }
});

test('un día de plan por fecha y solo con la lección completada', () => {
  const s = E.defaultState(new Date('2026-10-01T08:00:00'));
  s.profile = 'electrico';
  E.startPlan(s, 'ele-10');
  const d1 = new Date('2026-10-01T09:00:00');
  assert.deepEqual(E.planDayStatuses(s, d1).slice(0, 2), ['today', 'locked']);
  assert.equal(E.canCompletePlanDay(s, d1), false); // falta la lección u2l1
  E.completeLesson(s, 'u2l1', {}, d1);
  assert.equal(E.completePlanDay(s, d1).day, 1);
  E.completeLesson(s, 'u2l2', {}, d1);
  assert.equal(E.planDayStatuses(s, d1)[1], 'tomorrow');
  assert.equal(E.completePlanDay(s, d1), null);
  const d2 = new Date('2026-10-02T09:00:00');
  assert.equal(E.planDayStatuses(s, d2)[1], 'today');
  assert.equal(E.completePlanDay(s, d2).day, 2);
  assert.match(E.reminderMessage(s, new Date('2026-10-03T19:00:00')).title, /Día 3 de 10/);
});
