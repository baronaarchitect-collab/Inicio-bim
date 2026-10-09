// Checklist BIM de despegue · Life City
// Cuenta gratis (Google o correo) sin acceso → suscripción con Wompi → checklist por proyectos.
// Dentro del checklist: oferta de consultoría 1:1.

import { CONFIG } from '../js/config.js';
import * as A from '../js/account.js';
import { GROUPS, itemKey, allItemKeys } from './data.js';
import { t } from './i18n.js';

const { account } = A;
const $app = document.getElementById('app');
const $modal = document.getElementById('modal');
const $toast = document.getElementById('toast');
const LOCAL_KEY = 'checklist-bim-projects';
const TOTAL = allItemKeys().length;
const COLLECTION = 'checklists';

const params = new URLSearchParams(location.search);
let lang = readLang();
let ui = { view: 'main', authMode: 'up', authError: null, busy: false, open: new Set(['arq']), verifying: params.has('id') || params.has('paid') };
let projects = null; // [{ id, name, checked: {key: true} }]
let currentId = null;
let loadedFor = null;
const saveTimers = {};

// ── Utilidades ────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const tr = (key, vars) => t(lang, key, vars);
const L = (obj) => obj?.[lang] ?? obj?.es ?? '';

function readLang() {
  try {
    const saved = localStorage.getItem('checklist-lang');
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* sin almacenamiento */
  }
  return (navigator.language || 'es').startsWith('en') ? 'en' : 'es';
}

function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  try {
    localStorage.setItem('checklist-lang', l);
  } catch {
    /* ignorar */
  }
  render();
}

function toast(msg, ms = 2400) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $toast.classList.remove('show'), ms);
}

const isDemo = () => !A.isConfigured();
const proUntil = () => A.accessUntil('checklistProUntil');
const hasAccess = () => isDemo() || proUntil() > Date.now();
const uid = () => Math.random().toString(36).slice(2, 10);

// ── Proyectos (Firestore para suscriptores, localStorage en demo) ──
async function loadProjects() {
  const owner = isDemo() ? 'demo' : account.user?.uid;
  if (!owner || loadedFor === owner) return;
  loadedFor = owner;
  try {
    if (isDemo()) projects = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    else projects = (await A.listUserDocs(COLLECTION)).map((p) => ({ id: p.id, name: p.name, checked: p.checked || {} }));
  } catch {
    projects = [];
  }
  if (!projects.length) {
    projects = [{ id: uid(), name: tr('defaultProject'), checked: {} }];
    persist(projects[0]);
  }
  currentId = projects[0].id;
  render();
}

function persist(project) {
  if (isDemo()) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(projects));
    } catch {
      /* ignorar */
    }
    return;
  }
  clearTimeout(saveTimers[project.id]);
  saveTimers[project.id] = setTimeout(() => {
    A.saveUserDoc(COLLECTION, project.id, { name: project.name, checked: project.checked }).catch(() => toast('⚠️ No se pudo guardar'));
  }, 600);
}

function current() {
  return projects?.find((p) => p.id === currentId) || projects?.[0];
}

function countDone(project, keys) {
  return keys.filter((k) => project.checked[k]).length;
}

// ── Render ────────────────────────────────────────────────────
function render() {
  document.title = tr('appName') + ' · Life City';
  let body;
  if (!account.ready && !isDemo()) body = `<p class="muted center pad">${tr('loading')}</p>`;
  else if (ui.view === 'auth') body = renderAuth();
  else if (!isDemo() && !account.user) body = renderLanding();
  else if (!hasAccess()) body = renderLocked();
  else body = renderChecklist();
  $app.innerHTML = header() + (isDemo() ? `<p class="demo-banner">${tr('demo')}</p>` : '') + body;
}

