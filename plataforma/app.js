// Plataforma BIM · Life City
// Cuenta gratis → acceso PRO (Wompi) → checklist por gates, marketplace de playbooks,
// herramientas (tablero de coordinación) y, para miembros PRO, consultoría 1:1.

import { CONFIG } from '../js/config.js';
import * as A from '../js/account.js';
import { GROUPS, itemKey, allItemKeys } from './data.js';
import { PLAYBOOKS, CATEGORIES, TOOLS } from './catalog.js';
import { t } from './i18n.js';

const { account } = A;
const $app = document.getElementById('app');
const $modal = document.getElementById('modal');
const $toast = document.getElementById('toast');
const LOCAL_KEY = 'checklist-bim-projects';
const COLLECTION = 'checklists';
const KEYS = allItemKeys();
const TOTAL = KEYS.length;
const STATUSES = ['todo', 'progress', 'blocked', 'done'];
const VIEWS = ['checklist', 'marketplace', 'tools', 'consult'];

const params = new URLSearchParams(location.search);
let lang = readLang();
let ui = {
  view: readView(),
  auth: false,
  authMode: 'up',
  authError: null,
  busy: false,
  gate: null,
  q: '',
  status: '',
  cat: '',
  openNotes: new Set(),
  verifying: params.has('paid')
};
let projects = null;
let currentId = null;
let loadedFor = null;
const saveTimers = {};

// ── Utilidades ────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const tr = (key, vars) => t(lang, key, vars);
const L = (obj) => obj?.[lang] ?? obj?.es ?? '';
const uid = () => Math.random().toString(36).slice(2, 10);
const isDemo = () => !A.isConfigured();
const proUntil = () => A.accessUntil('checklistProUntil');
const isPro = () => isDemo() || proUntil() > Date.now();

function readLang() {
  try {
    const saved = localStorage.getItem('checklist-lang');
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* sin almacenamiento */
  }
  return (navigator.language || 'es').startsWith('en') ? 'en' : 'es';
}

function readView() {
  const h = location.hash.slice(1).split('/')[0];
  return VIEWS.includes(h) ? h : 'checklist';
}

function go(view) {
  ui.view = view;
  ui.auth = false;
  if (location.hash.slice(1) !== view) history.replaceState(null, '', `#${view}`);
  render();
  window.scrollTo(0, 0);
}

function toast(msg, ms = 2600) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $toast.classList.remove('show'), ms);
}

// ── Proyectos del checklist ───────────────────────────────────
function normalize(p) {
  const status = { ...(p.status || {}) };
  for (const k of Object.keys(p.checked || {})) if (p.checked[k] && !status[k]) status[k] = 'done';
  return { id: p.id, name: p.name || tr('defaultProject'), status, notes: { ...(p.notes || {}) } };
}

async function loadProjects() {
  const owner = isDemo() ? 'demo' : account.user?.uid;
  if (!owner || loadedFor === owner) return;
  loadedFor = owner;
  try {
    const raw = isDemo() ? JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') : await A.listUserDocs(COLLECTION);
    projects = raw.map(normalize);
  } catch {
    projects = [];
  }
  if (!projects.length) {
    projects = [normalize({ id: uid(), name: tr('defaultProject') })];
    persist(projects[0]);
  }
  currentId = projects[0].id;
  render();
}

function persist(p) {
  if (isDemo()) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(projects));
    } catch {
      /* ignorar */
    }
    return;
  }
  clearTimeout(saveTimers[p.id]);
  saveTimers[p.id] = setTimeout(() => {
    A.saveUserDoc(COLLECTION, p.id, { name: p.name, status: p.status, notes: p.notes }).catch(() => toast('⚠️ Error'));
  }, 700);
}

const current = () => projects?.find((p) => p.id === currentId) || projects?.[0];
const statusOf = (p, k) => p.status[k] || 'todo';
const doneCount = (p, keys) => keys.filter((k) => statusOf(p, k) === 'done').length;
const groupKeys = (g) => g.sections.flatMap((s) => s.items.map((_, i) => itemKey(s.id, i)));

