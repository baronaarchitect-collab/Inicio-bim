import { CONFIG } from './config.js';
import { PROFILES, UNITS, lessonById } from './content.js';
import * as E from './engine.js';
import * as R from './reminders.js';
import * as A from './account.js';
import * as P from './paypal.js';
import { VIDEOS, videoFor, playlistMedia, unassignedPlaylists } from './videos.js';
import { planById, plansForProfile } from './plans.js';

const { account } = A;

const STORAGE_KEY = 'despegue-bim-state';
const $app = document.getElementById('app');
const $modal = document.getElementById('modal');
const $toast = document.getElementById('toast');

let state = load();
let ui = { screen: state.onboarded ? 'home' : 'onboarding', step: 0 };
let session = null; // lección o práctica en curso
let pendingResult = null;
let mergedFor = null; // uid cuyo progreso en la nube ya se combinó

// ── Persistencia ──────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...E.defaultState(), ...JSON.parse(raw) };
  } catch {
    /* sin almacenamiento: estado en memoria */
  }
  return E.defaultState();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignorar */
  }
  R.sync(state);
  A.saveProgress(state);
}

// Lecciones PRO bloqueadas: solo si hay Firebase configurado y el usuario no es PRO.
function needsPro(unit) {
  return A.premiumRequired() && E.isPremiumUnit(unit) && !account.premium;
}

// ── Utilidades ────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffledNotSame(arr) {
  if (arr.length < 2) return [...arr];
  let s = shuffle(arr);
  for (let i = 0; i < 5 && s.every((v, k) => v === arr[k]); i++) s = shuffle(arr);
  return s;
}

function toast(html, ms = 2600) {
  $toast.innerHTML = html;
  $toast.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $toast.classList.remove('show'), ms);
}