function header() {
  return `
    <header class="ck-top">
      <a class="brand" href="./"><span class="logo">✔</span><b>${tr('appName')}</b></a>
      <div class="lang" role="group" aria-label="Idioma / Language">
        <button class="${lang === 'es' ? 'on' : ''}" data-action="lang" data-lang="es">ES</button>
        <button class="${lang === 'en' ? 'on' : ''}" data-action="lang" data-lang="en">EN</button>
      </div>
      ${account.user ? `<button class="chip-btn" data-action="sign-out" title="${tr('signOut')}">${esc((account.user.name || account.user.email || '?').slice(0, 1).toUpperCase())}</button>` : ''}
    </header>`;
}

function previewCards(locked) {
  return `<div class="preview">${GROUPS.map((g) => {
    const n = g.sections.reduce((a, s) => a + s.items.length, 0);
    return `<div class="pcard ${locked ? 'locked' : ''}"><span class="pic">${g.icon}</span><b>${esc(L(g.title))}</b><small>${n} ${tr('items')}</small>${locked ? '<span class="lock">🔒</span>' : ''}</div>`;
  }).join('')}</div>`;
}

function renderLanding() {
  return `
    <main class="ck-page">
      <section class="ck-hero">
        <h1>${tr('appName')}</h1>
        <p>${tr('tagline')}</p>
        <p class="count"><b>${TOTAL}</b> ${tr('items')} · <b>${GROUPS.length}</b> ${tr('sections')}</p>
      </section>
      ${previewCards(true)}
      <button class="btn primary big" data-action="auth" data-mode="up">${tr('createAccount')}</button>
      <button class="btn ghost" data-action="auth" data-mode="in">${tr('haveAccount')}</button>
      <p class="muted small center"><a href="../">${tr('course')}</a></p>
    </main>`;
}

function renderAuth() {
  const up = ui.authMode === 'up';
  return `
    <main class="ck-page auth">
      <button class="back" data-action="auth-back">← ${tr('back')}</button>
      <h1 class="center">${up ? tr('signUp') : tr('signIn')}</h1>
      <button class="btn big google" data-action="google" ${ui.busy ? 'disabled' : ''}>
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        ${tr('google')}
      </button>
      <div class="divider"><span>${tr('orEmail')}</span></div>
      <form id="ck-auth" novalidate>
        ${up ? `<label>${tr('name')}<input id="a-name" class="input" autocomplete="name" /></label>` : ''}
        <label>${tr('email')}<input id="a-email" type="email" class="input" autocomplete="email" required /></label>
        <label>${tr('password')}<input id="a-pass" type="password" class="input" minlength="6" autocomplete="${up ? 'new-password' : 'current-password'}" required /></label>
        ${ui.authError ? `<p class="callout error">${esc(ui.authError)}</p>` : ''}
        <button class="btn primary big" type="submit" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '…' : up ? tr('signUp') : tr('signIn')}</button>
      </form>
      ${up ? '' : `<button class="btn ghost" data-action="reset-pass">${tr('forgot')}</button>`}
      <button class="btn ghost" data-action="auth-toggle">${up ? tr('toSignIn') : tr('toSignUp')}</button>
    </main>`;
}

function plansHtml() {
  const w = CONFIG.wompi;
  const email = account.user?.email || '';
  return `
    <section class="card plans">
      <h3>${tr('plansTitle')}</h3>
      <div class="plan best">
        <b>${tr('planName')}</b>
        <span class="price">${esc(L(w.priceLabel))}</span>
        <small class="muted">${tr('planDays', { d: w.accessDays })}</small>
        <button class="btn gold big" data-action="pay">${tr('payWompi')}</button>
      </div>
      ${email ? `<p class="callout">${tr('sameEmail', { email: esc(email) })}</p>` : ''}
      <p class="muted small">${tr('payNote')}</p>
      ${w.scriptUrl ? `<button class="btn ghost" data-action="claim">${tr('paidCheck')}</button>` : ''}
    </section>`;
}

function renderLocked() {
  return `
    <main class="ck-page">
      ${ui.verifying ? `<p class="callout">${tr('verifying')}</p>` : ''}
      <section class="ck-hero">
        <h1>${tr('lockedTitle')}</h1>
        <p>${tr('lockedBody', { n: TOTAL })}</p>
      </section>
      ${plansHtml()}
      ${previewCards(true)}
      ${consultCard()}
    </main>`;
}

