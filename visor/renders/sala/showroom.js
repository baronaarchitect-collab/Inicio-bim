/*!
 * Life City · Sala de ventas con renders — motor del showroom
 * ------------------------------------------------------------
 * Flujo del comprador: render frontal (cada piso es un botón) → planta del piso
 * (cada apartamento es un botón) → ficha con valor → reserva con el % de separación vía Wompi.
 *
 *   SR.mount(el, S, opts)        → monta el showroom. opts: {img(path)→url, graciasUrl, recorridoUrl, onReserve}
 *   SR.syncUnits(S)              → crea/actualiza S.unidades a partir de pisos × plantas
 *   SR.overlay.get/set(S)        → cambios locales (dashboard, reservas) encima de datos.js
 *   SR.wompi.*                   → firma de integridad, URL del Web Checkout y consulta de transacciones
 *   SR.db.*                      → IndexedDB para archivos (renders, plantas, modelo 3D)
 *
 * Datos (window.SALA): {proyecto, empresa, ciudad, whatsapp, moneda, separacion,
 *   wompi:{publicKey, integrity, firmaUrl}, fachada:{img},
 *   pisos:[{id, nivel, nombre, poly:[[x,y]…], planta}],      // poly normalizado 0..1 sobre la fachada
 *   plantas:[{id, nombre, img, aptos:[{n, poly, area, alcobas, banos, precio, render}]}],
 *   incremento, unidades:[{id, piso, apto, area, alcobas, banos, precio, estado}],
 *   recorrido:{url, paleta:[{nombre,hex}], decisiones:[{cat,titulo,texto}]}}
 */