// ── Estructura general ────────────────────────────────────────
function render() {
  document.title = `${tr('platform')} · Life City`;
  document.documentElement.lang = lang;
  let body;
  if (!account.ready && !isDemo()) body = `<p class="center pad muted">${tr('loading')}</p>`;
  else if (ui.auth) body = renderAuth();
  else if (!isDemo() && !account.user) body = renderLanding();
  else body = { checklist: renderChecklist, marketplace: renderMarketplace, tools: renderTools, consult: renderConsult }[ui.view]();
  $app.innerHTML = header() + (isDemo() ? `<p class="demo">${tr('demo')}</p>` : '') + body;
}

function header() {
  const logged = isDemo() || account.user;
  const nav = logged && !ui.auth
    ? `<nav class="tabs">${VIEWS.filter((v) => v !== 'consult' || isPro())
        .map((v) => `<button class="${ui.view === v ? 'on' : ''}" data-action="go" data-view="${v}">${tr({ checklist: 'navChecklist', marketplace: 'navMarket', tools: 'navTools', consult: 'navConsult' }[v])}</button>`)
        .join('')}</nav>`
    : '';
  const who = account.user ? esc(account.user.name || account.user.email || '') : '';
  return `
    <header class="top">
      <div class="top-in">
        <a class="brand" href="#checklist" data-action="go" data-view="checklist"><span class="cube">⬢</span>${tr('platform').toUpperCase()}</a>
        <div class="top-right">
          ${who ? `<span class="who">${who}</span>` : ''}
          <div class="lang"><button class="${lang === 'es' ? 'on' : ''}" data-action="lang" data-lang="es">ES</button><button class="${lang === 'en' ? 'on' : ''}" data-action="lang" data-lang="en">EN</button></div>
          ${account.user ? `<button class="btn outline sm" data-action="sign-out">${tr('signOut')}</button>` : ''}
        </div>
      </div>
      ${nav ? `<div class="top-in">${nav}</div>` : ''}
    </header>`;
}

function pageHead(eyebrow, title, sub, kpiLabel, kpiValue, button = '') {
  return `
    <section class="head">
      <div>
        <p class="eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p class="sub">${sub}</p>
      </div>
      <div class="head-side">
        <div class="kpi"><small>${kpiLabel}</small><b>${kpiValue}</b></div>
        ${button}
      </div>
    </section>`;
}

// ── Checklist (gates + registro) ──────────────────────────────
function renderChecklist() {
  if (!isPro()) return renderLocked();
  if (!projects) {
    loadProjects();
    return `<p class="center pad muted">${tr('loading')}</p>`;
  }
  const p = current();
  const done = doneCount(p, KEYS);
  const pct = Math.round((done / TOTAL) * 100);
  const blocked = KEYS.filter((k) => statusOf(p, k) === 'blocked').length;
  const next = GROUPS.find((g) => doneCount(p, groupKeys(g)) < groupKeys(g).length);
  return `
    <main class="wrap">
      ${pageHead(tr('ckEyebrow'), tr('ckTitle'), tr('ckSub'), tr('kpiActions'), TOTAL, `<button class="btn dark" data-action="new-project">＋ ${tr('newProject')}</button>`)}
      <section class="project">
        <label>${tr('projects')}
          <select id="project-select">${projects.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        </label>
        <button class="btn outline sm" data-action="rename-project">${tr('rename')}</button>
        ${projects.length > 1 ? `<button class="btn outline sm" data-action="delete-project">${tr('delete')}</button>` : ''}
        <button class="btn outline sm" data-action="print">${tr('print')}</button>
        <button class="btn outline sm" data-action="reset">${tr('reset')}</button>
      </section>
      <section class="gates">${GROUPS.map((g, i) => {
        const keys = groupKeys(g);
        const d = doneCount(p, keys);
        const gp = Math.round((d / keys.length) * 100);
        return `<button class="gatecard ${ui.gate === g.id ? 'on' : ''}" data-action="gate" data-gate="${g.id}">
          <span class="g-top"><small>${tr('gate').toUpperCase()} ${String(i + 1).padStart(2, '0')}</small><small>${d}/${keys.length}</small></span>
          <b>${esc(L(g.title))}</b><small class="muted">${tr('closedPct', { n: gp })}</small>
          <span class="meter"><i style="width:${gp}%"></i></span></button>`;
      }).join('')}</section>
      <div class="cols">
        <section class="main-col">
          <div class="reg-head">
            <div><p class="eyebrow">${tr('register')}</p><h2>${ui.gate ? esc(L(GROUPS.find((g) => g.id === ui.gate).title)) : tr('allPhases')}</h2></div>
            <div class="filters">
              <input id="f-q" type="search" placeholder="${tr('search')}" value="${esc(ui.q)}" />
              <select id="f-status"><option value="">${tr('allStatuses')}</option>${STATUSES.map((s) => `<option value="${s}" ${ui.status === s ? 'selected' : ''}>${tr('st_' + s)}</option>`).join('')}</select>
            </div>
          </div>
          <div class="register" id="register">${registerRows(p)}</div>
        </section>
        <aside class="side">
          <div class="card">
            <div class="card-h"><p class="eyebrow">${tr('progressTitle')}</p><span class="badge-ic">✓</span></div>
            <p class="big">${pct}<small>%</small></p>
            <span class="meter thick"><i style="width:${pct}%"></i></span>
            <p class="row-between"><span class="muted">${tr('closed')}</span><b>${done} / ${TOTAL}</b></p>
          </div>
          <div class="card">
            <p class="eyebrow">${tr('health')}</p>
            <div class="health"><span class="hic ok">✓</span><div><b>${tr('verified')}</b><small>${tr('verifiedSub')}</small></div><b class="num">${done}</b></div>
            <div class="health"><span class="hic bad">!</span><div><b>${tr('blockedItems')}</b><small>${tr('blockedSub')}</small></div><b class="num">${blocked}</b></div>
          </div>
          <div class="card darkcard">
            <p class="eyebrow">${tr('nextGate')}</p>
            <h3>${next ? esc(L(next.title)) : tr('allGatesDone')}</h3>
            <p>${tr('nextGateBody')}</p>
          </div>
          ${consultCard()}
          ${accessCard()}
        </aside>
      </div>
    </main>`;
}

