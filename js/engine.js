// Lógica pura del juego (sin DOM): vidas, XP, racha, desbloqueos, logros y upsell.
// Se puede probar en Node: ver tests/engine.test.mjs

import { CONFIG } from './config.js';
import { pathForProfile } from './content.js';

export const STATE_VERSION = 1;

export function defaultState(now = new Date()) {
  return {
    version: STATE_VERSION,
    createdAt: now.toISOString(),
    onboarded: false,
    name: '',
    profile: null,
    dailyGoal: 20,
    reminderTime: CONFIG.defaultReminderTime,
    notificationsEnabled: false,
    xp: 0,
    gems: 50,
    hearts: CONFIG.maxHearts,
    heartsUpdatedAt: now.toISOString(),
    streak: 0,
    longestStreak: 0,
    streakDate: null, // último día que mantiene viva la racha (YYYY-MM-DD local)
    streakFreezes: 0,
    xpByDay: {},
    completed: {}, // lessonId -> { perfect, completedAt, times }
    perfectCount: 0,
    achievements: {}, // id -> fecha
    upsell: { shown: {}, lastShownAt: null, paymentClickedAt: null, bookedAt: null, email: '' }
  };
}

// ── Fechas (día local) ─────────────────────────────────────────
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function keyToUTC(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(fromKey, toKey) {
  return Math.round((keyToUTC(toKey) - keyToUTC(fromKey)) / 86400000);
}

export function addDays(key, n) {
  const t = new Date(keyToUTC(key) + n * 86400000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

// ── Vidas ─────────────────────────────────────────────────────
export function refreshHearts(state, now = new Date()) {
  if (state.hearts >= CONFIG.maxHearts) {
    state.heartsUpdatedAt = now.toISOString();
    return state;
  }
  const period = CONFIG.heartRegenMinutes * 60000;
  const elapsed = now - new Date(state.heartsUpdatedAt);
  const gained = Math.floor(elapsed / period);
  if (gained > 0) {
    state.hearts = Math.min(CONFIG.maxHearts, state.hearts + gained);
    const carry = state.hearts >= CONFIG.maxHearts ? 0 : elapsed - gained * period;
    state.heartsUpdatedAt = new Date(now - carry).toISOString();
  }
  return state;
}

export function msToNextHeart(state, now = new Date()) {
  if (state.hearts >= CONFIG.maxHearts) return 0;
  const period = CONFIG.heartRegenMinutes * 60000;
  return Math.max(0, period - (now - new Date(state.heartsUpdatedAt)));
}

export function loseHeart(state, now = new Date()) {
  refreshHearts(state, now);
  if (state.hearts >= CONFIG.maxHearts) state.heartsUpdatedAt = now.toISOString();
  state.hearts = Math.max(0, state.hearts - 1);
  return state.hearts;
}

export function gainHeart(state, n = 1, now = new Date()) {
  refreshHearts(state, now);
  state.hearts = Math.min(CONFIG.maxHearts, state.hearts + n);
  return state.hearts;
}

// ── Racha ─────────────────────────────────────────────────────
// Se llama al abrir la app: si se perdieron días, consume protectores o reinicia.
export function refreshStreak(state, now = new Date()) {
  const today = dayKey(now);
  if (!state.streakDate || state.streak === 0) return { frozeUsed: 0, lost: false };
  const gap = daysBetween(state.streakDate, today);
  const missed = gap - 1;
  if (missed <= 0) return { frozeUsed: 0, lost: false };
  if (state.streakFreezes >= missed) {
    state.streakFreezes -= missed;
    state.streakDate = addDays(today, -1);
    return { frozeUsed: missed, lost: false };
  }
  const lostStreak = state.streak;
  state.streak = 0;
  state.streakDate = null;
  return { frozeUsed: 0, lost: true, lostStreak };
}

export function practicedToday(state, now = new Date()) {
  return state.streakDate === dayKey(now);
}

function bumpStreak(state, now) {
  const today = dayKey(now);
  if (state.streakDate === today) return false;
  const yesterday = addDays(today, -1);
  state.streak = state.streakDate === yesterday ? state.streak + 1 : 1;
  state.streakDate = today;
  state.longestStreak = Math.max(state.longestStreak, state.streak);
  return true;
}

export function xpToday(state, now = new Date()) {
  return state.xpByDay[dayKey(now)] || 0;
}

function addXp(state, amount, now) {
  const k = dayKey(now);
  const before = state.xpByDay[k] || 0;
  state.xpByDay[k] = before + amount;
  state.xp += amount;
  return before < state.dailyGoal && state.xpByDay[k] >= state.dailyGoal;
}

// ── Completar lección / práctica ──────────────────────────────
export function completeLesson(state, lessonId, { mistakes = 0 } = {}, now = new Date()) {
  const perfect = mistakes === 0;
  const xpGained = CONFIG.xpPerLesson + (perfect ? CONFIG.xpPerfectBonus : 0);
  const gemsGained = CONFIG.gemsPerLesson + (perfect ? CONFIG.gemsPerfectBonus : 0);
  const firstTime = !state.completed[lessonId];
  const prev = state.completed[lessonId] || { times: 0, perfect: false };
  state.completed[lessonId] = {
    perfect: prev.perfect || perfect,
    completedAt: now.toISOString(),
    times: prev.times + 1
  };
  if (perfect) state.perfectCount += 1;
  state.gems += gemsGained;
  const goalReachedNow = addXp(state, xpGained, now);
  const streakIncreased = bumpStreak(state, now);
  const newAchievements = checkAchievements(state, now);
  return { xpGained, gemsGained, perfect, firstTime, goalReachedNow, streakIncreased, newAchievements };
}

export function completePractice(state, { mistakes = 0 } = {}, now = new Date()) {
  const xpGained = 5 + (mistakes === 0 ? 5 : 0);
  gainHeart(state, 1, now);
  const goalReachedNow = addXp(state, xpGained, now);
  const streakIncreased = bumpStreak(state, now);
  const newAchievements = checkAchievements(state, now);
  return { xpGained, gemsGained: 0, perfect: mistakes === 0, goalReachedNow, streakIncreased, newAchievements, heartRestored: true };
}

export function buyStreakFreeze(state) {
  if (state.gems < CONFIG.streakFreezeCost || state.streakFreezes >= 2) return false;
  state.gems -= CONFIG.streakFreezeCost;
  state.streakFreezes += 1;
  return true;
}

// ── Ruta y desbloqueos ────────────────────────────────────────
export function getPath(state) {
  return pathForProfile(state.profile);
}

// Unidades que exigen suscripción PRO (todas menos las gratuitas, p. ej. Playbook 1).
export function isPremiumUnit(unit) {
  return !CONFIG.premium.freeUnits.includes(unit.id);
}

export function isUnitComplete(state, unit) {
  return unit.lessons.every((l) => state.completed[l.id]);
}

// Devuelve 'done' | 'current' | 'locked' para cada lección.
export function lessonStatuses(state) {
  const path = getPath(state);
  const statuses = {};
  const main = path.filter((u) => !u.extra);
  let currentFound = false;
  for (const unit of main) {
    for (const l of unit.lessons) {
      if (state.completed[l.id]) statuses[l.id] = 'done';
      else if (!currentFound) {
        statuses[l.id] = 'current';
        currentFound = true;
      } else statuses[l.id] = 'locked';
    }
  }
  const ownSpecialty = main.find((u) => u.track === 'specialty');
  const extrasOpen = ownSpecialty && isUnitComplete(state, ownSpecialty);
  for (const unit of path.filter((u) => u.extra)) {
    let open = extrasOpen;
    for (const l of unit.lessons) {
      if (state.completed[l.id]) statuses[l.id] = 'done';
      else if (open) {
        statuses[l.id] = 'current';
        open = false;
      } else statuses[l.id] = 'locked';
    }
  }
  return statuses;
}

export function overallProgress(state) {
  const main = getPath(state).filter((u) => !u.extra);
  const all = main.flatMap((u) => u.lessons);
  const done = all.filter((l) => state.completed[l.id]).length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
}

export function nextLesson(state) {
  const statuses = lessonStatuses(state);
  for (const unit of getPath(state)) {
    for (const l of unit.lessons) if (statuses[l.id] === 'current') return { unit, lesson: l };
  }
  return null;
}

// ── Logros ────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'first', icon: '🚀', title: 'Despegue', desc: 'Completa tu primera lección', test: (s) => Object.keys(s.completed).length >= 1 },
  { id: 'streak3', icon: '🔥', title: 'En racha', desc: 'Racha de 3 días', test: (s) => s.longestStreak >= 3 },
  { id: 'streak7', icon: '📅', title: 'Semana BIM', desc: 'Racha de 7 días', test: (s) => s.longestStreak >= 7 },
  { id: 'streak30', icon: '🏆', title: 'Hábito BIM', desc: 'Racha de 30 días', test: (s) => s.longestStreak >= 30 },
  { id: 'perfect5', icon: '🎯', title: 'Cero interferencias', desc: '5 lecciones perfectas', test: (s) => s.perfectCount >= 5 },
  { id: 'u1', icon: '🧠', title: 'Mitos derribados', desc: 'Termina el Playbook 1', test: (s) => unitDone(s, 'u1') },
  { id: 'pillars', icon: '🏛️', title: 'Los 3 pilares', desc: 'Termina Modelado, Planimetría y Cantidades', test: (s) => ['u2', 'u3', 'u4'].every((id) => unitDone(s, id)) },
  { id: 'specialty', icon: '🛠️', title: 'Especialista', desc: 'Termina tu ruta de especialidad', test: (s) => {
    const own = getPath(s).find((u) => u.track === 'specialty' && !u.extra);
    return own ? isUnitComplete(s, own) : false;
  } },
  { id: 'coordinator', icon: '🧩', title: 'Coordinador BIM', desc: 'Termina el Playbook 3', test: (s) => unitDone(s, 'u6') },
  { id: 'xp500', icon: '⭐', title: '500 XP', desc: 'Acumula 500 XP', test: (s) => s.xp >= 500 }
];

function unitDone(state, unitId) {
  const unit = getPath(state).find((u) => u.id === unitId);
  return unit ? isUnitComplete(state, unit) : false;
}

export function checkAchievements(state, now = new Date()) {
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.test(state)) {
      state.achievements[a.id] = now.toISOString();
      fresh.push(a);
    }
  }
  return fresh;
}