(function () {
  'use strict';

  var ESTADOS = { disponible: 'Disponible', reservado: 'Reservado', vendido: 'Vendido' };

  /* ---------- utilidades ---------- */
  function h(tag, attrs, kids) {
    var svg = /^(svg|polygon|text|g)$/.test(tag);
    var el = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'on') for (var ev in attrs.on) el.addEventListener(ev, attrs.on[ev]);
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(v, cur) {
    try { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: cur || 'COP', maximumFractionDigits: 0 }).format(v || 0); }
    catch (e) { return '$' + Math.round(v || 0).toLocaleString('es-CO'); }
  }
  function slug(s) { return String(s || 'proyecto').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto'; }
  function pts(poly) { return (poly || []).map(function (p) { return p[0] + ',' + p[1]; }).join(' '); }
  function center(poly) {
    var x = 0, y = 0; (poly || []).forEach(function (p) { x += p[0]; y += p[1]; });
    var n = (poly || []).length || 1; return [x / n, y / n];
  }
  function sepValue(S, u) { return Math.round((u.precio || 0) * (S.separacion || 10) / 100); }

  /* ---------- unidades ---------- */
  function syncUnits(S) {
    var old = {}, out = [];
    (S.unidades || []).forEach(function (u) { old[u.id] = u; });
    var niveles = (S.pisos || []).map(function (p) { return +p.nivel || 0; });
    var base = niveles.length ? Math.min.apply(null, niveles) : 0;
    (S.pisos || []).forEach(function (p) {
      var pl = planta(S, p.planta); if (!pl) return;
      (pl.aptos || []).forEach(function (a) {
        var id = (p.nivel != null ? p.nivel : p.id) + String(a.n).padStart(2, '0');
        var k = 1 + ((+p.nivel || 0) - base) * (+S.incremento || 0) / 100;
        var prev = old[id];
        out.push({
          id: String(id), piso: p.id, apto: a.n,
          area: a.area, alcobas: a.alcobas, banos: a.banos,
          precio: prev && prev.manual ? prev.precio : Math.round((+a.precio || 0) * k),
          manual: prev && prev.manual || undefined,
          estado: prev ? prev.estado : 'disponible'
        });
      });
    });
    S.unidades = out;
    return S;
  }
  function planta(S, id) { return (S.plantas || []).filter(function (p) { return p.id === id; })[0]; }
  function unitsOf(S, pisoId) { return (S.unidades || []).filter(function (u) { return u.piso === pisoId; }); }
  function unit(S, pisoId, n) { return (S.unidades || []).filter(function (u) { return u.piso === pisoId && String(u.apto) === String(n); })[0]; }

  /* ---------- overlay local (dashboard / reservas en este navegador) ---------- */
  var overlay = {
    // la clave sale del id (o del nombre original en datos.js) para que renombrar el proyecto no pierda los cambios
    key: function (S) { return 'sr:overlay:' + (S.id || slug((window.SALA || S).proyecto)); },
    get: function (S) { try { return JSON.parse(localStorage.getItem(overlay.key(S)) || 'null'); } catch (e) { return null; } },
    set: function (S, data) { try { localStorage.setItem(overlay.key(S), JSON.stringify(data)); return true; } catch (e) { return false; } },
    clear: function (S) { try { localStorage.removeItem(overlay.key(S)); } catch (e) {} },
    apply: function (S) {
      var o = overlay.get(S); if (!o) return S;
      ['proyecto', 'empresa', 'ciudad', 'whatsapp', 'moneda', 'separacion', 'incremento', 'wompi', 'pisos', 'plantas', 'unidades', 'crm']
        .forEach(function (k) { if (o[k] != null) S[k] = o[k]; });
      return S;
    },
    /* solo el estado de una unidad: lo usa la página de gracias tras un pago aprobado */
    mark: function (S, id, estado) {
      var o = overlay.get(S) || {};
      o.unidades = (o.unidades || S.unidades || []).map(function (u) { return u.id === id ? Object.assign({}, u, { estado: estado }) : u; });
      overlay.set(S, o);
    }
  };

  /* ---------- Wompi ---------- */
  var wompi = {
    env: function (pk) { return /^pub_test_/.test(pk || '') ? 'test' : 'prod'; },
    api: function (env) { return env === 'test' ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1'; },
    sha256: function (txt) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      });
    },
    /* Firma de integridad = SHA256(referencia + montoEnCentavos + moneda + secreto).
       Lo ideal es firmar en un servidor (cfg.firmaUrl); si no hay, se firma aquí con cfg.integrity. */
    sign: function (cfg, reference, cents, currency) {
      if (cfg.firmaUrl) {
        return fetch(cfg.firmaUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: reference, amountInCents: cents, currency: currency }) })
          .then(function (r) { if (!r.ok) throw new Error('La firma no respondió (' + r.status + ')'); return r.json(); })
          .then(function (j) { return j.signature; });
      }
      if (cfg.integrity) return wompi.sha256(reference + cents + currency + cfg.integrity);
      return Promise.resolve(null);
    },
    checkoutUrl: function (cfg, o) {
      return wompi.sign(cfg, o.reference, o.amountInCents, o.currency).then(function (sig) {
        var q = new URLSearchParams();
        q.set('public-key', cfg.publicKey);
        q.set('currency', o.currency);
        q.set('amount-in-cents', String(o.amountInCents));
        q.set('reference', o.reference);
        if (sig) q.set('signature:integrity', sig);
        if (o.redirectUrl) q.set('redirect-url', o.redirectUrl);
        return 'https://checkout.wompi.co/p/?' + q.toString();
      });
    },
    tx: function (id, env) {
      return fetch(wompi.api(env) + '/transactions/' + encodeURIComponent(id)).then(function (r) {
        if (!r.ok) throw new Error('Wompi respondió ' + r.status);
        return r.json();
      }).then(function (j) { return j.data; });
    },
    /* consulta hasta que la transacción deje de estar PENDING (máx ~2 min) */
    poll: function (id, env, onTick) {
      var n = 0;
      return new Promise(function (res, rej) {
        (function go() {
          wompi.tx(id, env).then(function (t) {
            onTick && onTick(t);
            if (t.status !== 'PENDING' || ++n > 40) res(t); else setTimeout(go, 3000);
          }).catch(function (e) { if (++n > 5) rej(e); else setTimeout(go, 3000); });
        })();
      });
    },
    configured: function (cfg) { return !!(cfg && cfg.publicKey && /^pub_(test|prod)_/.test(cfg.publicKey)); }
  };

  /* ---------- IndexedDB para archivos ---------- */
  var db = (function () {
    var p;
    function open() {
      if (!p) p = new Promise(function (res, rej) {
        var rq = indexedDB.open('sr-sala-renders', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('files'); };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { rej(rq.error); };
      });
      return p;
    }
    function run(mode, fn) {
      return open().then(function (d) {
        return new Promise(function (res, rej) {
          var tx = d.transaction('files', mode), st = tx.objectStore('files'), out = fn(st);
          tx.oncomplete = function () { res(out && 'result' in out ? out.result : undefined); };
          tx.onerror = function () { rej(tx.error); };
        });
      });
    }
    return {
      put: function (k, blob) { return run('readwrite', function (s) { s.put(blob, k); }); },
      get: function (k) { return run('readonly', function (s) { return s.get(k); }); },
      del: function (k) { return run('readwrite', function (s) { s.delete(k); }); },
      keys: function () { return run('readonly', function (s) { return s.getAllKeys(); }); }
    };
  })();

  /* ---------- escenario con imagen + polígonos ---------- */
  function stage(parent, src, cls) {
    var wrap = h('div', { class: 'sr-stage ' + (cls || '') });
    var blur = h('div', { class: 'sr-blur' });
    var frame = h('div', { class: 'sr-frame' });
    var img = h('img', { alt: '', draggable: 'false' });
    var svg = h('svg', { viewBox: '0 0 1 1', preserveAspectRatio: 'none' });
    frame.appendChild(img); frame.appendChild(svg);
    wrap.appendChild(blur); wrap.appendChild(frame);
    parent.appendChild(wrap);
    var ratio = 1.5, pad = cls === 'sr-plan' ? 80 : 0;
    function fit() {
      var W = wrap.clientWidth - pad * 2, H = wrap.clientHeight - pad * 2 - (pad ? 20 : 0);
      if (W <= 0 || H <= 0) return;
      var w = W, hh = W / ratio;
      if (hh > H) { hh = H; w = H * ratio; }
      frame.style.width = w + 'px'; frame.style.height = hh + 'px';
    }
    function set(s) {
      img.onload = function () { ratio = (img.naturalWidth / img.naturalHeight) || 1.5; fit(); };
      img.src = s || '';
      blur.style.backgroundImage = s ? 'url("' + s + '")' : 'none';
    }
    set(src);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap); else window.addEventListener('resize', fit);
    return { wrap: wrap, svg: svg, frame: frame, set: set, fit: fit };
  }

  /* ---------- montaje ---------- */
  function mount(root, S, opts) {
    opts = opts || {};
    var img = opts.img || function (p) { return p; };
    var cur = S.moneda || 'COP';
    root.innerHTML = '';
    root.classList.add('sr');

    if (!S.fachada || !S.fachada.img || !(S.pisos || []).length) {
      root.appendChild(h('div', { class: 'sr-empty', html: '<div><p class="sr-k">Sala de ventas</p><h3 style="font:500 30px var(--serif)">Aún no hay render frontal ni pisos marcados</h3><p>Súbelos desde el asistente o el dashboard.</p></div>' }));
      return { refresh: function () {} };
    }

    var tip = h('div', { class: 'sr-tip' });
    var vF = h('div', { class: 'sr-view' }), vP = h('div', { class: 'sr-view sr-plan off' });
    root.appendChild(vF); root.appendChild(vP); root.appendChild(tip);

    /* vista fachada */
    var sF = stage(vF, img(S.fachada.img));
    var topF = h('div', { class: 'sr-top' }, [h('div', { class: 'sr-brand', html: esc(S.proyecto) + '<small>' + esc(S.ciudad || 'Sala de ventas') + '</small>' }), h('div', { class: 'sr-sp' })]);
    if (S.recorrido && (S.recorrido.url || opts.recorridoUrl)) topF.appendChild(h('button', { class: 'sr-btn', on: { click: function () { window.open(opts.recorridoUrl || S.recorrido.url, '_blank'); } } }, ['Recorrido 3D ↗']));
    vF.appendChild(topF);
    var floorList = h('div', { class: 'sr-floors' });
    vF.appendChild(floorList);
    vF.appendChild(h('div', { class: 'sr-hint' }, ['Elige un piso']));

    /* vista planta */
    var sP = stage(vP, '', 'sr-plan');
    var title = h('div', { class: 'sr-brand' });
    var up = h('button', { class: 'sr-btn', title: 'Piso de arriba' }, ['▲']);
    var dn = h('button', { class: 'sr-btn', title: 'Piso de abajo' }, ['▼']);
    vP.appendChild(h('div', { class: 'sr-top' }, [
      h('button', { class: 'sr-btn', on: { click: showFacade } }, ['← Fachada']), title, h('div', { class: 'sr-sp' }), up, dn
    ]));
    vP.appendChild(h('div', { class: 'sr-legend', html: Object.keys(ESTADOS).map(function (k) { return '<span><i style="background:var(--' + (k === 'disponible' ? 'ok' : k === 'reservado' ? 'res' : 'sold') + ')"></i>' + ESTADOS[k] + '</span>'; }).join('') }));

    /* ficha */
    var sheet = h('aside', { class: 'sr-sheet' });
    root.appendChild(sheet);

    var pisosOrden = (S.pisos || []).slice().sort(function (a, b) { return (+b.nivel || 0) - (+a.nivel || 0); });
    var piso = null;

    function libres(p) { return unitsOf(S, p.id).filter(function (u) { return u.estado === 'disponible'; }).length; }
    function showTip(e, html) {
      var r = root.getBoundingClientRect();
      tip.innerHTML = html; tip.classList.add('on');
      tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px';
    }
    function hideTip() { tip.classList.remove('on'); }

    function drawFacade() {
      sF.svg.innerHTML = ''; floorList.innerHTML = '';
      pisosOrden.forEach(function (p) {
        var n = libres(p), tot = unitsOf(S, p.id).length;
        var label = p.nombre || ('Piso ' + p.nivel);
        var info = '<b>' + esc(label) + '</b><span>' + (tot ? n + ' de ' + tot + ' disponibles' : 'Sin unidades') + '</span>';
        var poly = h('polygon', { class: 'sr-zone' + (n ? '' : ' none'), points: pts(p.poly), 'data-id': p.id });
        var btn = h('button', { 'data-id': p.id, html: '<span>' + esc(label) + '</span><em class="' + (n ? '' : 'z') + '">' + n + ' disp.</em>' });
        function on(e) { poly.classList.add('hl'); btn.classList.add('hl'); if (e && e.clientX) showTip(e, info); }
        function off() { poly.classList.remove('hl'); btn.classList.remove('hl'); hideTip(); }
        poly.addEventListener('mousemove', on); poly.addEventListener('mouseleave', off);
        btn.addEventListener('mouseenter', function () { poly.classList.add('hl'); btn.classList.add('hl'); });
        btn.addEventListener('mouseleave', off);
        poly.addEventListener('click', function () { hideTip(); showFloor(p); });
        btn.addEventListener('click', function () { showFloor(p); });
        sF.svg.appendChild(poly); floorList.appendChild(btn);
      });
    }

    function showFloor(p) {
      piso = p; closeSheet();
      var pl = planta(S, p.planta);
      title.innerHTML = esc(p.nombre || ('Piso ' + p.nivel)) + '<small>' + esc(pl ? pl.nombre : '') + ' · ' + libres(p) + ' disponibles</small>';
      sP.set(pl ? img(pl.img) : '');
      sP.svg.innerHTML = '';
      (pl ? pl.aptos : []).forEach(function (a) {
        var u = unit(S, p.id, a.n) || { estado: 'disponible', precio: a.precio, area: a.area, id: a.n };
        var g = h('g');
        var poly = h('polygon', { class: 'sr-apt ' + u.estado, points: pts(a.poly), 'data-n': a.n });
        var c = center(a.poly);
        var tag = h('text', { class: 'sr-tag', x: c[0], y: c[1], 'text-anchor': 'middle', 'dominant-baseline': 'middle', transform: 'translate(' + c[0] + ',' + c[1] + ') scale(0.0016) translate(' + (-c[0]) + ',' + (-c[1]) + ')' });
        tag.textContent = u.id;
        // el texto vive en un viewBox 0..1: se escala alrededor de su centro para que mida ~13px
        g.appendChild(poly); g.appendChild(tag);
        var info = '<b>Apto ' + esc(u.id) + '</b><span>' + (u.area || '–') + ' m² · ' + ESTADOS[u.estado] + (u.estado === 'disponible' ? ' · ' + money(u.precio, cur) : '') + '</span>';
        poly.addEventListener('mousemove', function (e) { showTip(e, info); });
        poly.addEventListener('mouseleave', hideTip);
        poly.addEventListener('click', function () { hideTip(); openSheet(u, a, p, poly); });
        sP.svg.appendChild(g);
      });
      fixTags();
      var i = pisosOrden.indexOf(p);
      up.disabled = i <= 0; dn.disabled = i >= pisosOrden.length - 1;
      up.onclick = function () { if (i > 0) showFloor(pisosOrden[i - 1]); };
      dn.onclick = function () { if (i < pisosOrden.length - 1) showFloor(pisosOrden[i + 1]); };
      vF.classList.add('off'); vP.classList.remove('off');
    }
    /* el viewBox está estirado (preserveAspectRatio none): se compensa la escala del texto según el tamaño real */
    function fixTags() {
      requestAnimationFrame(function () {
        var w = sP.frame.clientWidth || 1, hh = sP.frame.clientHeight || 1;
        sP.svg.querySelectorAll('text').forEach(function (t) {
          var x = +t.getAttribute('x'), y = +t.getAttribute('y');
          t.setAttribute('transform', 'translate(' + x + ',' + y + ') scale(' + (1 / w) + ',' + (1 / hh) + ') translate(' + (-x) + ',' + (-y) + ')');
        });
      });
    }
    if (window.ResizeObserver) new ResizeObserver(fixTags).observe(sP.frame);

    function showFacade() { closeSheet(); vP.classList.add('off'); vF.classList.remove('off'); drawFacade(); }

    function openSheet(u, a, p, poly) {
      sP.svg.querySelectorAll('.sel').forEach(function (x) { x.classList.remove('sel'); });
      poly && poly.classList.add('sel');
      var sep = sepValue(S, u), rec = S.recorrido || {};
      var html = '<button class="x" aria-label="Cerrar">✕</button>' +
        (a.render ? '<img class="hero" src="' + esc(img(a.render)) + '" alt="">' : '') +
        '<div class="in"><span class="sr-state ' + u.estado + '">' + ESTADOS[u.estado] + '</span>' +
        '<div class="sr-k" style="margin-top:14px">' + esc(p.nombre || ('Piso ' + p.nivel)) + '</div>' +
        '<h3>Apartamento ' + esc(u.id) + '</h3>' +
        '<div class="sr-facts"><div><b>' + (u.area || '–') + '</b><span>m² construidos</span></div><div><b>' + (u.alcobas || '–') + '</b><span>alcobas</span></div><div><b>' + (u.banos || '–') + '</b><span>baños</span></div></div>' +
        '<div class="sr-price"><span>Valor</span><b>' + money(u.precio, cur) + '</b></div>' +
        '<div class="sr-price sep"><span>Separación (' + (S.separacion || 10) + ' %)</span><b>' + money(sep, cur) + '</b></div>';
      if ((rec.paleta || []).length) html += '<div class="sr-sec"><div class="sr-k">Paleta de acabados</div><div class="sr-pal">' + rec.paleta.map(function (c) { return '<i title="' + esc(c.nombre) + '" style="background:' + esc(c.hex) + '"></i>'; }).join('') + '</div></div>';
      if ((rec.decisiones || []).length) html += '<div class="sr-sec"><div class="sr-k">Decisiones arquitectónicas</div><ul class="sr-dec">' + rec.decisiones.slice(0, 4).map(function (d) { return '<li><b>' + esc(d.titulo) + '</b>' + esc(d.texto) + '</li>'; }).join('') + '</ul></div>';
      if (rec.url || opts.recorridoUrl) html += '<button class="sr-btn sr-full" data-act="tour" style="margin:6px 0 4px">Recorrer el apartamento en 3D ↗</button>';
      if (u.estado === 'disponible') {
        html += '<form autocomplete="on"><div class="sr-k" style="margin-top:12px">Separa este apartamento</div>' +
          '<label>Nombre completo<input name="nombre" required autocomplete="name"></label>' +
          '<label>Correo<input name="correo" type="email" required autocomplete="email"></label>' +
          '<label>Celular<input name="celular" type="tel" required autocomplete="tel"></label>' +
          '<button class="sr-btn gold sr-full" type="submit">Separar con ' + money(sep, cur) + '</button>' +
          '<p class="sr-note" data-msg>Pagas la separación en Wompi (PSE, tarjeta, Nequi o Bancolombia). Al aprobarse, el apartamento queda reservado a tu nombre.</p></form>';
      } else {
        html += '<p class="sr-note">Esta unidad ya no está disponible. ' + (S.whatsapp ? '<a style="color:var(--gold)" target="_blank" href="https://wa.me/' + esc(S.whatsapp) + '?text=' + encodeURIComponent('Hola, me interesa el apartamento ' + u.id + ' de ' + S.proyecto + '. ¿Hay unidades similares?') + '">Pregúntale al asesor por unidades similares</a>.' : '') + '</p>';
      }
      sheet.innerHTML = html + '</div>';
      sheet.classList.add('on');
      sheet.querySelector('.x').onclick = closeSheet;
      var t = sheet.querySelector('[data-act=tour]'); if (t) t.onclick = function () { window.open(opts.recorridoUrl || rec.url, '_blank'); };
      var f = sheet.querySelector('form');
      if (f) f.onsubmit = function (e) {
        e.preventDefault();
        var d = Object.fromEntries(new FormData(f).entries());
        var msg = f.querySelector('[data-msg]'), btn = f.querySelector('button');
        btn.disabled = true; msg.textContent = 'Preparando el pago…';
        (opts.onReserve || reserve)(S, u, d).catch(function (err) { btn.disabled = false; msg.textContent = err.message; });
      };
    }
    function closeSheet() { sheet.classList.remove('on'); sP.svg.querySelectorAll('.sel').forEach(function (x) { x.classList.remove('sel'); }); }

    function reserve(S, u, cliente) {
      var cfg = S.wompi || {};
      if (!wompi.configured(cfg)) return Promise.reject(new Error('La pasarela de pago aún no está configurada. Escríbele al asesor por WhatsApp.'));
      var cents = sepValue(S, u) * 100;
      var ref = 'SEP-' + slug(S.proyecto).slice(0, 20).toUpperCase() + '-' + u.id + '-' + Date.now().toString(36).toUpperCase();
      var pend = { ref: ref, unidad: u.id, cents: cents, moneda: cur, cliente: cliente, env: wompi.env(cfg.publicKey), t: Date.now() };
      try { localStorage.setItem('sr:pendiente:' + slug(S.proyecto), JSON.stringify(pend)); } catch (e) {}
      var back = new URL(opts.graciasUrl || 'gracias.html', location.href).href;
      return wompi.checkoutUrl(cfg, { reference: ref, amountInCents: cents, currency: cur, redirectUrl: back })
        .then(function (url) { location.href = url; });
    }

    drawFacade();
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    return {
      refresh: function () { if (piso && !vP.classList.contains('off')) showFloor(piso); else drawFacade(); },
      showFloor: function (id) { var p = (S.pisos || []).filter(function (x) { return x.id === id; })[0]; if (p) showFloor(p); },
      showFacade: showFacade
    };
  }

  window.SR = {
    ESTADOS: ESTADOS, mount: mount, syncUnits: syncUnits, planta: planta, unitsOf: unitsOf,
    overlay: overlay, wompi: wompi, db: db, money: money, slug: slug, esc: esc, sepValue: sepValue, h: h, pts: pts
  };
})();