function registerRows(p) {
  const q = ui.q.trim().toLowerCase();
  const rows = [];
  for (const g of GROUPS) {
    if (ui.gate && ui.gate !== g.id) continue;
    for (const s of g.sections) {
      s.items.forEach((it, i) => {
        const k = itemKey(s.id, i);
        const st = statusOf(p, k);
        if (ui.status && st !== ui.status) return;
        if (q && !`${L(it)} ${L(s.title)} ${L(g.title)}`.toLowerCase().includes(q)) return;
        rows.push(`
          <div class="ritem st-${st}">
            <label class="cb"><input type="checkbox" data-key="${k}" ${st === 'done' ? 'checked' : ''} aria-label="${esc(L(it))}" /><span class="box"></span></label>
            <div class="ri-main">
              <p class="ri-title"><b>${esc(L(it))}</b>${it.p ? `<span class="prio ${it.p}">${tr(it.p)}</span>` : ''}</p>
              <p class="ri-desc">${esc(L(s.title))} · ${esc(L(g.title))}</p>
              <p class="ri-owner">${esc(L(g.owner))}</p>
              <details class="ri-notes" data-note="${k}" ${ui.openNotes.has(k) ? 'open' : ''}><summary>${tr('notes')}${p.notes[k] ? ' •' : ''}</summary><textarea data-note-key="${k}" rows="2" placeholder="${tr('notesPh')}">${esc(p.notes[k] || '')}</textarea></details>
            </div>
            <div class="ri-status">
              <span class="pill st-${st}">${tr('st_' + st)}</span>
              <select data-status-key="${k}" aria-label="${tr('allStatuses')}">${STATUSES.map((x) => `<option value="${x}" ${x === st ? 'selected' : ''}>${tr('st_' + x)}</option>`).join('')}</select>
            </div>
          </div>`);
      });
    }
  }
  return rows.join('') || `<p class="center pad muted">${tr('noResults')}</p>`;
}