// ── Upsell ────────────────────────────────────────────────────
// Hitos (se muestran una sola vez): midway, complete, streak7, specialty.
// 'hearts' (sin vidas) respeta el cooldown.
const MILESTONES = ['midway', 'complete', 'streak7', 'specialty'];

export function upsellTriggerAfterLesson(state, unit) {
  if (unit && isUnitComplete(state, unit)) {
    if (unit.upsellAfter && !state.upsell.shown[unit.upsellAfter]) return unit.upsellAfter;
    if (unit.track === 'specialty' && !unit.extra && !state.upsell.shown.specialty) return 'specialty';
  }
  if (state.streak >= 7 && !state.upsell.shown.streak7) return 'streak7';
  return null;
}

export function canShowUpsell(state, trigger, now = new Date()) {
  if (state.upsell.bookedAt) return false;
  if (MILESTONES.includes(trigger)) return !state.upsell.shown[trigger];
  if (!state.upsell.lastShownAt) return true;
  const days = (now - new Date(state.upsell.lastShownAt)) / 86400000;
  return days >= CONFIG.upsell.cooldownDays;
}

export function markUpsellShown(state, trigger, now = new Date()) {
  state.upsell.shown[trigger] = now.toISOString();
  state.upsell.lastShownAt = now.toISOString();
}