function fmtMs(ms) {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

function profileInfo() {
  return PROFILES.find((p) => p.id === state.profile) || PROFILES[0];
}

function go(screen, extra = {}) {
  ui = { ...ui, screen, ...extra };
  if (screen !== 'lesson') location.hash = screen;
  render();
  window.scrollTo(0, 0);
}

// ── Render principal ──────────────────────────────────────────
function render() {
  E.refreshHearts(state);
  const screens = { onboarding: renderOnboarding, home: renderHome, lesson: renderLesson, result: renderResult, practice: renderPractice, profile: renderProfile, consult: renderConsult, premium: renderPremium, login: renderLogin, plans: renderPlans };
  $app.innerHTML = (screens[ui.screen] || renderHome)();
  $app.dataset.screen = ui.screen;
  afterRender();
}

function topBar() {
  const heartsTxt = state.hearts;
  return `
  <header class="topbar">
    <button class="chip" data-action="go" data-to="profile" aria-label="Especialidad">${profileInfo().icon}</button>
    <div class="stats">
      <button class="stat streak ${E.practicedToday(state) ? 'on' : ''}" data-action="streak-info" aria-label="Racha">🔥 <b>${state.streak}</b></button>
      <button class="stat gems" data-action="shop" aria-label="Gemas">💎 <b>${state.gems}</b></button>
      <button class="stat hearts" data-action="hearts-info" aria-label="Vidas">❤️ <b>${heartsTxt}</b></button>
    </div>
  </header>`;
}

function bottomNav(active) {
  const items = [
    ['home', '🏠', 'Aprender'],
    ['plans', '🗓️', 'Planes'],
    ['practice', '🏋️', 'Practicar'],
    ['consult', '⭐', 'Consultoría'],
    ['profile', '👤', 'Perfil']
  ];
  return `<nav class="bottomnav">${items
    .map(([id, ic, label]) => `<button class="${active === id ? 'active' : ''} ${id === 'consult' ? 'nav-consult' : ''}" data-action="go" data-to="${id}"><span>${ic}</span><small>${label}</small></button>`)
    .join('')}</nav>`;
}

// ── Onboarding ────────────────────────────────────────────────
function renderOnboarding() {
  const step = ui.step || 0;
  const dots = `<div class="dots">${[0, 1, 2, 3, 4].map((i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
  let body = '';
  if (step === 0) {
    body = `
      <div class="hero">
        <div class="mascot">🏗️</div>
        <h1>${CONFIG.appName}</h1>
        <p class="lead">Aprende BIM <b>5 minutos al día</b> con los playbooks de ${CONFIG.brand}.</p>
        <ul class="bullets">
          <li>🧠 3 mitos → 🏛️ 3 pilares → 🛠️ tu especialidad → 🧩 coordinación</li>
          <li>🔥 Rachas, vidas y XP para crear el hábito</li>
          <li>🔔 Recordatorio diario a la hora que elijas</li>
        </ul>
      </div>
      <button class="btn primary big" data-action="ob-next">Empezar</button>`;
  } else if (step === 1) {
    body = `
      <h2>¿Cómo te llamas?</h2>
      <input id="ob-name" class="input" maxlength="40" placeholder="Tu nombre" value="${esc(state.name)}" autocomplete="given-name" />
      <button class="btn primary big" data-action="ob-name">Continuar</button>`;
  } else if (step === 2) {
    body = `
      <h2>¿Cuál es tu especialidad?</h2>
      <p class="muted">Armamos tu ruta: tronco común + tu disciplina.</p>
      <div class="options">${PROFILES.map((p) => `<button class="option ${state.profile === p.id ? 'selected' : ''}" data-action="ob-profile" data-id="${p.id}"><span class="opt-ic">${p.icon}</span>${esc(p.label)}</button>`).join('')}</div>`;
  } else if (step === 3) {
    body = `
      <h2>Elige tu meta diaria</h2>
      <div class="options">${CONFIG.dailyGoalOptions.map((g) => `<button class="option ${state.dailyGoal === g.xp ? 'selected' : ''}" data-action="ob-goal" data-xp="${g.xp}"><b>${g.label}</b><span class="muted">${g.detail}</span><span class="tag">${g.xp} XP</span></button>`).join('')}</div>`;
  } else {
    body = `
      <div class="hero small"><div class="mascot">🔔</div></div>
      <h2>¿A qué hora te recordamos?</h2>
      <p class="muted">Quienes practican a la misma hora cada día tienen 3 veces más probabilidad de mantener su racha.</p>
      <input id="ob-time" type="time" class="input time" value="${esc(state.reminderTime)}" />
      <button class="btn primary big" data-action="ob-notify">Activar recordatorios</button>
      <button class="btn ghost" data-action="ob-finish">Ahora no</button>`;
  }
  return `<main class="onboarding">${step > 0 ? `<button class="back" data-action="ob-back" aria-label="Atrás">←</button>` : ''}${dots}${body}</main>`;
}

// ── Home / ruta ───────────────────────────────────────────────
function renderHome() {
  const statuses = E.lessonStatuses(state);
  const path = E.getPath(state);
  const prog = E.overallProgress(state);
  const today = E.xpToday(state);
  const goalPct = Math.min(100, Math.round((today / state.dailyGoal) * 100));
  const next = E.nextLesson(state);

  let nodeIndex = 0;
  const units = path
    .map((unit, ui_) => {
      const done = unit.lessons.filter((l) => state.completed[l.id]).length;
      const nodes = unit.lessons
        .map((l) => {
          const st = statuses[l.id];
          const offset = [0, 1, 2, 1, 0, -1, -2, -1][nodeIndex++ % 8];
          const icon = st === 'done' ? (state.completed[l.id].perfect ? '👑' : '✔') : st === 'current' ? '★' : '🔒';
          return `
          <div class="node-row" style="--off:${offset}">
            <button class="node ${st}" style="--c:${unit.color}" data-action="open-lesson" data-id="${l.id}" ${st === 'locked' ? 'aria-disabled="true"' : ''}>
              <span>${icon}</span>
            </button>
            ${st === 'current' ? `<div class="node-label">${esc(l.title)}</div>` : ''}
          </div>`;
        })
        .join('');
      const isExtraStart = unit.extra && !path[ui_ - 1]?.extra;
      const consultNode =
        unit.upsellAfter && !state.upsell.bookedAt
          ? `<div class="node-row" style="--off:0"><button class="node chest" data-action="go" data-to="consult" aria-label="Consultoría 1:1"><span>🎁</span></button><div class="node-label">Consultoría 1:1</div></div>`
          : '';
      return `
        ${isExtraStart ? `<div class="divider"><span>Extra · explora otras especialidades</span></div>` : ''}
        <section class="unit ${unit.extra ? 'extra' : ''}">
          <div class="unit-banner" style="--c:${unit.color}">
            <small>${esc(unit.playbook)}</small>
            <h3>${esc(unit.title)}</h3>
            <p>${esc(unit.subtitle)}</p>
            <span class="unit-count">${done}/${unit.lessons.length}</span>
            ${needsPro(unit) ? '<span class="pro-chip">👑 PRO</span>' : ''}
          </div>
          <div class="nodes">${nodes}${consultNode}</div>
        </section>`;
    })
    .join('');

  return `
    ${topBar()}
    <main class="home">
      <section class="daily card">
        <div class="ring" style="--p:${goalPct}"><span>${goalPct >= 100 ? '✔' : `${today}`}</span></div>
        <div>
          <b>Meta diaria</b>
          <p class="muted">${today}/${state.dailyGoal} XP · ${E.practicedToday(state) ? '¡Racha asegurada hoy! 🔥' : 'Completa una lección para mantener tu racha'}</p>
          <div class="bar"><i style="width:${prog.pct}%"></i></div>
          <small class="muted">Curso: ${prog.done}/${prog.total} lecciones (${prog.pct}%)</small>
        </div>
      </section>
      ${next ? `<button class="btn primary big sticky-cta" data-action="open-lesson" data-id="${next.lesson.id}">Continuar: ${esc(next.lesson.title)}</button>` : `<button class="btn gold big sticky-cta" data-action="go" data-to="consult">🎓 ¡Curso completo! Lleva BIM a tu proyecto real</button>`}
      ${units}
    </main>
    ${bottomNav('home')}`;
}

// ── Lección ───────────────────────────────────────────────────
function buildItem(item) {
  const it = { ...item };
  if (item.type === 'mc' || item.type === 'fill') {
    it.view = shuffle(item.options.map((text, i) => ({ text, correct: i === item.answer })));
  } else if (item.type === 'order') {
    it.bank = shuffledNotSame(item.items);
  } else if (item.type === 'match') {
    it.left = shuffle(item.pairs.map((p) => p[0]));
    it.right = shuffle(item.pairs.map((p) => p[1]));
  }
  return it;
}

function startLesson(lessonId, { fromPlan = false } = {}) {
  const found = lessonById(lessonId);
  if (!found) return;
  if (state.hearts <= 0) return showNoHearts();
  session = {
    kind: 'lesson',
    fromPlan,
    unit: found.unit,
    lesson: found.lesson,
    queue: found.lesson.items.map(buildItem),
    index: 0,
    total: found.lesson.items.length,
    solved: 0,
    mistakes: 0,
    ...freshAnswer()
  };
  go('lesson');
}

function startPractice() {
  const pool = [];
  for (const u of UNITS) for (const l of u.lessons) if (state.completed[l.id]) pool.push(...l.items.filter((i) => i.type !== 'card'));
  if (!pool.length) return toast('Completa tu primera lección para desbloquear la práctica.');
  const items = shuffle(pool).slice(0, 6).map(buildItem);
  session = { kind: 'practice', unit: null, lesson: { title: 'Práctica de repaso' }, queue: items, index: 0, total: items.length, solved: 0, mistakes: 0, ...freshAnswer() };
  go('lesson');
}

function freshAnswer() {
  return { selected: null, picked: [], matched: [], leftSel: null, wrongPair: null, checked: false, correct: null, itemMistake: false };
}

function currentItem() {
  return session.queue[session.index];
}

function renderLesson() {
  if (!session) return renderHome();
  const it = currentItem();
  const pct = Math.round((session.solved / session.total) * 100);
  const heartsHtml = session.kind === 'practice' ? '<span class="stat">🏋️</span>' : `<span class="stat hearts">❤️ <b>${state.hearts}</b></span>`;
  return `
    <main class="lesson">
      <div class="lesson-top">
        <button class="close" data-action="quit-lesson" aria-label="Salir">✕</button>
        <div class="bar big"><i style="width:${pct}%"></i></div>
        ${heartsHtml}
      </div>
      <div class="lesson-body">${renderItem(it)}</div>
      ${renderFooter(it)}
    </main>`;
}

function renderItem(it) {
  const s = session;
  switch (it.type) {
    case 'card':
      return `
        <div class="teach">
          <span class="kicker">💡 Concepto clave</span>
          <h2>${esc(it.title)}</h2>
          <p>${esc(it.body)}</p>
          ${it.bullets ? `<ul>${it.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
          ${s.kind === 'lesson' && videoFor(s.lesson.id) ? `<button class="btn video-btn" data-action="watch" data-id="${esc(s.lesson.id)}">▶ Ver video de esta lección</button>` : ''}
        </div>`;
    case 'mc':
      return `
        <h2 class="q">${esc(it.q)}</h2>
        <div class="options">${it.view.map((o, i) => optionBtn(o, i)).join('')}</div>`;
    case 'fill': {
      const chosen = s.selected != null ? it.view[s.selected].text : '';
      const sentence = esc(it.q).replace('___', `<span class="blank ${chosen ? 'filled' : ''}">${chosen ? esc(chosen) : '&nbsp;'}</span>`);
      return `
        <span class="kicker">Completa la frase</span>
        <h2 class="q sentence">${sentence}</h2>
        <div class="chips">${it.view.map((o, i) => `<button class="wchip ${s.selected === i ? 'selected' : ''} ${resultClass(o)}" data-action="select" data-i="${i}" ${s.checked ? 'disabled' : ''}>${esc(o.text)}</button>`).join('')}</div>`;
    }
    case 'tf':
      return `
        <span class="kicker">¿Verdadero o falso?</span>
        <h2 class="q">${esc(it.q)}</h2>
        <div class="tf">
          ${[true, false].map((v, i) => `<button class="option ${s.selected === i ? 'selected' : ''} ${s.checked && v === it.answer ? 'right' : ''} ${s.checked && s.selected === i && v !== it.answer ? 'wrong' : ''}" data-action="select" data-i="${i}" ${s.checked ? 'disabled' : ''}>${v ? '✔ Verdadero' : '✘ Falso'}</button>`).join('')}
        </div>`;
    case 'order':
      return `
        <span class="kicker">Toca en el orden correcto</span>
        <h2 class="q">${esc(it.q)}</h2>
        <ol class="answer-line">${s.picked.map((i, k) => `<li><button class="wchip ${s.checked ? (it.items[k] === it.bank[i] ? 'right' : 'wrong') : ''}" data-action="unpick" data-k="${k}" ${s.checked ? 'disabled' : ''}>${esc(it.bank[i])}</button></li>`).join('') || '<li class="placeholder">Toca las opciones de abajo</li>'}</ol>
        <div class="chips bank">${it.bank.map((t, i) => `<button class="wchip ${s.picked.includes(i) ? 'used' : ''}" data-action="pick" data-i="${i}" ${s.picked.includes(i) || s.checked ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>`;
    case 'match': {
      const doneL = s.matched.map((m) => m[0]);
      const doneR = s.matched.map((m) => m[1]);
      return `
        <span class="kicker">Empareja</span>
        <h2 class="q">${esc(it.q)}</h2>
        <div class="match">
          <div>${it.left.map((t, i) => `<button class="mchip ${doneL.includes(i) ? 'right' : ''} ${s.leftSel === i ? 'selected' : ''} ${s.wrongPair?.[0] === i ? 'wrong' : ''}" data-action="match-left" data-i="${i}" ${doneL.includes(i) ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>
          <div>${it.right.map((t, i) => `<button class="mchip ${doneR.includes(i) ? 'right' : ''} ${s.wrongPair?.[1] === i ? 'wrong' : ''}" data-action="match-right" data-i="${i}" ${doneR.includes(i) ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>
        </div>`;
    }
  }
  return '';
}

function optionBtn(o, i) {
  const s = session;
  return `<button class="option ${s.selected === i ? 'selected' : ''} ${resultClass(o, i)}" data-action="select" data-i="${i}" ${s.checked ? 'disabled' : ''}><span class="key">${i + 1}</span>${esc(o.text)}</button>`;
}

function resultClass(o, i) {
  const s = session;
  if (!s.checked) return '';
  if (o.correct) return 'right';
  const idx = i ?? currentItem().view.indexOf(o);
  return s.selected === idx ? 'wrong' : '';
}

function canCheck(it) {
  const s = session;
  if (it.type === 'card') return true;
  if (it.type === 'order') return s.picked.length === it.bank.length;
  if (it.type === 'match') return s.matched.length === it.pairs.length;
  return s.selected != null;
}

function correctAnswerText(it) {
  if (it.type === 'mc' || it.type === 'fill') return it.options[it.answer];
  if (it.type === 'tf') return it.answer ? 'Verdadero' : 'Falso';
  if (it.type === 'order') return it.items.join(' → ');
  return '';
}

function renderFooter(it) {
  const s = session;
  if (it.type === 'card') return `<footer class="lesson-foot"><button class="btn primary big" data-action="continue">Entendido</button></footer>`;
  if (!s.checked) {
    return `<footer class="lesson-foot"><button class="btn primary big" data-action="check" ${canCheck(it) ? '' : 'disabled'}>Comprobar</button></footer>`;
  }
  const ok = s.correct;
  const praise = ['¡Excelente!', '¡Correcto!', '¡Así se coordina!', '¡Cero interferencias!', '¡Bien hecho!'];
  return `
    <footer class="lesson-foot feedback ${ok ? 'ok' : 'ko'}">
      <div>
        <b>${ok ? praise[(s.solved + s.index) % praise.length] : 'Respuesta correcta:'}</b>
        ${!ok ? `<p>${esc(correctAnswerText(it))}</p>` : ''}
        ${it.explain ? `<p class="explain">${esc(it.explain)}</p>` : ''}
      </div>
      <button class="btn ${ok ? 'primary' : 'danger'} big" data-action="continue">Continuar</button>
    </footer>`;
}

function check() {
  const s = session;
  const it = currentItem();
  if (!canCheck(it)) return;
  let ok = false;
  if (it.type === 'mc' || it.type === 'fill') ok = it.view[s.selected].correct;
  else if (it.type === 'tf') ok = (s.selected === 0) === it.answer;
  else if (it.type === 'order') ok = s.picked.every((i, k) => it.bank[i] === it.items[k]);
  else if (it.type === 'match') ok = !s.itemMistake;
  s.checked = true;
  s.correct = ok || it.type === 'match';
  // En "match" el error ya se registró al fallar la pareja.
  if (!ok && it.type !== 'match') registerMistake(it);
  vibrate(ok ? 15 : [40, 40, 40]);
  render();
}

function registerMistake(it) {
  const s = session;
  s.mistakes += 1;
  // Duolingo-style: el ejercicio fallado vuelve al final de la lección.
  if (it.type !== 'match') s.queue.push(buildItem(stripView(it)));
  if (s.kind === 'lesson') {
    E.loseHeart(state);
    save();
  }
}

function stripView(it) {
  const { view, bank, left, right, ...rest } = it;
  return rest;
}

function continueLesson() {
  const s = session;
  const it = currentItem();
  if (it.type === 'card' || s.correct) s.solved += 1;
  if (s.kind === 'lesson' && state.hearts <= 0 && !s.correct && it.type !== 'card') {
    showNoHearts(true);
    return;
  }
  s.index += 1;
  Object.assign(s, freshAnswer());
  if (s.index >= s.queue.length) return finishSession();
  render();
}

function finishSession() {
  const s = session;
  let res;
  if (s.kind === 'lesson') res = E.completeLesson(state, s.lesson.id, { mistakes: s.mistakes });
  else res = E.completePractice(state, { mistakes: s.mistakes });
  const trigger = s.kind === 'lesson' ? E.upsellTriggerAfterLesson(state, s.unit) : null;
  save();
  pendingResult = { ...res, trigger, kind: s.kind, title: s.lesson.title, fromPlan: s.fromPlan };
  session = null;
  go('result');
  vibrate([20, 60, 20]);
}

function renderResult() {
  const r = pendingResult;
  if (!r) return renderHome();
  const today = E.xpToday(state);
  return `
    <main class="result">
      <div class="confetti" aria-hidden="true">${Array.from({ length: 24 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 6) * 0.15}s"></i>`).join('')}</div>
      <div class="mascot big">${r.perfect ? '🏆' : '🎉'}</div>
      <h1>${r.kind === 'practice' ? '¡Práctica completa!' : r.perfect ? '¡Lección perfecta!' : '¡Lección completada!'}</h1>
      <p class="muted">${esc(r.title)}</p>
      <div class="result-stats">
        <div class="rstat xp"><small>XP</small><b>+${r.xpGained}</b></div>
        ${r.gemsGained ? `<div class="rstat gem"><small>Gemas</small><b>+${r.gemsGained}</b></div>` : ''}
        <div class="rstat fire"><small>Racha</small><b>🔥 ${state.streak}</b></div>
        ${r.heartRestored ? `<div class="rstat heart"><small>Vida</small><b>+1 ❤️</b></div>` : ''}
      </div>
      ${r.streakIncreased ? `<p class="callout">🔥 ¡Racha de ${state.streak} ${state.streak === 1 ? 'día' : 'días'}! Vuelve mañana para no perderla.</p>` : ''}
      ${r.goalReachedNow ? `<p class="callout gold">🎯 ¡Cumpliste tu meta diaria de ${state.dailyGoal} XP!</p>` : `<p class="muted">Meta diaria: ${today}/${state.dailyGoal} XP</p>`}
      ${r.newAchievements.map((a) => `<div class="achv-new">${a.icon} <b>Logro desbloqueado:</b> ${esc(a.title)}</div>`).join('')}
      <button class="btn primary big" data-action="result-continue">Continuar</button>
    </main>`;
}

// ── Planes BIM ────────────────────────────────────────────────
function renderPlans() {
  const plan = state.plan && planById(state.plan.id);
  if (!plan) {
    return `
      ${topBar()}
      <main class="page">
        <h1>Planes BIM</h1>
        <p class="muted">Un día a la vez: lección de 5 minutos, video, tarea en tu proyecto real y la herramienta para aplicarla.</p>
        ${plansForProfile(state.profile)
          .map((p, i) => {
            const fit = p.for === 'all' || p.for.includes(state.profile);
            return `<section class="card plan-card ${fit ? '' : 'dim'}">
              <div class="plan-ic">${p.icon}</div>
              <div><h3>${esc(p.title)}</h3><p class="muted">${esc(p.desc)}</p><small class="muted">${p.days.length} días${i === 0 && fit ? ' · Recomendado para ti' : ''}</small></div>
              <button class="btn ${i === 0 && fit ? 'primary' : ''} small" data-action="plan-start" data-id="${p.id}">Empezar</button>
            </section>`;
          })
          .join('')}
      </main>
      ${bottomNav('plans')}`;
  }
  const st = E.planDayStatuses(state);
  const i = Math.min(state.plan.done.length, plan.days.length - 1);
  const day = plan.days[i];
  const found = lessonById(day.lesson);
  const lessonDone = Boolean(state.completed[day.lesson]);
  const video = videoFor(day.lesson);
  const finished = Boolean(state.plan.finishedAt);
  const pct = Math.round((state.plan.done.length / plan.days.length) * 100);
  return `
    ${topBar()}
    <main class="page">
      <section class="plan-head">
        <span class="plan-ic big">${plan.icon}</span>
        <div><h1>${esc(plan.title)}</h1><p class="muted">${state.plan.done.length}/${plan.days.length} días · ${pct}%</p><div class="bar"><i style="width:${pct}%"></i></div></div>
      </section>
      ${
        finished
          ? `<section class="card"><h3>🏆 Plan completado</h3><p class="muted">Elige otro plan o lleva lo aprendido a un proyecto real.</p><button class="btn gold" data-action="go" data-to="consult">Consultoría 1:1</button></section>`
          : `<section class="card today ${st[i]}">
        <span class="kicker">${st[i] === 'tomorrow' ? '✅ Hoy ya cumpliste · mañana sigue' : `📅 Día ${i + 1} de ${plan.days.length}`}</span>
        <h3>${esc(found.lesson.title)}</h3>
        <ol class="steps-list">
          <li class="${lessonDone ? 'ok' : ''}"><b>Lección de 5 min</b><button class="btn small ${lessonDone ? '' : 'primary'}" data-action="plan-lesson" data-id="${day.lesson}">${lessonDone ? 'Repasar' : 'Empezar'}</button></li>
          <li><b>Video</b>${video ? `<button class="btn small" data-action="watch" data-id="${day.lesson}">▶ Ver</button>` : `<button class="btn small" data-action="go" data-to="practice">🎬 Videoteca</button>`}</li>
          <li><b>Aplica en tu proyecto</b><span>${esc(day.task)}</span></li>
          ${day.tool ? `<li><b>Herramienta</b><a class="btn small" href="${day.tool.href}">${esc(day.tool.label)} ↗</a></li>` : ''}
        </ol>
        ${st[i] === 'today' ? `<button class="btn primary big" data-action="plan-done" ${E.canCompletePlanDay(state) ? '' : 'disabled'}>${lessonDone ? 'Marcar día completo' : 'Completa la lección para cerrar el día'}</button>` : ''}
      </section>`
      }
      <section class="card">
        <h3>Recorrido</h3>
        <ul class="day-list">${plan.days
          .map((dd, k) => `<li class="${st[k]}"><span class="dot">${st[k] === 'done' ? '✔' : k + 1}</span><span>${esc(lessonById(dd.lesson).lesson.title)}</span></li>`)
          .join('')}</ul>
      </section>
      <button class="btn ghost" data-action="plan-change">Cambiar de plan</button>
    </main>
    ${bottomNav('plans')}`;
}

// ── Práctica ──────────────────────────────────────────────────
function renderPractice() {
  const doneCount = Object.keys(state.completed).length;
  return `
    ${topBar()}
    <main class="page">
      <h1>Practicar</h1>
      <section class="card practice-card">
        <div class="mascot">🏋️</div>
        <div>
          <h3>Repaso inteligente</h3>
          <p class="muted">6 ejercicios de lo que ya aprendiste. No cuesta vidas y <b>recupera 1 ❤️</b>.</p>
          <button class="btn primary" data-action="start-practice" ${doneCount ? '' : 'disabled'}>${doneCount ? 'Empezar práctica' : 'Completa una lección primero'}</button>
        </div>
      </section>
      ${checklistOffer()}
      ${videoLibrary()}
      <section class="card">
        <h3>Checklists de despegue</h3>
        <p class="muted">Llévalos a tu próximo proyecto en Revit:</p>
        <ul class="checklist">
          <li>☐ Plantilla correcta · unidades · niveles en alzado</li>
          <li>☐ Rejillas colocadas · norte definido · modelo limpio sin 2D</li>
          <li>☐ Muros → puertas → ventanas → pisos → cielos → cubiertas → componentes</li>
          <li>☐ View Template aplicado desde el inicio (A-01 a A-06)</li>
          <li>☐ Tablas: Type + Area/Length/Count · totales activados</li>
          <li>☐ Gate de coordinación: topografía, ARQ y EST validadas, coordenadas compartidas</li>
        </ul>
      </section>
    </main>
    ${bottomNav('practice')}`;
}

// ── Perfil ────────────────────────────────────────────────────
function weekStrip() {
  const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const today = E.dayKey();
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const k = E.addDays(today, -i);
    const xp = state.xpByDay[k] || 0;
    const d = new Date(`${k}T12:00:00`);
    html += `<div class="day ${xp ? 'on' : ''} ${i === 0 ? 'today' : ''}"><small>${days[d.getDay()]}</small><span>${xp ? '🔥' : '·'}</span><small>${xp || ''}</small></div>`;
  }
  return `<div class="week">${html}</div>`;
}

function renderProfile() {
  const prog = E.overallProgress(state);
  const perm = R.permission();
  return `
    ${topBar()}
    <main class="page">
      <section class="profile-head">
        <div class="avatar">${profileInfo().icon}</div>
        <div>
          <h1>${esc(state.name || 'Estudiante BIM')}</h1>
          <p class="muted">${esc(profileInfo().label)} · desde ${new Date(state.createdAt).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</p>
        </div>
      </section>
      ${accountCard()}
      <section class="grid4">
        <div class="tile"><b>🔥 ${state.streak}</b><small>Racha actual</small></div>
        <div class="tile"><b>🏅 ${state.longestStreak}</b><small>Mejor racha</small></div>
        <div class="tile"><b>⭐ ${state.xp}</b><small>XP total</small></div>
        <div class="tile"><b>📘 ${prog.pct}%</b><small>Curso</small></div>
      </section>
      <section class="card"><h3>Esta semana</h3>${weekStrip()}</section>

      <section class="card">
        <h3>Logros</h3>
        <div class="achvs">${E.ACHIEVEMENTS.map((a) => `<div class="achv ${state.achievements[a.id] ? 'on' : ''}"><span>${a.icon}</span><b>${esc(a.title)}</b><small>${esc(a.desc)}</small></div>`).join('')}</div>
      </section>

      <section class="card">
        <h3>Tienda</h3>
        <div class="shop-item">
          <span class="big-ic">🧊</span>
          <div><b>Protector de racha</b><p class="muted">Cubre un día sin práctica. Tienes ${state.streakFreezes}/2.</p></div>
          <button class="btn small" data-action="buy-freeze" ${state.gems < CONFIG.streakFreezeCost || state.streakFreezes >= 2 ? 'disabled' : ''}>💎 ${CONFIG.streakFreezeCost}</button>
        </div>
      </section>

      <section class="card settings">
        <h3>Recordatorios</h3>
        <label>Hora del recordatorio diario
          <input type="time" class="input" id="set-time" value="${esc(state.reminderTime)}" />
        </label>
        <p class="muted small">Estado: ${perm === 'granted' && state.notificationsEnabled ? '🔔 Activos' : perm === 'denied' ? '🚫 Bloqueados en el navegador (actívalos en la configuración del sitio)' : perm === 'unsupported' ? 'Este navegador no soporta notificaciones' : '🔕 Desactivados'}</p>
        <div class="row">
          ${state.notificationsEnabled && perm === 'granted' ? `<button class="btn small" data-action="notify-off">Desactivar</button><button class="btn small" data-action="notify-test">Probar</button>` : `<button class="btn small primary" data-action="notify-on">Activar notificaciones</button>`}
          <button class="btn small" data-action="ics">📅 Añadir a mi calendario</button>
        </div>
        <p class="muted small">Tip: instala la app en tu celular ("Añadir a pantalla de inicio") para recibir los recordatorios aunque esté cerrada.</p>

        <h3>Meta y ruta</h3>
        <label>Meta diaria
          <select id="set-goal" class="input">${CONFIG.dailyGoalOptions.map((g) => `<option value="${g.xp}" ${g.xp === state.dailyGoal ? 'selected' : ''}>${g.label} · ${g.xp} XP</option>`).join('')}</select>
        </label>
        <label>Especialidad
          <select id="set-profile" class="input">${PROFILES.map((p) => `<option value="${p.id}" ${p.id === state.profile ? 'selected' : ''}>${p.icon} ${esc(p.label)}</option>`).join('')}</select>
        </label>
        <button class="btn ghost danger-text" data-action="reset">Reiniciar progreso</button>
      </section>
      <p class="credit muted small">${CONFIG.appName} · ${CONFIG.brand} · Contenido: ${CONFIG.author}</p>
    </main>
    ${bottomNav('profile')}`;
}

// ── Consultoría (upsell: pago + agenda) ───────────────────────
function renderConsult() {
  const prog = E.overallProgress(state);
  const u = CONFIG.upsell;
  const paid = !!state.upsell.paymentClickedAt;
  const booked = !!state.upsell.bookedAt;
  return `
    ${topBar()}
    <main class="page consult">
      <section class="consult-hero">
        <span class="kicker light">⭐ Sesión 1:1 con ${esc(CONFIG.author)}</span>
        <h1>${esc(u.title)}</h1>
        <p>${esc(u.subtitle)}</p>
        <div class="price"><b>${esc(u.priceLabel || 'Consulta el valor')}</b><small>${esc(u.durationLabel)}</small></div>
      </section>

      ${checklistOffer('Empieza por aquí')}
      <section class="card personal">
        <b>Tu punto de partida</b>
        <p class="muted">${esc(profileInfo().label)} · ${prog.pct}% del curso · racha de ${state.streak} 🔥. Llegas con la base: en la sesión la aplicamos a <b>tu</b> proyecto.</p>
      </section>

      <section class="card">
        <h3>Qué trabajamos (Auditoría BIM 360°)</h3>
        <ul class="value">
          <li><span>🧠</span><div><b>Psicología del despegue</b><small>BIM sin más recursos: orden, estructura y cero resistencia del equipo.</small></div></li>
          <li><span>🔀</span><div><b>Auditoría de procesos</b><small>Mapa de flujo de información, LOD por fase, entregables por rol y BEP simplificado.</small></div></li>
          <li><span>👥</span><div><b>Auditoría de personas</b><small>Quién va en cada rol: modelador, coordinador, BIM Manager, BIM Lead.</small></div></li>
          <li><span>💻</span><div><b>Auditoría tecnológica</b><small>Licencias, versión unificada, worksets, coordenadas compartidas, CDE.</small></div></li>
          <li><span>🧩</span><div><b>Sistema de coordinación</b><small>Tolerancia 5 mm, clasificación de interferencias y estrategias que eliminan el 70–80% de conflictos repetitivos.</small></div></li>
          <li><span>🗂️</span><div><b>Plan piloto</b><small>CDE, BEP y modelo federado georreferenciado para tu primer proyecto.</small></div></li>
        </ul>
      </section>

      <section class="card steps">
        <h3>Reserva en 2 pasos</h3>
        ${booked ? `<div class="callout gold">✅ ¡Sesión agendada! Revisa tu correo para la confirmación. Mientras tanto, mantén tu racha 🔥</div>` : ''}
        <label>Tu correo (para enviarte la confirmación)
          <input id="lead-email" type="email" class="input" placeholder="tucorreo@empresa.com" value="${esc(state.upsell.email)}" autocomplete="email" />
        </label>
        <div class="step ${paid ? 'done' : 'active'}">
          <span class="num">${paid ? '✔' : '1'}</span>
          <div><b>Pago seguro</b><small>Confirma tu cupo de consultoría.</small></div>
          <button class="btn primary" data-action="pay">${paid ? 'Abrir pago de nuevo' : 'Pagar sesión'}</button>
        </div>
        <div class="step ${booked ? 'done' : paid ? 'active' : 'locked'}">
          <span class="num">${booked ? '✔' : '2'}</span>
          <div><b>Agenda tu llamada</b><small>Elige el día y la hora que te sirvan.</small></div>
          <button class="btn ${paid ? 'gold' : ''}" data-action="book" ${paid ? '' : 'disabled'}>Ya pagué · Agendar</button>
        </div>
        <p class="muted small">¿Preguntas antes de reservar? <a href="https://wa.me/${u.contactWhatsapp}?text=${encodeURIComponent(`Hola Juan David, vengo de ${CONFIG.appName} (${profileInfo().label}, ${prog.pct}% del curso) y quiero información de la consultoría 1:1.`)}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a></p>
      </section>
    </main>
    ${bottomNav('consult')}`;
}

function trackingParams() {
  const prog = E.overallProgress(state);
  return new URLSearchParams({ utm_source: 'despegue-bim', utm_medium: 'app', utm_campaign: 'consultoria-1a1', perfil: state.profile || '', progreso: String(prog.pct), nombre: state.name || '', email: state.upsell.email || '' }).toString();
}

function withParams(url) {
  return url + (url.includes('?') ? '&' : '?') + trackingParams();
}

async function sendLead(event) {
  const url = CONFIG.upsell.leadWebhookUrl;
  if (!url) return;
  const prog = E.overallProgress(state);
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, name: state.name, email: state.upsell.email, profile: state.profile, progressPct: prog.pct, streak: state.streak, xp: state.xp, at: new Date().toISOString() })
    });
  } catch {
    /* sin conexión: no bloquea el flujo */
  }
}

const PLAYLISTS_COUNT = unassignedPlaylists().length;

function videoRow(attr, v, subtitle) {
  const thumb = v.thumb ? `style="background-image:url(${v.thumb})"` : '';
  return `<li><button class="vrow" data-action="watch" ${attr}><span class="vthumb ${v.type}" ${thumb}>${v.type === 'playlist' ? '☰▶' : '▶'}</span><span><b>${esc(v.title)}</b><small>${esc(subtitle)}</small></span></button></li>`;
}

// Oferta del Checklist BIM (app aparte con suscripción por Wompi + playbooks de regalo).
function checklistOffer(kicker = 'Producto descargable') {
  const c = CONFIG.checklist;
  return `
    <section class="card checklist-offer">
      <span class="kicker">📋 ${esc(kicker)}</span>
      <h3>${esc(c.title)}</h3>
      <p class="muted">${esc(c.subtitle)}</p>
      <ul class="mini-value">${c.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      <div class="gift"><b>🎁 Gratis con tu suscripción</b><ul>${c.gifts.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>
      <a class="btn gold big" href="${c.appUrl}">${esc(c.cta)}</a>
    </section>`;
}

// Videoteca: videos de las lecciones ya desbloqueadas (y no bloqueadas por PRO).
function videoLibrary() {
  const statuses = E.lessonStatuses(state);
  const rows = [];
  for (const unit of E.getPath(state)) {
    if (needsPro(unit)) continue;
    for (const l of unit.lessons) {
      const v = videoFor(l.id);
      if (v && statuses[l.id] !== 'locked') rows.push(videoRow(`data-id="${l.id}"`, v, unit.title));
    }
  }
  // Listas aún sin lección asignada: abiertas si no hay muro de pago, o para PRO.
  if (!A.premiumRequired() || account.premium) {
    for (const pl of unassignedPlaylists()) rows.push(videoRow(`data-n="${pl.n}"`, playlistMedia(pl.n), 'Curso en video · Juan David Barona'));
  }
  const total = Object.values(VIDEOS).filter((v) => v.url).length + PLAYLISTS_COUNT;
  if (!total) return '';
  return `
    <section class="card">
      <h3>🎬 Videoteca</h3>
      ${rows.length ? `<ul class="vlist">${rows.join('')}</ul>` : '<p class="muted">Los videos aparecen a medida que desbloqueas lecciones.</p>'}
    </section>`;
}

// ── PRO (muro de pago) y login ────────────────────────────────
function renderPremium() {
  const pc = CONFIG.premium;
  const containerId = `paypal-button-container-${CONFIG.paypal.planId}`;
  let action = '';
  if (!A.premiumRequired()) {
    action = `<p class="callout">Todo el contenido está abierto mientras no se configuren las cuentas.</p><button class="btn primary big" data-action="go" data-to="home">Ir al curso</button>`;
  } else if (!account.ready) {
    action = `<p class="muted center">Cargando tu cuenta…</p>`;
  } else if (account.premium || ui.payStatus === 'ok') {
    action = `
      <div class="callout gold">👑 ¡Eres PRO! Tienes acceso a todo el curso.</div>
      <button class="btn primary big" data-action="pro-continue">${ui.pendingLesson ? 'Continuar con mi lección' : 'Ir al curso'}</button>`;
  } else if (!account.user) {
    action = `
      <div class="step active"><span class="num">1</span><div><b>Crea tu cuenta gratis</b><small>Guarda tu progreso y vincula tu suscripción.</small></div></div>
      <button class="btn primary big" data-action="go-login" data-return="premium" data-mode="up">Crear cuenta</button>
      <button class="btn ghost" data-action="go-login" data-return="premium" data-mode="in">Ya tengo cuenta · Iniciar sesión</button>`;
  } else {
    const err = ui.payStatus?.startsWith('error:') ? ui.payStatus.slice(6) : '';
    action = `
      <div class="step done"><span class="num">✔</span><div><b>Cuenta lista</b><small>${esc(account.user.email || account.user.name)}</small></div></div>
      <div class="step active"><span class="num">2</span><div><b>Suscríbete con PayPal</b><small>Pago seguro. Cancela cuando quieras desde tu cuenta PayPal.</small></div></div>
      ${ui.activating ? `<p class="callout">⏳ Activando tu suscripción con PayPal…</p>` : `<div id="${containerId}" class="paypal-box"><p class="muted center">Cargando PayPal…</p></div>`}
      ${ui.payStatus === 'pending' ? `<p class="callout">⏳ PayPal está confirmando tu pago. Tu cuenta PRO se activará sola en unos minutos; puedes seguir con el Playbook 1 mientras tanto.</p>` : ''}
      ${err ? `<p class="callout error">${esc(err)}</p>` : ''}`;
  }
  return `
    ${topBar()}
    <main class="page premium">
      <section class="pro-hero">
        <div class="mascot big">👑</div>
        <h1>${esc(pc.title)}</h1>
        <p>Ya derribaste los mitos. Ahora desbloquea la ruta completa para modelar, documentar y coordinar como un profesional BIM.</p>
      </section>
      <section class="card">
        <ul class="value pro-list">${pc.benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      </section>
      <section class="card steps">${action}</section>
      <p class="muted small center">Al suscribirte aceptas el cobro recurrente del plan de PayPal. La consultoría 1:1 se adquiere por separado.</p>
    </main>
    ${bottomNav(null)}`;
}

function renderLogin() {
  const up = ui.authMode === 'up';
  const busy = ui.authBusy;
  if (!A.premiumRequired()) {
    return `${topBar()}<main class="page"><h1>Cuentas</h1><p class="callout">Las cuentas aún no están configuradas en esta instalación.</p><button class="btn primary big" data-action="go" data-to="home">Volver</button></main>${bottomNav(null)}`;
  }
  return `
    <main class="page auth">
      <button class="back" data-action="go" data-to="${esc(ui.returnTo || 'home')}" aria-label="Atrás">←</button>
      <div class="hero small"><div class="mascot">🏗️</div></div>
      <h1 class="center">${up ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
      <p class="muted center">Tu progreso y tu suscripción quedan guardados en todos tus dispositivos.</p>
      <button class="btn big google" data-action="auth-google" ${busy ? 'disabled' : ''}>
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continuar con Google
      </button>
      <div class="divider"><span>o con tu correo</span></div>
      <form id="auth-form" novalidate>
        ${up ? `<label>Nombre<input id="auth-name" class="input" autocomplete="name" value="${esc(state.name)}" /></label>` : ''}
        <label>Correo<input id="auth-email" type="email" class="input" autocomplete="email" required /></label>
        <label>Contraseña<input id="auth-pass" type="password" class="input" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="6" required /></label>
        ${ui.authError ? `<p class="callout error">${esc(ui.authError)}</p>` : ''}
        <button class="btn primary big" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Un momento…' : up ? 'Crear cuenta' : 'Entrar'}</button>
      </form>
      ${up ? '' : `<button class="btn ghost" data-action="auth-reset">Olvidé mi contraseña</button>`}
      <button class="btn ghost" data-action="auth-toggle">${up ? '¿Ya tienes cuenta? Inicia sesión' : '¿Nuevo aquí? Crea tu cuenta'}</button>
    </main>`;
}

function accountCard() {
  if (!A.premiumRequired()) return '';
  if (!account.user) {
    return `
      <section class="card account">
        <h3>Tu cuenta</h3>
        <p class="muted">Inicia sesión para guardar tu progreso en la nube y desbloquear PRO.</p>
        <div class="row"><button class="btn small primary" data-action="go-login" data-return="profile" data-mode="up">Crear cuenta</button><button class="btn small" data-action="go-login" data-return="profile" data-mode="in">Iniciar sesión</button></div>
      </section>`;
  }
  const sub = account.subscription;
  return `
    <section class="card account">
      <h3>Tu cuenta</h3>
      <p><b>${esc(account.user.name || account.user.email)}</b><br><span class="muted small">${esc(account.user.email || '')}</span></p>
      <p>${account.premium ? '<span class="pro-chip inline">👑 PRO activo</span>' : '<span class="muted">Plan gratuito</span>'}${sub?.status && !account.premium ? ` <span class="muted small">(suscripción: ${esc(sub.status)})</span>` : ''}</p>
      <div class="row">
        ${account.premium ? `<a class="btn small" href="${CONFIG.paypal.manageUrl}" target="_blank" rel="noopener">Gestionar en PayPal</a>` : `<button class="btn small gold" data-action="go" data-to="premium">Hazte PRO</button>`}
        <button class="btn small" data-action="sign-out">Cerrar sesión</button>
      </div>
    </section>`;
}

// ── Modales ───────────────────────────────────────────────────
function openModal(html) {
  $modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  $modal.classList.add('show');
}

function closeModal() {
  $modal.classList.remove('show');
  $modal.innerHTML = '';
}

function showNoHearts(inLesson = false) {
  const wait = fmtMs(E.msToNextHeart(state));
  const canUpsell = E.canShowUpsell(state, 'hearts');
  if (canUpsell) E.markUpsellShown(state, 'hearts');
  save();
  openModal(`
    <div class="mascot big">💔</div>
    <h2>Te quedaste sin vidas</h2>
    <p class="muted">Recuperas 1 ❤️ en ${wait}. O practica lo que ya sabes para recuperarla ahora.</p>
    <button class="btn primary big" data-action="modal-practice">🏋️ Practicar y recuperar 1 ❤️</button>
    ${canUpsell ? `<div class="upsell-mini"><b>¿Este tema se te resiste?</b><p class="muted">Resuélvelo en una sesión 1:1 aplicada a tu proyecto.</p><button class="btn gold" data-action="modal-consult">Ver consultoría 1:1</button></div>` : ''}
    <button class="btn ghost" data-action="${inLesson ? 'modal-quit' : 'modal-close'}">${inLesson ? 'Salir de la lección' : 'Esperar'}</button>`);
}

const UPSELL_COPY = {
  midway: ['🏛️ Ya dominas los 3 pilares', 'Modelado, planimetría y cantidades: ahora veamos cómo aplicarlos en un proyecto real de tu oficina.'],
  specialty: ['🛠️ Ya modelas tu especialidad', 'El siguiente salto es coordinar sin interferencias. Lo hacemos juntos, sobre tu modelo.'],
  complete: ['🎓 Hagamos un proyecto real', 'Terminaste la ruta. Convierte lo aprendido en un plan piloto: CDE, BEP y modelo federado.'],
  streak7: ['📅 7 días seguidos', 'Eres de los que terminan lo que empiezan. Acelera con una auditoría BIM 360° de tu equipo.']
};

function showUpsellModal(trigger) {
  const [title, body] = UPSELL_COPY[trigger] || UPSELL_COPY.complete;
  E.markUpsellShown(state, trigger);
  save();
  openModal(`
    <div class="mascot big">⭐</div>
    <h2>${title}</h2>
    <p class="muted">${body}</p>
    <ul class="mini-value"><li>✔ Sesión 1:1 en vivo con un BIM Manager</li><li>✔ Auditoría de procesos, personas y tecnología</li><li>✔ Plan de acción para tu proyecto</li></ul>
    <button class="btn gold big" data-action="modal-consult">Quiero mi consultoría 1:1</button>
    <button class="btn ghost" data-action="modal-close">Ahora no, seguir aprendiendo</button>`);
}

// ── Eventos ───────────────────────────────────────────────────
const actions = {
  go: (el) => go(el.dataset.to),
  'ob-next': () => go('onboarding', { step: 1 }),
  'ob-back': () => go('onboarding', { step: Math.max(0, ui.step - 1) }),
  'ob-name': () => {
    state.name = document.getElementById('ob-name').value.trim().slice(0, 40);
    go('onboarding', { step: 2 });
  },
  'ob-profile': (el) => {
    state.profile = el.dataset.id;
    go('onboarding', { step: 3 });
  },
  'ob-goal': (el) => {
    state.dailyGoal = Number(el.dataset.xp);
    go('onboarding', { step: 4 });
  },
  'ob-notify': async () => {
    state.reminderTime = document.getElementById('ob-time').value || CONFIG.defaultReminderTime;
    const p = await R.requestPermission();
    state.notificationsEnabled = p === 'granted';
    finishOnboarding(p === 'granted' ? '🔔 ¡Listo! Te recordaremos a las ' + state.reminderTime : 'Puedes activar los recordatorios luego en tu perfil.');
  },
  'ob-finish': () => {
    const t = document.getElementById('ob-time');
    if (t) state.reminderTime = t.value || state.reminderTime;
    finishOnboarding();
  },
  'open-lesson': (el) => {
    const st = E.lessonStatuses(state)[el.dataset.id];
    if (st === 'locked') return toast('🔒 Completa las lecciones anteriores para desbloquear esta.');
    if (needsPro(lessonById(el.dataset.id).unit)) return go('premium', { pendingLesson: el.dataset.id, payStatus: null });
    startLesson(el.dataset.id);
  },
  'quit-lesson': () => {
    if (confirm('¿Salir de la lección? Perderás el progreso de esta lección.')) {
      session = null;
      go('home');
    }
  },
  select: (el) => {
    if (session.checked) return;
    session.selected = Number(el.dataset.i);
    render();
  },
  pick: (el) => {
    session.picked.push(Number(el.dataset.i));
    render();
  },
  unpick: (el) => {
    session.picked.splice(Number(el.dataset.k), 1);
    render();
  },
  'match-left': (el) => {
    session.leftSel = Number(el.dataset.i);
    session.wrongPair = null;
    render();
  },
  'match-right': (el) => {
    const s = session;
    const it = currentItem();
    if (s.leftSel == null) return toast('Primero toca un elemento de la izquierda.');
    const r = Number(el.dataset.i);
    const leftText = it.left[s.leftSel];
    const expected = it.pairs.find((p) => p[0] === leftText)[1];
    if (it.right[r] === expected && !s.matched.some((m) => m[1] === r)) {
      s.matched.push([s.leftSel, r]);
      s.leftSel = null;
      s.wrongPair = null;
      vibrate(10);
      if (s.matched.length === it.pairs.length) return check();
    } else {
      s.wrongPair = [s.leftSel, r];
      if (!s.itemMistake) {
        s.itemMistake = true;
        registerMistake(it);
      }
      vibrate([30, 30, 30]);
      if (s.kind === 'lesson' && state.hearts <= 0) {
        render();
        return showNoHearts(true);
      }
    }
    render();
  },
  check: () => check(),
  continue: () => continueLesson(),
  'result-continue': () => {
    const r = pendingResult;
    pendingResult = null;
    go(r?.fromPlan ? 'plans' : 'home');
    if (r?.trigger && E.canShowUpsell(state, r.trigger)) setTimeout(() => showUpsellModal(r.trigger), 250);
  },
  'start-practice': () => startPractice(),
  'plan-start': (el) => {
    E.startPlan(state, el.dataset.id);
    save();
    toast(`🗓️ Plan iniciado: ${planById(el.dataset.id).title}`);
    render();
  },
  'plan-change': () => {
    if (state.plan && !state.plan.finishedAt && !confirm('¿Cambiar de plan? Perderás el avance del plan actual.')) return;
    state.plan = null;
    save();
    render();
  },
  'plan-lesson': (el) => {
    const found = lessonById(el.dataset.id);
    if (needsPro(found.unit)) return go('premium', { pendingLesson: el.dataset.id, payStatus: null });
    startLesson(el.dataset.id, { fromPlan: true });
  },
  'plan-done': () => {
    const r = E.completePlanDay(state);
    if (!r) return;
    save();
    vibrate([20, 60, 20]);
    if (r.finished) {
      openModal(`<div class="mascot big">🏆</div><h2>¡Plan completado!</h2><p class="muted">Terminaste ${r.total} días de práctica aplicada. Es el momento de llevarlo a un proyecto real con acompañamiento.</p><button class="btn gold big" data-action="modal-consult">Ver consultoría 1:1</button><button class="btn ghost" data-action="modal-close">Cerrar</button>`);
    } else toast(`✅ Día ${r.day} de ${r.total} completo · +10 💎 +5 XP. Vuelve mañana por el siguiente.`, 3500);
    render();
  },
  'buy-freeze': () => {
    if (E.buyStreakFreeze(state)) {
      save();
      toast('🧊 Protector de racha activado');
      render();
    }
  },
  shop: () => go('profile'),
  'streak-info': () =>
    openModal(`<div class="mascot big">🔥</div><h2>Racha de ${state.streak} ${state.streak === 1 ? 'día' : 'días'}</h2>${weekStrip()}<p class="muted">${E.practicedToday(state) ? '¡Ya practicaste hoy!' : 'Completa una lección hoy para mantenerla.'} Mejor racha: ${state.longestStreak}. Protectores: ${state.streakFreezes} 🧊</p><button class="btn primary big" data-action="modal-close">Seguir</button>`),
  'hearts-info': () =>
    openModal(`<div class="mascot big">❤️</div><h2>${state.hearts}/${CONFIG.maxHearts} vidas</h2><p class="muted">Pierdes una vida por cada error en una lección. ${state.hearts < CONFIG.maxHearts ? `Próxima vida en ${fmtMs(E.msToNextHeart(state))}.` : 'Tienes todas tus vidas.'} La práctica no cuesta vidas y te devuelve una.</p><button class="btn primary big" data-action="modal-practice">Practicar</button><button class="btn ghost" data-action="modal-close">Cerrar</button>`),
  'modal-close': () => closeModal(),
  watch: (el) => {
    const v = el.dataset.n ? playlistMedia(el.dataset.n) : videoFor(el.dataset.id);
    if (!v) return;
    openModal(`
      <h2>${esc(v.title)}</h2>
      <div class="video-frame"><iframe src="${v.embed}" title="${esc(v.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
      <a class="btn small" href="${v.open}" target="_blank" rel="noopener">Abrir en YouTube</a>
      <button class="btn primary big" data-action="modal-close">${ui.screen === 'lesson' ? 'Volver a la lección' : 'Cerrar'}</button>`);
  },
  'modal-quit': () => {
    closeModal();
    session = null;
    go('home');
  },
  'modal-practice': () => {
    closeModal();
    session = null;
    startPractice();
  },
  'modal-consult': () => {
    closeModal();
    session = null;
    go('consult');
  },
  pay: () => {
    captureEmail();
    state.upsell.paymentClickedAt = new Date().toISOString();
    save();
    sendLead('payment_click');
    window.open(withParams(CONFIG.upsell.paymentUrl), '_blank', 'noopener');
    render();
  },
  book: () => {
    captureEmail();
    state.upsell.bookedAt = new Date().toISOString();
    save();
    sendLead('booking_click');
    window.open(withParams(CONFIG.upsell.bookingUrl), '_blank', 'noopener');
    render();
  },
  'notify-on': async () => {
    const p = await R.requestPermission();
    state.notificationsEnabled = p === 'granted';
    save();
    toast(p === 'granted' ? `🔔 Recordatorio diario a las ${state.reminderTime}` : 'El navegador no permitió las notificaciones.');
    render();
  },
  'notify-off': () => {
    state.notificationsEnabled = false;
    save();
    render();
  },
  'notify-test': async () => {
    const m = E.reminderMessage(state);
    const ok = await R.showNow(m.title, m.body);
    if (!ok) toast('No se pudo mostrar la notificación.');
  },
  ics: () => {
    const blob = new Blob([R.calendarIcs(state)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'despegue-bim-recordatorio.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  'go-login': (el) => go('login', { returnTo: el.dataset.return || ui.screen, authMode: el.dataset.mode || 'in', authError: null }),
  'auth-toggle': () => {
    ui.authMode = ui.authMode === 'up' ? 'in' : 'up';
    ui.authError = null;
    render();
  },
  'auth-google': () => runAuth(() => A.signInGoogle()),
  'auth-reset': async () => {
    const email = document.getElementById('auth-email')?.value.trim();
    if (!email) return showAuthError('Escribe tu correo y vuelve a tocar "Olvidé mi contraseña".');
    try {
      await A.resetPassword(email);
      toast('📧 Te enviamos un correo para restablecer tu contraseña.', 3500);
    } catch (e) {
      showAuthError(A.errorMessage(e));
    }
  },
  'sign-out': async () => {
    if (!confirm('¿Cerrar sesión? Tu progreso queda guardado en tu cuenta.')) return;
    await A.signOut();
    mergedFor = null;
    toast('Sesión cerrada');
  },
  'pro-continue': () => {
    const id = ui.pendingLesson;
    ui.pendingLesson = null;
    if (id) startLesson(id);
    else go('home');
  },
  reset: () => {
    if (!confirm('¿Seguro? Se borrará todo tu progreso.')) return;
    state = E.defaultState();
    save();
    go('onboarding', { step: 0 });
  }
};

// ── Cuenta: login, muro PRO y activación ─────────────────────
async function runAuth(fn) {
  ui.authBusy = true;
  ui.authError = null;
  render();
  try {
    await fn();
    ui.authBusy = false;
    toast(`👋 ¡Hola${account.user?.name ? `, ${account.user.name}` : ''}!`);
    go(ui.returnTo && ui.returnTo !== 'login' ? ui.returnTo : 'home');
  } catch (e) {
    ui.authBusy = false;
    showAuthError(A.errorMessage(e));
  }
}

function showAuthError(msg) {
  ui.authError = msg;
  render();
}

async function onSubscriptionApproved(subscriptionID) {
  ui.activating = true;
  ui.payStatus = null;
  render();
  try {
    const r = await A.activateSubscription(subscriptionID);
    ui.activating = false;
    if (r.premium) {
      account.premium = true;
      vibrate([20, 60, 20]);
      toast('👑 ¡Bienvenido a Despegue BIM PRO!', 3500);
      ui.payStatus = 'ok';
    } else ui.payStatus = 'pending';
  } catch (e) {
    ui.activating = false;
    ui.payStatus = e?.code === 'functions/failed-precondition' ? 'pending' : `error:${A.errorMessage(e)}`;
  }
  render();
}

function captureEmail() {
  const el = document.getElementById('lead-email');
  if (el) state.upsell.email = el.value.trim();
}

function finishOnboarding(msg) {
  if (!state.profile) state.profile = PROFILES[0].id;
  state.onboarded = true;
  save();
  go('home');
  if (msg) toast(msg);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  if ($modal.contains(el) || $app.contains(el)) {
    const fn = actions[el.dataset.action];
    if (fn) fn(el);
  }
});

$modal.addEventListener('click', (e) => {
  if (e.target === $modal) closeModal();
});

document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'set-time') {
    state.reminderTime = e.target.value || CONFIG.defaultReminderTime;
    save();
    toast(`⏰ Recordatorio a las ${state.reminderTime}`);
  } else if (id === 'set-goal') {
    state.dailyGoal = Number(e.target.value);
    save();
  } else if (id === 'set-profile') {
    state.profile = e.target.value;
    save();
    toast(`Ruta actualizada: ${profileInfo().label}`);
    render();
  }
});

// Teclado en lecciones: 1-4 para elegir, Enter para comprobar/continuar.
document.addEventListener('keydown', (e) => {
  if (ui.screen === 'onboarding' && e.key === 'Enter' && ui.step === 1) return actions['ob-name']();
  if (ui.screen !== 'lesson' || !session || $modal.classList.contains('show')) return;
  const it = currentItem();
  if (/^[1-9]$/.test(e.key) && !session.checked && (it.type === 'mc' || it.type === 'fill' || it.type === 'tf')) {
    const i = Number(e.key) - 1;
    const n = it.type === 'tf' ? 2 : it.view.length;
    if (i < n) {
      session.selected = i;
      render();
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (it.type === 'card' || session.checked) continueLesson();
    else check();
  }
});

window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (!state.onboarded || ui.screen === 'lesson' || h === ui.screen) return;
  if (['home', 'plans', 'practice', 'profile', 'consult', 'premium'].includes(h)) go(h);
});

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'auth-form') return;
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  if (ui.authMode === 'up') {
    const name = document.getElementById('auth-name').value.trim() || state.name;
    runAuth(() => A.signUpEmail(name, email, pass));
  } else runAuth(() => A.signInEmail(email, pass));
});

function vibrate(p) {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* ignorar */
  }
}

function afterRender() {
  const box = document.getElementById(`paypal-button-container-${CONFIG.paypal.planId}`);
  if (box && ui.screen === 'premium' && account.user && !account.premium && !ui.activating) {
    P.renderSubscribeButton(box, {
      uid: account.user.uid,
      onApproved: onSubscriptionApproved,
      onCancel: () => toast('Pago cancelado. Puedes intentarlo cuando quieras.'),
      onError: () => {
        ui.payStatus = 'error:PayPal no pudo procesar el pago. Intenta de nuevo.';
        render();
      }
    }).catch((e) => {
      box.innerHTML = `<p class="muted">${esc(e.message)}</p>`;
    });
  }
  const label = $app.querySelector('.node.current');
  if (label && ui.screen === 'home' && !afterRender.scrolled) {
    afterRender.scrolled = true;
    label.scrollIntoView({ block: 'center' });
  }
}

// ── Arranque ──────────────────────────────────────────────────
function boot() {
  const r = E.refreshStreak(state);
  E.refreshHearts(state);
  const h = location.hash.slice(1);
  if (state.onboarded && ['home', 'plans', 'practice', 'profile', 'consult', 'premium'].includes(h)) ui.screen = h;
  save();
  render();
  if (r.frozeUsed) toast(`🧊 Tu protector salvó tu racha de ${state.streak} días`);
  else if (r.lost) toast(`💔 Perdiste tu racha de ${r.lostStreak} días. ¡Empieza una nueva hoy!`, 4000);
  else if (state.onboarded && R.missedReminderToday(state) && state.streak > 0) toast(`🔥 Tu racha de ${state.streak} días te espera. ¡Una lección y listo!`, 3500);
}

A.onChange(() => {
  // Al iniciar sesión: recupera el progreso de la nube si es mayor que el local.
  if (account.user && mergedFor !== account.user.uid) {
    mergedFor = account.user.uid;
    const remote = account.remoteProgress;
    if (remote && (remote.xp || 0) > (state.xp || 0)) {
      state = { ...E.defaultState(), ...remote };
      toast('☁️ Recuperamos tu progreso guardado');
    }
    if (!state.name && account.user.name) state.name = account.user.name;
    save();
  }
  if (ui.screen !== 'lesson') render();
});
A.init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

boot();