// ── Marketplace ───────────────────────────────────────────────
function renderMarketplace() {
  const pro = isPro();
  const list = PLAYBOOKS.filter((b) => !ui.cat || b.cat === ui.cat);
  return `
    <main class="wrap">
      ${pageHead(tr('mpEyebrow'), tr('mpTitle'), tr('mpSub'), tr('kpiPlaybooks'), PLAYBOOKS.length)}
      <div class="cols">
        <section class="main-col">
          <div class="reg-head">
            <div><p class="eyebrow">MARKETPLACE</p><h2>${ui.cat ? esc(L(CATEGORIES[ui.cat])) : tr('allCats')}</h2></div>
            <div class="filters"><select id="f-cat"><option value="">${tr('allCats')}</option>${Object.entries(CATEGORIES).map(([id, c]) => `<option value="${id}" ${ui.cat === id ? 'selected' : ''}>${esc(L(c))}</option>`).join('')}</select></div>
          </div>
          <div class="register">${list
            .map(
              (b) => `
            <div class="ritem ${pro ? '' : 'is-locked'}">
              <span class="fmt">${b.format}</span>
              <div class="ri-main">
                <p class="ri-title"><b>${esc(L(b.title))}</b><span class="prio pro">PRO</span></p>
                <p class="ri-desc">${esc(L(b.desc))}</p>
                <p class="ri-owner">${esc(L(CATEGORIES[b.cat]))}</p>
              </div>
              <div class="ri-status">
                <span class="pill ${pro ? 'st-done' : 'st-blocked'}">${pro ? tr('available') : '🔒 ' + tr('locked')}</span>
                ${pro ? `<button class="btn dark sm" data-action="open-link" data-link="${b.id}">${tr('open')}</button>` : `<button class="btn gold sm" data-action="show-plans">${tr('unlock')}</button>`}
              </div>
            </div>`
            )
            .join('')}</div>
        </section>
        <aside class="side">${accessCard()}${consultCard()}</aside>
      </div>
    </main>`;
}

// ── Herramientas ──────────────────────────────────────────────
function renderTools() {
  const pro = isPro();
  return `
    <main class="wrap">
      ${pageHead(tr('toolsEyebrow'), tr('toolsTitle'), tr('toolsSub'), tr('navTools'), TOOLS.length)}
      <div class="cols">
        <section class="main-col tools">${TOOLS.map((tl) => {
          const open = tl.free || pro;
          const cta = !open
            ? `<button class="btn gold sm" data-action="show-plans">${tr('unlock')}</button>`
            : tl.link
              ? `<button class="btn dark sm" data-action="open-link" data-link="${tl.link}">${tr('open')} ↗</button>`
              : tl.route
                ? `<button class="btn dark sm" data-action="go" data-view="${tl.route}">${tr('open')}</button>`
                : `<a class="btn dark sm" href="${tl.href}">${tr('open')}</a>`;
          return `<div class="card tool ${open ? '' : 'is-locked'}"><span class="tic">${tl.icon}</span><div><h3>${esc(L(tl.title))} ${tl.free ? `<span class="prio free">${tr('free')}</span>` : '<span class="prio pro">PRO</span>'}</h3><p class="muted">${esc(L(tl.desc))}</p></div>${cta}</div>`;
        }).join('')}</section>
        <aside class="side">${accessCard()}${consultCard()}</aside>
      </div>
    </main>`;
}

// ── Consultoría (solo PRO) ────────────────────────────────────
function renderConsult() {
  if (!isPro()) return renderLocked();
  const c = CONFIG.upsell;
  return `
    <main class="wrap">
      ${pageHead(tr('consultEyebrow'), esc(c.title), esc(c.subtitle), c.priceLabel ? '' : '1:1', c.priceLabel ? esc(c.priceLabel) : '60 min')}
      <div class="cols">
        <section class="main-col">
          <div class="register">${[
            ['🧠', 'Psicología del despegue', 'BIM sin más recursos: orden, estructura y cero resistencia del equipo.'],
            ['🔀', 'Auditoría de procesos', 'Flujo de información, LOD por fase, entregables por rol y BEP simplificado.'],
            ['👥', 'Auditoría de personas', 'Quién va en cada rol: modelador, coordinador, BIM Manager, BIM Lead.'],
            ['💻', 'Auditoría tecnológica', 'Licencias, versión unificada, worksets, coordenadas compartidas, CDE.'],
            ['🧩', 'Sistema de coordinación', 'Tolerancia 5 mm, clasificación de interferencias y estrategias por disciplina.'],
            ['🗂️', 'Plan piloto', 'CDE, BEP y modelo federado georreferenciado para tu primer proyecto.']
          ]
            .map(([ic, ti, de]) => `<div class="ritem"><span class="fmt">${ic}</span><div class="ri-main"><p class="ri-title"><b>${ti}</b></p><p class="ri-desc">${de}</p></div></div>`)
            .join('')}</div>
        </section>
        <aside class="side">${consultCard(true)}</aside>
      </div>
    </main>`;
}

