/*!
 * Life City · Oferta de coordinación para el Visor BIM
 * ----------------------------------------------------
 * Módulo independiente (sin dependencias) que el visor carga con:
 *
 *   <script src="https://baronaarchitect-collab.github.io/Inicio-bim/visor/coordinacion.js"
 *           data-webhook="https://TU-N8N/webhook/lead-coordinacion"
 *           data-whatsapp="573173371577" defer></script>
 *
 * y avisa de eventos para mostrar la oferta en el momento oportuno:
 *
 *   LifeCityCoord.modelLoaded({ project: 'Torre D', disciplines: ['ARQ', 'EST', 'HID'], elements: 18450 });
 *   LifeCityCoord.clashesFound(37);      // si el visor detecta cruces
 *   LifeCityCoord.show('manual');        // abrir la oferta desde un botón propio
 *
 * Reglas: aparece tras cargar un modelo con 2+ disciplinas, al detectar interferencias o
 * después de N minutos de uso; máximo una vez cada `data-cooldown-days` días por proyecto.
 * Si la pestaña está en segundo plano y el usuario lo permitió, usa una notificación del navegador.
 */
(function () {
  'use strict';
  if (window.LifeCityCoord) return;

  var script = document.currentScript || {};
  var ds = script.dataset || {};
  var cfg = Object.assign(
    {
      webhook: ds.webhook || '', // n8n u otro endpoint que reciba el lead (POST JSON)
      whatsapp: ds.whatsapp || '573173371577',
      booking: ds.booking || '', // link de agenda opcional
      lang: ds.lang || ((navigator.language || 'es').indexOf('en') === 0 ? 'en' : 'es'),
      delayMinutes: Number(ds.delayMinutes || 4),
      cooldownDays: Number(ds.cooldownDays || 3),
      autoTimer: ds.autoTimer !== 'false'
    },
    window.LifeCityCoordConfig || {}
  );

  var T = {
    es: {
      kicker: 'Life City · Coordinación BIM',
      title: '¿Coordinamos tu proyecto?',
      bodyModel: 'Cargaste {d} disciplinas de "{p}". Detectamos y resolvemos sus interferencias antes de obra.',
      bodyClash: 'El modelo de "{p}" tiene {n} posibles interferencias. Te ayudamos a resolverlas por disciplina.',
      bodyTime: 'Detección + resolución de interferencias para "{p}", con tolerancia de 5 mm y entrega de modelo coordinado.',
      bullets: ['Detección de interferencias en Navisworks/Revizto', 'Resolución por disciplina: eléctrica, hidrosanitaria, HVAC', 'Informe con responsables y modelo liberado'],
      yes: 'Quiero que lo coordinen',
      no: 'Ahora no',
      notify: 'Avísame en el navegador',
      formTitle: 'Te contactamos hoy',
      name: 'Nombre',
      email: 'Correo',
      phone: 'WhatsApp',
      area: 'Área aprox. (m²)',
      send: 'Enviar solicitud',
      wa: 'Prefiero WhatsApp',
      thanks: '¡Listo! Te escribimos en minutos para coordinar tu proyecto.',
      close: 'Cerrar',
      waText: 'Hola Juan David, quiero coordinar el proyecto "{p}" (detección + resolución de interferencias).',
      push: 'Tu modelo de "{p}" está listo para coordinar. ¿Detectamos las interferencias?'
    },
    en: {
      kicker: 'Life City · BIM Coordination',
      title: 'Shall we coordinate your project?',
      bodyModel: 'You loaded {d} disciplines of "{p}". We detect and resolve their clashes before construction.',
      bodyClash: 'The "{p}" model has {n} potential clashes. We help you resolve them by discipline.',
      bodyTime: 'Clash detection + resolution for "{p}", with 5 mm tolerance and a coordinated model delivered.',
      bullets: ['Clash detection in Navisworks/Revizto', 'Resolution by discipline: electrical, plumbing, HVAC', 'Report with owners and released model'],
      yes: 'Coordinate it for me',
      no: 'Not now',
      notify: 'Notify me in the browser',
      formTitle: "We'll contact you today",
      name: 'Name',
      email: 'Email',
      phone: 'WhatsApp',
      area: 'Approx. area (m²)',
      send: 'Send request',
      wa: 'I prefer WhatsApp',
      thanks: "Done! We'll reach out within minutes to coordinate your project.",
      close: 'Close',
      waText: 'Hi Juan David, I want to coordinate the project "{p}" (clash detection + resolution).',
      push: 'Your "{p}" model is ready for coordination. Shall we detect the clashes?'
    }
  };
  var tx = function (k, v) {
    var s = (T[cfg.lang] || T.es)[k];
    return typeof s === 'string'
      ? s.replace(/\{(\w)\}/g, function (_, x) {
          return v && v[x] != null ? v[x] : '';
        })
      : s;
  };

  var ctx = { project: document.title || 'mi proyecto', disciplines: [], elements: 0, clashes: 0 };
  var host, root, timer;

  // ── Frecuencia ────────────────────────────────────────────
  function key() {
    return 'lc-coord:' + ctx.project;
  }
  function recentlyShown() {
    try {
      var last = Number(localStorage.getItem(key()) || 0);
      return Date.now() - last < cfg.cooldownDays * 86400000;
    } catch (e) {
      return false;
    }
  }
  function markShown() {
    try {
      localStorage.setItem(key(), String(Date.now()));
    } catch (e) {
      /* sin almacenamiento */
    }
  }

  // ── UI (Shadow DOM para no chocar con los estilos del visor) ──
  var CSS =
    ':host{all:initial}' +
    '.card{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(360px,calc(100vw - 32px));background:#fff;color:#1f2428;border:1px solid #dcdcd8;border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.22);font:15px/1.45 "Source Sans 3",system-ui,sans-serif;overflow:hidden;animation:in .25s ease}' +
    '@keyframes in{from{transform:translateY(16px);opacity:0}}' +
    '.top{background:#22272b;color:#fff;padding:14px 16px}.k{font:700 11px/1 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#f5b301;margin:0 0 6px}' +
    'h3{margin:0;font:800 22px/1.05 "Barlow Condensed","Arial Narrow",sans-serif}.x{position:absolute;top:10px;right:12px;background:none;border:0;color:#fff;font-size:20px;cursor:pointer}' +
    '.b{padding:14px 16px}p{margin:0 0 10px}ul{margin:0 0 12px;padding-left:18px}li{margin:3px 0}' +
    '.btn{display:block;width:100%;box-sizing:border-box;border-radius:6px;border:1px solid #dcdcd8;background:#fff;font:700 14px system-ui;padding:11px;margin-top:8px;cursor:pointer;text-align:center;text-decoration:none;color:#1f2428}' +
    '.gold{background:#f5b301;border-color:#f5b301;color:#241a00}.dark{background:#22272b;border-color:#22272b;color:#fff}.ghost{border:0;background:none;color:#747b80;font-weight:600}' +
    'label{display:block;font:600 12px system-ui;margin-top:8px}input{width:100%;box-sizing:border-box;margin-top:4px;padding:9px 10px;border:1px solid #dcdcd8;border-radius:6px;font:14px system-ui}' +
    '@media (prefers-color-scheme:dark){.card{background:#1d2124;color:#eceeef;border-color:#33393d}.btn{background:#23282b;color:#eceeef;border-color:#33393d}input{background:#23282b;color:#eceeef;border-color:#33393d}.gold{background:#f5b301;color:#241a00}}';

  function mount() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'lifecity-coord';
    document.body.appendChild(host);
    root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function waLink() {
    return 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(tx('waText', { p: ctx.project }));
  }

  function render(html) {
    mount();
    root.innerHTML = '<style>' + CSS + '</style><div class="card" role="dialog" aria-live="polite">' + html + '</div>';
    root.querySelectorAll('[data-a]').forEach(function (el) {
      el.addEventListener('click', actions[el.getAttribute('data-a')]);
    });
  }

  function offerHtml(reason) {
    var v = { p: esc(ctx.project), d: ctx.disciplines.length, n: ctx.clashes };
    var body = reason === 'clash' ? tx('bodyClash', v) : reason === 'model' ? tx('bodyModel', v) : tx('bodyTime', v);
    var canNotify = 'Notification' in window && Notification.permission === 'default';
    return (
      '<div class="top"><p class="k">' + tx('kicker') + '</p><h3>' + tx('title') + '</h3><button class="x" data-a="close" aria-label="' + tx('close') + '">×</button></div>' +
      '<div class="b"><p>' + body + '</p><ul>' + tx('bullets').map(function (b) {
        return '<li>' + b + '</li>';
      }).join('') + '</ul>' +
      '<button class="btn gold" data-a="yes">' + tx('yes') + '</button>' +
      (canNotify ? '<button class="btn" data-a="notify">🔔 ' + tx('notify') + '</button>' : '') +
      '<button class="btn ghost" data-a="close">' + tx('no') + '</button></div>'
    );
  }

  function formHtml() {
    return (
      '<div class="top"><p class="k">' + tx('kicker') + '</p><h3>' + tx('formTitle') + '</h3><button class="x" data-a="close" aria-label="' + tx('close') + '">×</button></div>' +
      '<div class="b"><label>' + tx('name') + '<input id="n" autocomplete="name"></label>' +
      '<label>' + tx('email') + '<input id="e" type="email" autocomplete="email"></label>' +
      '<label>' + tx('phone') + '<input id="w" type="tel" autocomplete="tel"></label>' +
      '<label>' + tx('area') + '<input id="m" type="number" min="0"></label>' +
      '<button class="btn dark" data-a="send">' + tx('send') + '</button>' +
      '<a class="btn" href="' + waLink() + '" target="_blank" rel="noopener" data-a="wa">' + tx('wa') + '</a></div>'
    );
  }

  function emit(event, extra) {
    var detail = Object.assign({ event: event, source: 'visor-bim', project: ctx.project, disciplines: ctx.disciplines, elements: ctx.elements, clashes: ctx.clashes, url: location.href, at: new Date().toISOString() }, extra || {});
    try {
      window.dispatchEvent(new CustomEvent('lifecity:coordination', { detail: detail }));
    } catch (e) {
      /* navegadores antiguos */
    }
    if (!cfg.webhook) return Promise.resolve();
    return fetch(cfg.webhook, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(detail) }).catch(function () {});
  }

  var actions = {
    close: function () {
      emit('dismissed');
      if (host) root.innerHTML = '';
    },
    yes: function () {
      emit('interested');
      render(formHtml());
    },
    notify: function () {
      Notification.requestPermission().then(function () {
        if (host) root.innerHTML = '';
      });
    },
    wa: function () {
      emit('whatsapp');
    },
    send: function () {
      var g = function (id) {
        return (root.getElementById ? root.getElementById(id) : root.querySelector('#' + id)).value.trim();
      };
      var lead = { name: g('n'), email: g('e'), phone: g('w'), area_m2: g('m') };
      if (!lead.email && !lead.phone) return;
      emit('lead', { lead: lead }).then(function () {
        render('<div class="b"><p><b>' + tx('thanks') + '</b></p><button class="btn" data-a="close">' + tx('close') + '</button></div>');
      });
    }
  };

  // ── API pública ───────────────────────────────────────────
  function show(reason) {
    if (reason !== 'manual' && recentlyShown()) return false;
    markShown();
    clearTimeout(timer);
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      var n = new Notification(tx('title'), { body: tx('push', { p: ctx.project }), tag: 'lc-coord' });
      n.onclick = function () {
        window.focus();
        render(offerHtml(reason));
        n.close();
      };
    } else render(offerHtml(reason));
    emit('offer_shown', { reason: reason });
    return true;
  }

  function armTimer() {
    clearTimeout(timer);
    if (cfg.autoTimer && cfg.delayMinutes > 0) timer = setTimeout(function () {
      show('time');
    }, cfg.delayMinutes * 60000);
  }

  window.LifeCityCoord = {
    config: cfg,
    modelLoaded: function (info) {
      info = info || {};
      if (info.project) ctx.project = String(info.project);
      if (info.disciplines) ctx.disciplines = [].concat(info.disciplines);
      if (info.elements) ctx.elements = Number(info.elements) || 0;
      if (ctx.disciplines.length >= 2) return show('model');
      armTimer();
      return false;
    },
    clashesFound: function (n) {
      ctx.clashes = Number(n) || 0;
      return ctx.clashes > 0 ? show('clash') : false;
    },
    show: function (reason) {
      return show(reason || 'manual');
    },
    setLang: function (l) {
      cfg.lang = l === 'en' ? 'en' : 'es';
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armTimer);
  else armTimer();
})();