function consultCard() {
  return `
    <section class="card consult-up">
      <span class="kicker">⭐ 1:1</span>
      <h3>${tr('consultTitle')}</h3>
      <p class="muted">${tr('consultBody')}</p>
      <a class="btn gold" href="../#consult">${tr('consultCta')}</a>
    </section>`;
}

function accessBar() {
  if (isDemo()) return '';
  const until = proUntil();
  const days = Math.ceil((until - Date.now()) / 86400000);
  const date = new Date(until).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<p class="access ${days <= 7 ? 'soon' : ''}">✅ ${tr('proUntil', { date })}${days <= 7 ? ` · ${tr('expiresSoon', { d: days })} <button class="link" data-action="show-plans">${tr('renew')}</button>` : ''}</p>`;
}

function renderChecklist() {
  if (!projects) {
    loadProjects();
    return `<p class="muted center pad">${tr('loading')}</p>`;
  }
  const p = current();
  const keys = allItemKeys();
  const done = countDone(p, keys);
  const pct = Math.round((done / keys.length) * 100);
  return `
    <main class="ck-page">
      ${accessBar()}
      <section class="card project-bar">
        <label>${tr('projects')}
          <select id="project-select" class="input">${projects.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        </label>
        <div class="row">
          <button class="btn small" data-action="new-project">＋ ${tr('newProject')}</button>
          <button class="btn small" data-action="rename-project">${tr('rename')}</button>
          ${projects.length > 1 ? `<button class="btn small" data-action="delete-project">${tr('delete')}</button>` : ''}
        </div>
      </section>
      <section class="card total">
        <div class="total-head"><b>${tr('progress')}: ${esc(p.name)}</b><span>${done}/${keys.length} · ${pct}% ${tr('done')}</span></div>
        <div class="bar big"><i style="width:${pct}%"></i></div>
      </section>
      ${GROUPS.map((g) => groupHtml(g, p)).join('')}
      ${consultCard()}
      <div class="row tools">
        <button class="btn small" data-action="print">🖨️ ${tr('print')}</button>
        <button class="btn small" data-action="reset">${tr('reset')}</button>
      </div>
    </main>`;
}

function groupHtml(g, p) {
  const keys = g.sections.flatMap((s) => s.items.map((_, i) => itemKey(s.id, i)));
  const done = countDone(p, keys);
  const full = done === keys.length;
  return `
    <details class="group ${full ? 'full' : ''}" data-group="${g.id}" ${ui.open.has(g.id) ? 'open' : ''}>
      <summary><span class="gic">${g.icon}</span><b>${esc(L(g.title))}</b><span class="gcount">${full ? '✔ ' : ''}${done}/${keys.length}</span></summary>
      ${g.sections
        .map(
          (s) => `
        <div class="section">
          <h4>${esc(L(s.title))}</h4>
          <ul>${s.items
            .map((it, i) => {
              const k = itemKey(s.id, i);
              return `<li><label class="check ${p.checked[k] ? 'on' : ''}"><input type="checkbox" data-key="${k}" ${p.checked[k] ? 'checked' : ''} /><span class="box"></span><span>${esc(L(it))}</span></label></li>`;
            })
            .join('')}</ul>
        </div>`
        )
        .join('')}
    </details>`;
}

// ── Pagos con Wompi ───────────────────────────────────────────
// El link de pago abre Wompi; el webhook (Apps Script) activa el acceso por correo.
function pay() {
  const link = CONFIG.wompi.paymentLink;
  if (!link) return toast(tr('payNotConfigured'), 3500);
  ui.verifying = true;
  render();
  window.open(link, '_blank', 'noopener');
}

// "Reclamar" un pago hecho antes de crear la cuenta (o si el webhook llegó antes).
// El Apps Script verifica el ID token de Firebase y que el correo esté verificado.
let claimedOnce = false;
async function claim(manual = false) {
  const url = CONFIG.wompi.scriptUrl;
  if (!url || !account.user) return;
  try {
    const idToken = await A.getIdToken();
    const res = await fetch(`${url}?${new URLSearchParams({ action: 'claim', idToken })}`);
    const data = await res.json();
    if (!manual || data.granted) return;
    toast(data.error === 'email_not_verified' ? tr('claimUnverified') : tr('claimNone', { email: account.user.email }), 4500);
  } catch {
    if (manual) toast(tr('payError'), 3500);
  }
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

function showComplete() {
  openModal(`
    <div class="mascot big">🏆</div>
    <h2>${tr('complete')}</h2>
    <p class="muted">${tr('completeBody')}</p>
    <a class="btn gold big" href="../#consult">${tr('consultCta')}</a>
    <button class="btn ghost" data-action="close">${tr('close')}</button>`);
}

// ── Eventos ───────────────────────────────────────────────────
async function runAuth(fn) {
  ui.busy = true;
  ui.authError = null;
  render();
  try {
    await fn();
    ui.view = 'main';
  } catch (e) {
    ui.authError = A.errorMessage(e);
  }
  ui.busy = false;
  render();
}

const actions = {
  lang: (el) => setLang(el.dataset.lang),
  auth: (el) => {
    ui.view = 'auth';
    ui.authMode = el.dataset.mode;
    ui.authError = null;
    render();
  },
  'auth-back': () => {
    ui.view = 'main';
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
    if (!email) {
      ui.authError = tr('email') + '?';
      return render();
    }
    try {
      await A.resetPassword(email);
      toast(tr('resetSent'), 3500);
    } catch (e) {
      ui.authError = A.errorMessage(e);
      render();
    }
  },
  'sign-out': async () => {
    if (!confirm(tr('signOut') + '?')) return;
    await A.signOut();
    projects = null;
    loadedFor = null;
  },
  pay: () => pay(),
  claim: () => claim(true),
  'show-plans': () => openModal(plansHtml() + `<button class="btn ghost" data-action="close">${tr('close')}</button>`),
  close: () => closeModal(),
  'new-project': () => {
    const name = prompt(tr('projectName'), '');
    if (!name) return;
    const p = { id: uid(), name: name.trim().slice(0, 60), checked: {} };
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
    p.checked = {};
    persist(p);
    render();
  },
  print: () => {
    document.querySelectorAll('details.group').forEach((d) => (d.open = true));
    window.print();
  }
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
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
  } else if (el.dataset.key) {
    const p = current();
    const before = countDone(p, allItemKeys());
    if (el.checked) p.checked[el.dataset.key] = true;
    else delete p.checked[el.dataset.key];
    persist(p);
    render();
    if (before < TOTAL && countDone(p, allItemKeys()) === TOTAL) showComplete();
  }
});

// Recordar qué grupos están abiertos entre renders.
document.addEventListener(
  'toggle',
  (e) => {
    const g = e.target?.dataset?.group;
    if (!g) return;
    if (e.target.open) ui.open.add(g);
    else ui.open.delete(g);
  },
  true
);

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'ck-auth') return;
  e.preventDefault();
  const email = document.getElementById('a-email').value.trim();
  const pass = document.getElementById('a-pass').value;
  if (ui.authMode === 'up') runAuth(() => A.signUpEmail(document.getElementById('a-name').value.trim(), email, pass));
  else runAuth(() => A.signInEmail(email, pass));
});

A.onChange(() => {
  if (account.user && !hasAccess() && !claimedOnce) {
    claimedOnce = true;
    claim();
  }
  if (hasAccess()) {
    if (ui.verifying && !isDemo()) {
      ui.verifying = false;
      history.replaceState(null, '', location.pathname);
      toast('✅ ' + tr('saved'));
    }
    loadProjects();
  }
  render();
});

document.documentElement.lang = lang;
render();
A.init();