// ── Tarjetas laterales ────────────────────────────────────────
function consultCard(big = false) {
  if (!isPro()) return '';
  return `
    <div class="card consult">
      <p class="eyebrow">${tr('consultEyebrow')}</p>
      <h3>${tr('consultTitle')}</h3>
      <p class="muted">${tr('consultBody')}</p>
      <a class="btn gold ${big ? 'block' : 'sm'}" href="../#consult">${tr('consultCta')}</a>
    </div>`;
}

function accessCard() {
  if (isDemo()) return '';
  if (isPro()) {
    const date = new Date(proUntil()).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    const days = Math.ceil((proUntil() - Date.now()) / 86400000);
    return `<div class="card"><p class="eyebrow">${tr('accessTitle')}</p><p><span class="prio pro">PRO</span> ${tr('proUntil', { date })}</p>${days <= 7 ? `<p class="warn">${tr('expiresSoon', { d: days })}</p><button class="btn gold sm" data-action="show-plans">${tr('renew')}</button>` : ''}</div>`;
  }
  return `<div class="card darkcard"><p class="eyebrow">${tr('freePlan')}</p><h3>${tr('goPro')}</h3><p>${tr('goProBody')}</p><button class="btn gold block" data-action="show-plans">${tr('payWompi')}</button></div>`;
}

function plansHtml() {
  const w = CONFIG.wompi;
  const email = account.user?.email || '';
  return `
    <div class="plans">
      <p class="eyebrow">${tr('plansTitle')}</p>
      <div class="plan"><b>${tr('planName')}</b><span class="price">${esc(L(w.priceLabel))}</span><small class="muted">${tr('planDays', { d: w.accessDays })}</small>
        <button class="btn gold block" data-action="pay">${tr('payWompi')}</button></div>
      ${email ? `<p class="note">${tr('sameEmail', { email: esc(email) })}</p>` : ''}
      <p class="muted small">${tr('payNote')}</p>
      ${w.scriptUrl ? `<button class="btn outline block" data-action="claim">${tr('paidCheck')}</button>` : ''}
    </div>`;
}

// ── Landing / auth / bloqueo ──────────────────────────────────
function renderLanding() {
  return `
    <main class="wrap narrow">
      ${pageHead(tr('ckEyebrow'), tr('ckTitle'), tr('tagline'), tr('kpiActions'), TOTAL)}
      <section class="gates">${GROUPS.map((g, i) => `<div class="gatecard"><span class="g-top"><small>${tr('gate').toUpperCase()} ${String(i + 1).padStart(2, '0')}</small><small>🔒</small></span><b>${esc(L(g.title))}</b><small class="muted">${groupKeys(g).length} ${tr('items')}</small></div>`).join('')}</section>
      <div class="cta-row">
        <button class="btn dark" data-action="auth" data-mode="up">${tr('createAccount')}</button>
        <button class="btn outline" data-action="auth" data-mode="in">${tr('haveAccount')}</button>
      </div>
    </main>`;
}

function renderAuth() {
  const up = ui.authMode === 'up';
  return `
    <main class="wrap auth">
      <button class="link" data-action="auth-back">← ${tr('back')}</button>
      <h1>${up ? tr('signUp') : tr('signIn')}</h1>
      <button class="btn outline block google" data-action="google" ${ui.busy ? 'disabled' : ''}>
        <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        ${tr('google')}
      </button>
      <p class="divider"><span>${tr('orEmail')}</span></p>
      <form id="auth-form" novalidate>
        ${up ? `<label>${tr('name')}<input id="a-name" autocomplete="name" /></label>` : ''}
        <label>${tr('email')}<input id="a-email" type="email" autocomplete="email" required /></label>
        <label>${tr('password')}<input id="a-pass" type="password" minlength="6" autocomplete="${up ? 'new-password' : 'current-password'}" required /></label>
        ${ui.authError ? `<p class="error">${esc(ui.authError)}</p>` : ''}
        <button class="btn dark block" type="submit" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '…' : up ? tr('signUp') : tr('signIn')}</button>
      </form>
      ${up ? '' : `<button class="link" data-action="reset-pass">${tr('forgot')}</button>`}
      <button class="link" data-action="auth-toggle">${up ? tr('toSignIn') : tr('toSignUp')}</button>
    </main>`;
}