// ── Recordatorios ─────────────────────────────────────────────
export function reminderMessage(state, now = new Date()) {
  const name = state.name ? `${state.name}, ` : '';
  const next = nextLesson(state);
  const lessonTxt = next ? ` Siguiente: "${next.lesson.title}".` : '';
  if (state.streak > 0 && !practicedToday(state, now)) {
    return {
      title: `🔥 Tu racha de ${state.streak} ${state.streak === 1 ? 'día' : 'días'} está en riesgo`,
      body: `${name}5 minutos de BIM hoy y la mantienes.${lessonTxt}`
    };
  }
  const pool = [
    { title: '🏗️ Hora de tu lección BIM', body: `${name}modelado correcto → planimetría clara → cantidades confiables.${lessonTxt}` },
    { title: '📐 5 minutos que ahorran retrabajos', body: `${name}BIM traslada el error del concreto al modelo.${lessonTxt}` },
    { title: '🧩 Tu equipo te necesita coordinado', body: `${name}una lección hoy te acerca a coordinar sin interferencias.${lessonTxt}` }
  ];
  return pool[now.getDate() % pool.length];
}

// Próxima fecha del recordatorio diario ("HH:MM"), saltando hoy si ya practicó.
export function nextReminderDate(state, now = new Date()) {
  const [h, m] = (state.reminderTime || CONFIG.defaultReminderTime).split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now || practicedToday(state, now)) target.setDate(target.getDate() + 1);
  return target;
}