function renderLocked() {
  return `
    <main class="wrap">
      ${ui.verifying ? `<p class="note">${tr('verifying')}</p>` : ''}
      ${pageHead(tr('ckEyebrow'), tr('lockedTitle'), tr('lockedBody', { n: TOTAL }), tr('kpiActions'), TOTAL)}
      <div class="cols">
        <section class="main-col">
          <section class="gates">${GROUPS.map((g, i) => `<div class="gatecard is-locked"><span class="g-top"><small>${tr('gate').toUpperCase()} ${String(i + 1).padStart(2, '0')}</small><small>🔒</small></span><b>${esc(L(g.title))}</b><small class="muted">${groupKeys(g).length} ${tr('items')}</small></div>`).join('')}</section>
        </section>
        <aside class="side"><div class="card">${plansHtml()}</div></aside>
      </div>
    </main>`;
}

// ── Pagos Wompi ───────────────────────────────────────────────
function pay() {
  const link = CONFIG.wompi.paymentLink;
  if (!link) return toast(tr('payNotConfigured'), 3500);
  ui.verifying = true;
  closeModal();
  render();
  window.open(link, '_blank', 'noopener');
}

let claimedOnce = false;
async function claim(manual = false) {
  const url = CONFIG.wompi.scriptUrl;
  if (!url || !account.user) return;
  try {
    const idToken = await A.getIdToken();
    const data = await (await fetch(`${url}?${new URLSearchParams({ action: 'claim', idToken })}`)).json();
    if (!manual || data.granted) return;
    toast(data.error === 'email_not_verified' ? tr('claimUnverified') : tr('claimNone', { email: account.user.email }), 4500);
  } catch {
    if (manual) toast(tr('payError'), 3500);
  }
}

// Links protegidos: solo se leen de Firestore con acceso PRO.
async function openLink(id) {
  const win = window.open('about:blank', '_blank');
  const doc = isDemo() ? null : await A.getDocData('proLinks', id);
  if (doc?.url) {
    if (win) win.location.href = doc.url;
    else location.href = doc.url;
  } else {
    win?.close();
    toast(tr('linkMissing'), 3500);
  }
}

// ── Modal ─────────────────────────────────────────────────────
function openModal(html) {
  $modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}<button class="link" data-action="close">${tr('close')}</button></div>`;
  $modal.classList.add('show');
}

function closeModal() {
  $modal.classList.remove('show');
  $modal.innerHTML = '';
}

function showComplete() {
  openModal(`<p class="eyebrow">${tr('progressTitle')} · 100%</p><h2>${tr('complete')}</h2><p class="muted">${tr('completeBody')}</p>${isPro() ? `<a class="btn gold block" href="../#consult">${tr('consultCta')}</a>` : ''}`);
}

// ── Eventos ───────────────────────────────────────────────────
async function runAuth(fn) {
  ui.busy = true;
  ui.authError = null;
  render();
  try {
    await fn();
    ui.auth = false;
  } catch (e) {
    ui.authError = A.errorMessage(e);
  }
  ui.busy = false;
  render();
}

function setStatus(key, st) {
  const p = current();
  const before = doneCount(p, KEYS);
  if (st === 'todo') delete p.status[key];
  else p.status[key] = st;
  persist(p);
  render();
  if (before < TOTAL && doneCount(p, KEYS) === TOTAL) showComplete();
}

const actions = {
  go: (el) => go(el.dataset.view),
  lang: (el) => {
    lang = el.dataset.lang;
    try {
      localStorage.setItem('checklist-lang', lang);
    } catch {
      /* ignorar */
    }
    render();
  },
  gate: (el) => {
    ui.gate = ui.gate === el.dataset.gate ? null : el.dataset.gate;
    render();
  },
  auth: (el) => {
    ui.auth = true;
    ui.authMode = el.dataset.mode;
    ui.authError = null;
    render();
  },
  'auth-back': () => {
    ui.auth = false;
    render();
  },
  'auth-toggle': () => {
    ui.authMode = ui.authMode === 'up' ? 'in' : 'up';
    ui.authError = null;
    render();
  },
  google: () => runAuth(() => A.signInGoogle()),
  'reset-pass': async () => {
    const email = document.getElementById('a-email')?.value.trim();
    if (!email) return;
    try {
      await A.resetPassword(email);
      toast(tr('resetSent'), 3500);
    } catch (e) {
      ui.authError = A.errorMessage(e);
      render();
    }
  },
  'sign-out': async () => {
    await A.signOut();
    projects = null;
    loadedFor = null;
    claimedOnce = false;
  },
  pay: () => pay(),
  claim: () => claim(true),
  'show-plans': () => openModal(plansHtml()),
  close: () => closeModal(),
  'open-link': (el) => openLink(el.dataset.link),
  'new-project': () => {
    const name = prompt(tr('projectName'), '');
    if (!name) return;
    const p = normalize({ id: uid(), name: name.trim().slice(0, 60) });
    projects.push(p);
    currentId = p.id;
    persist(p);
    render();
  },
  'rename-project': () => {
    const p = current();
    const name = prompt(tr('projectName'), p.name);
    if (!name) return;
    p.name = name.trim().slice(0, 60);
    persist(p);
    render();
  },
  'delete-project': () => {
    const p = current();
    if (!confirm(tr('confirmDelete'))) return;
    projects = projects.filter((x) => x.id !== p.id);
    currentId = projects[0].id;
    if (isDemo()) persist(projects[0]);
    else A.deleteUserDoc(COLLECTION, p.id).catch(() => {});
    render();
  },
  reset: () => {
    const p = current();
    if (!confirm(tr('confirmReset'))) return;
    p.status = {};
    p.notes = {};
    persist(p);
    render();
  },
  print: () => {
    ui.gate = null;
    ui.q = '';
    ui.status = '';
    render();
    window.print();
  }
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  if (el.tagName === 'A' && el.dataset.action === 'go') e.preventDefault();
  actions[el.dataset.action]?.(el);
});

$modal.addEventListener('click', (e) => {
  if (e.target === $modal) closeModal();
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'project-select') {
    currentId = el.value;
    render();
  } else if (el.id === 'f-status') {
    ui.status = el.value;
    render();
  } else if (el.id === 'f-cat') {
    ui.cat = el.value;
    render();
  } else if (el.dataset.key) setStatus(el.dataset.key, el.checked ? 'done' : 'todo');
  else if (el.dataset.statusKey) setStatus(el.dataset.statusKey, el.value);
});

// Búsqueda y notas: actualizan sin re-render completo para no perder el foco.
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'f-q') {
    ui.q = el.value;
    const reg = document.getElementById('register');
    if (reg) reg.innerHTML = registerRows(current());
  } else if (el.dataset.noteKey) {
    const p = current();
    const v = el.value.slice(0, 1000);
    if (v) p.notes[el.dataset.noteKey] = v;
    else delete p.notes[el.dataset.noteKey];
    persist(p);
  }
});

document.addEventListener(
  'toggle',
  (e) => {
    const k = e.target?.dataset?.note;
    if (!k) return;
    if (e.target.open) ui.openNotes.add(k);
    else ui.openNotes.delete(k);
  },
  true
);

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'auth-form') return;
  e.preventDefault();
  const email = document.getElementById('a-email').value.trim();
  const pass = document.getElementById('a-pass').value;
  if (ui.authMode === 'up') runAuth(() => A.signUpEmail(document.getElementById('a-name').value.trim(), email, pass));
  else runAuth(() => A.signInEmail(email, pass));
});

window.addEventListener('hashchange', () => {
  const v = readView();
  if (v !== ui.view) go(v);
});

A.onChange(() => {
  if (account.user && !isPro() && !claimedOnce) {
    claimedOnce = true;
    claim();
  }
  if (isPro() && ui.verifying && !isDemo()) {
    ui.verifying = false;
    history.replaceState(null, '', location.pathname + location.hash);
  }
  render();
});

render();
A.init();
