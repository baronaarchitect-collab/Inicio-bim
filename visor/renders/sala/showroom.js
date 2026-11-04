/*!
 * Life City · Sala de ventas con renders — motor del showroom
 * ------------------------------------------------------------
 * Flujo del comprador: render frontal (cada piso es un botón) → planta del piso
 * (cada apartamento es un botón) → ficha con valor → reserva con el % de separación vía Wompi.
 *
 *   SR.mount(el, S, opts)        → monta el showroom. opts: {img(path)→url, graciasUrl, recorridoUrl, onReserve, onCita, salaLocal}
 *   SR.tour3D(S, u, a, pl, opts)  → link del recorrido 3D de un apto (su modelo, su página o la app 3D de la sala)
 *   SR.syncUnits(S)              → crea/actualiza S.unidades a partir de pisos × plantas
 *   SR.overlay.get/set(S)        → cambios locales (dashboard, reservas) encima de datos.js
 *   SR.wompi.*                   → firma de integridad, URL del Web Checkout y consulta de transacciones
 *   SR.db.*                      → IndexedDB para archivos (renders, plantas, modelo 3D)
 *
 * Datos (window.SALA): {proyecto, empresa, ciudad, whatsapp, moneda, separacion,
 *   wompi:{publicKey, integrity, firmaUrl}, fachada:{img},
 *   pisos:[{id, nivel, nombre, poly:[[x,y]…], planta}],      // poly normalizado 0..1 sobre la fachada
 *   plantas:[{id, nombre, img, recorrido, aptos:[{n, poly, area, alcobas, banos, precio, render, recorrido}]}],
 *     recorrido de planta/apto: link de una página publicada (Matterport, Kuula, artifact…) o de un modelo 3D (.glb, .ifc…)
 *   incremento, unidades:[{id, piso, apto, area, alcobas, banos, precio, estado}],
 *   recorrido:{url, paleta:[{nombre,hex}], decisiones:[{cat,titulo,texto}]},
 *   cta:{tipo:'pagar'|'sala', texto, url},                  // llamado a la acción de la ficha
 *   correoConstructora, firebase:{…, masters}}               // inventario en la nube (nube.js)
 */
(function () {
  'use strict';

  var ESTADOS = { disponible: 'Disponible', reservado: 'Reservado', vendido: 'Vendido' };
  var VISOR3D = (window.LC_CONFIG && window.LC_CONFIG.visor3d) || 'https://baronaarchitect-collab.github.io/sala-3d-apartamentos/visor.html';
  var ES_MODELO = /\.(ifc|glb|gltf|obj|fbx)(\?|#|$)/i;

  /* ---------- utilidades ---------- */
  function h(tag, attrs, kids) {
    var svg = /^(svg|polygon|path|text|g)$/.test(tag);
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
      ['proyecto', 'empresa', 'ciudad', 'whatsapp', 'moneda', 'separacion', 'incremento', 'wompi', 'pisos', 'plantas', 'unidades', 'crm', 'netlify', 'recorrido', 'cta', 'correoConstructora', 'firebase']
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

  /* ---------- recorrido 3D ---------- */
  function conQs(url, extra) { return url + (url.indexOf('?') >= 0 ? '&' : '?') + extra; }
  function esVisor(url) { return /sala-3d-apartamentos|visor\.html/.test(url || ''); }
  /* link de la sala para la app 3D: el sitio publicado, o el proyecto del asistente en este navegador */
  function salaQs(opts) {
    if (opts && opts.salaLocal) return 'local=' + encodeURIComponent(opts.salaLocal);
    return 'sala=' + encodeURIComponent(location.href.split('#')[0].split('?')[0]);
  }
  /* {url, tipo:'3d'|'pagina', nombre}: el modelo o la página que la constructora puso al apto o a su planta;
     si no hay, la app 3D de la sala entra directo a ese apto (con el apto del IFC del edificio si lo tiene) */
  function tour3D(S, u, a, pl, opts) {
    opts = opts || {};
    var rec = (a && a.recorrido) || (pl && pl.recorrido) || '', gen = (S.recorrido || {}).url || opts.recorridoUrl || '';
    var q = 'apto=' + encodeURIComponent(u.id) + '&entrar=1&embed=1';
    if (rec && ES_MODELO.test(rec)) {
      var abs = /^(https?:|blob:)/.test(rec) ? rec : new URL(rec, location.href).href;
      var extra = '&modelo=' + encodeURIComponent(abs.indexOf('blob:') === 0 ? rec.split('/').pop() : abs);
      if (S.id && !/^https?:/.test(rec)) extra += '&srdb=' + encodeURIComponent(S.id + ':' + rec);
      return { url: conQs(esVisor(gen) ? gen : VISOR3D + '?' + salaQs(opts), q + extra), tipo: '3d' };
    }
    if (rec) return { url: rec, tipo: 'pagina' };
    return { url: esVisor(gen) ? conQs(gen, q) : VISOR3D + '?' + salaQs(opts) + '&' + q, tipo: '3d' };
  }
  function edificio3D(S, opts) {
    var gen = (S.recorrido || {}).url || (opts && opts.recorridoUrl) || '';
    return esVisor(gen) ? conQs(gen, 'embed=1') : VISOR3D + '?' + salaQs(opts) + '&embed=1';
  }
  /* el link de recorrido general de la sala cuando es otra página (Matterport, Kuula, un recorrido publicado) */
  function recorridoExtra(S, opts) {
    var gen = (S.recorrido || {}).url || (opts && opts.recorridoUrl) || '';
    return gen && !esVisor(gen) ? gen : '';
  }
  /* el 3D se abre encima de la sala, sin perderla */
  function modal3D(root, url, titulo) {
    var old = root.querySelector('.sr-modal'); if (old) old.remove();
    var m = h('div', { class: 'sr-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });
    var close = h('button', { class: 'sr-btn', type: 'button' }, ['← Volver a la sala']);
    m.appendChild(h('div', { class: 'sr-modal-h' }, [close, h('b', {}, [titulo]), h('div', { class: 'sr-sp' }), h('a', { class: 'sr-btn', href: url.replace(/([?&])embed=1&?/, '$1').replace(/[?&]$/, ''), target: '_blank', rel: 'noopener' }, ['Abrir en pestaña nueva ↗'])]));
    m.appendChild(h('iframe', { src: url, title: titulo, allow: 'fullscreen; xr-spatial-tracking', allowfullscreen: 'true' }));
    function cerrar() { m.remove(); document.removeEventListener('keydown', esc1); }
    function esc1(e) { if (e.key === 'Escape') cerrar(); }
    close.onclick = cerrar; document.addEventListener('keydown', esc1);
    root.appendChild(m); close.focus();
  }

  /* ---------- cita en la sala de ventas ---------- */
  function diasCita() {
    var out = [], d = new Date(); d.setHours(0, 0, 0, 0);
    for (var i = 1; out.length < 12 && i < 30; i++) { var x = new Date(d); x.setDate(d.getDate() + i); if (x.getDay() !== 0) out.push(x); }
    return out;
  }
  function formCita(u) {
    var dias = diasCita().map(function (d) { return '<option value="' + d.toISOString().slice(0, 10) + '">' + esc(d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })) + '</option>'; }).join('');
    var horas = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'].map(function (t) { return '<option>' + t + '</option>'; }).join('');
    return '<form class="sr-cita" data-cita hidden autocomplete="on"><div class="sr-k" style="margin-top:6px">Agenda tu visita al apartamento ' + esc(u.id) + '</div>' +
      '<label>Nombre completo<input name="nombre" required autocomplete="name"></label>' +
      '<label>Celular<input name="celular" type="tel" required autocomplete="tel"></label>' +
      '<label>Correo (opcional)<input name="correo" type="email" autocomplete="email"></label>' +
      '<div class="sr-two"><label>Día<select name="fecha">' + dias + '</select></label><label>Hora<select name="hora">' + horas + '</select></label></div>' +
      '<label>¿Cómo prefieres?<select name="modalidad"><option>En la sala de ventas</option><option>Videollamada</option></select></label>' +
      '<label>Comentario (opcional)<input name="nota" placeholder="Ej.: voy con mi pareja, quiero ver acabados"></label>' +
      '<button class="sr-btn gold sr-full" type="submit">Confirmar cita</button><p class="sr-note" data-msg></p></form>';
  }
  function citar(S, u, d, opts) {
    var fecha = new Date(d.fecha + 'T' + d.hora + ':00');
    var cuando = fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) + ' a las ' + d.hora;
    var txt = 'Cita en la sala de ventas · ' + S.proyecto + ' · Apto ' + u.id + ' (' + (u.area || '–') + ' m², ' + money(u.precio, S.moneda) + ')\n' +
      'Cuándo: ' + cuando + ' · ' + d.modalidad + (d.nota ? '\nComentario: ' + d.nota : '');
    try { localStorage.setItem('sr:cita:' + slug(S.proyecto), JSON.stringify({ unidad: u.id, cliente: { nombre: d.nombre, celular: d.celular, correo: d.correo }, fecha: d.fecha, hora: d.hora, t: Date.now() })); } catch (e) {}
    var envios = [];
    if (opts.onCita) envios.push(Promise.resolve(opts.onCita(S, u, d, txt)));
    else if (S.crm && !S.demo) envios.push(import('https://proyectos-lifecity.github.io/crm/lead.js').then(function (m) {
      return m.guardarLead({ nombre: d.nombre, celular: d.celular, correo: d.correo, proyecto: S.proyecto, mensaje: txt, origen: 'Sala de renders · cita en sala de ventas' });
    }).catch(function (e) { console.warn('CRM:', e); }));
    return Promise.all(envios).then(function () {
      return { cuando: cuando, wa: S.whatsapp ? 'https://wa.me/' + S.whatsapp + '?text=' + encodeURIComponent('Hola, soy ' + d.nombre + '. Agendé una cita:\n' + txt) : '' };
    });
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
    if (recorridoExtra(S, opts)) topF.appendChild(h('a', { class: 'sr-btn', href: recorridoExtra(S, opts), target: '_blank', rel: 'noopener' }, ['Recorrido virtual ↗']));
    if (opts.sin3D !== true) topF.appendChild(h('button', { class: 'sr-btn gold sr-tour', type: 'button', on: { click: function () { modal3D(root, edificio3D(S, opts), 'Edificio en 3D · ' + (S.proyecto || '')); } } }, ['Ver el edificio en 3D']));
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
      // máscara: al resaltar un piso se oscurece todo lo demás (sirve para pisos con forma irregular)
      var dim = h('path', { class: 'sr-dim', 'fill-rule': 'evenodd', d: 'M0 0H1V1H0Z' });
      sF.svg.appendChild(dim);
      function spot(p) { if (p) dim.setAttribute('d', 'M0 0H1V1H0Z M' + p.poly.map(function (q) { return q[0] + ' ' + q[1]; }).join(' L') + 'Z'); dim.classList.toggle('on', !!p); }
      pisosOrden.forEach(function (p) {
        var n = libres(p), tot = unitsOf(S, p.id).length;
        var label = p.nombre || ('Piso ' + p.nivel);
        var info = '<b>' + esc(label) + '</b><span>' + (tot ? n + ' de ' + tot + ' disponibles' : 'Sin unidades') + '</span>';
        var poly = h('polygon', { class: 'sr-zone' + (n ? '' : ' none'), points: pts(p.poly), 'data-id': p.id });
        var btn = h('button', { 'data-id': p.id, html: '<span>' + esc(label) + '</span><em class="' + (n ? '' : 'z') + '">' + n + ' disp.</em>' });
        function on(e) { poly.classList.add('hl'); btn.classList.add('hl'); spot(p); if (e && e.clientX) showTip(e, info); }
        function off() { poly.classList.remove('hl'); btn.classList.remove('hl'); spot(null); hideTip(); }
        poly.addEventListener('mousemove', on); poly.addEventListener('mouseleave', off);
        btn.addEventListener('mouseenter', function () { on(); });
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
      var sep = sepValue(S, u), rec = S.recorrido || {}, cta = S.cta || {}, pagar = cta.tipo !== 'sala';
      var html = '<button class="x" aria-label="Cerrar">✕</button>' +
        (a.render ? '<img class="hero" src="' + esc(img(a.render)) + '" alt="">' : '') +
        '<div class="in"><span class="sr-state ' + u.estado + '">' + ESTADOS[u.estado] + '</span>' +
        '<div class="sr-k" style="margin-top:14px">' + esc(p.nombre || ('Piso ' + p.nivel)) + '</div>' +
        '<h3>Apartamento ' + esc(u.id) + '</h3>' +
        '<div class="sr-facts"><div><b>' + (u.area || '–') + '</b><span>m² construidos</span></div><div><b>' + (u.alcobas || '–') + '</b><span>alcobas</span></div><div><b>' + (u.banos || '–') + '</b><span>baños</span></div></div>' +
        '<div class="sr-price"><span>Valor</span><b>' + money(u.precio, cur) + '</b></div>' +
        (pagar ? '<div class="sr-price sep"><span>Separación (' + (S.separacion || 10) + ' %)</span><b>' + money(sep, cur) + '</b></div>' : '');
      if ((rec.paleta || []).length) html += '<div class="sr-sec"><div class="sr-k">Paleta de acabados</div><div class="sr-pal">' + rec.paleta.map(function (c) { return '<i title="' + esc(c.nombre) + '" style="background:' + esc(c.hex) + '"></i>'; }).join('') + '</div></div>';
      if ((rec.decisiones || []).length) html += '<div class="sr-sec"><div class="sr-k">Decisiones arquitectónicas</div><ul class="sr-dec">' + rec.decisiones.slice(0, 4).map(function (d) { return '<li><b>' + esc(d.titulo) + '</b>' + esc(d.texto) + '</li>'; }).join('') + '</ul></div>';
      var pl = planta(S, p.planta), t3 = tour3D(S, u, a, pl, opts);
      if (opts.sin3D !== true) html += '<button class="sr-btn sr-full sr-3d" data-act="tour" type="button" style="margin:6px 0 4px">' + (t3.tipo === '3d' ? 'Entrar al apartamento en 3D' : 'Recorrer el apartamento') + '</button>';
      if (recorridoExtra(S, opts) && t3.url !== recorridoExtra(S, opts)) html += '<a class="sr-note" style="display:block;color:var(--gold)" target="_blank" rel="noopener" href="' + esc(recorridoExtra(S, opts)) + '">Ver también el recorrido virtual del proyecto ↗</a>';
      if (u.estado === 'disponible' && !pagar) {
        // llamado a la acción: ir a la sala de ventas (link del dashboard o, si no hay, agendar por WhatsApp)
        var msgSala = 'Hola, me interesa el apartamento ' + u.id + ' de ' + S.proyecto + '. Quiero visitar la sala de ventas.';
        var go = cta.url ? cta.url.replace(/\{apto\}/g, encodeURIComponent(u.id)) : (S.whatsapp ? 'https://wa.me/' + S.whatsapp + '?text=' + encodeURIComponent(msgSala) : '');
        html += go ? '<a class="sr-btn gold sr-full" data-act="cta" target="_blank" rel="noopener" href="' + esc(go) + '" style="margin-top:12px;text-align:center">' + esc(cta.texto || 'Ir a la sala de ventas') + '</a>' +
          '<p class="sr-note">' + (cta.url ? 'Te atendemos en la sala de ventas del proyecto.' : 'Agenda tu visita con el asesor por WhatsApp.') + '</p>' : '<p class="sr-note">Escríbele al asesor para visitar la sala de ventas.</p>';
      } else if (u.estado === 'disponible') {
        html += '<form autocomplete="on"><div class="sr-k" style="margin-top:12px">Separa este apartamento</div>' +
          '<label>Nombre completo<input name="nombre" required autocomplete="name"></label>' +
          '<label>Correo<input name="correo" type="email" required autocomplete="email"></label>' +
          '<label>Celular<input name="celular" type="tel" required autocomplete="tel"></label>' +
          '<button class="sr-btn gold sr-full" type="submit">Separar con ' + money(sep, cur) + '</button>' +
          '<p class="sr-note" data-msg>Pagas la separación en Wompi (PSE, tarjeta, Nequi o Bancolombia). Al aprobarse, el apartamento queda reservado a tu nombre.</p></form>';
      } else {
        html += '<p class="sr-note">Esta unidad ya no está disponible. ' + (S.whatsapp ? '<a style="color:var(--gold)" target="_blank" href="https://wa.me/' + esc(S.whatsapp) + '?text=' + encodeURIComponent('Hola, me interesa el apartamento ' + u.id + ' de ' + S.proyecto + '. ¿Hay unidades similares?') + '">Pregúntale al asesor por unidades similares</a>.' : '') + '</p>';
      }
      if (u.estado === 'disponible') html += '<div class="sr-sec sr-o"><span>' + (pagar ? 'o, antes de separar' : 'o') + '</span></div>' +
        '<button class="sr-btn sr-full" data-act="cita" type="button">Agendar cita en la sala de ventas</button>' + formCita(u);
      sheet.innerHTML = html + '</div>';
      sheet.classList.add('on');
      sheet.querySelector('.x').onclick = closeSheet;
      var t = sheet.querySelector('[data-act=tour]'); if (t) t.onclick = function () { modal3D(root, t3.url, 'Apartamento ' + u.id + ' · ' + (S.proyecto || '')); };
      var bc = sheet.querySelector('[data-act=cita]'), fc = sheet.querySelector('[data-cita]');
      if (bc) bc.onclick = function () { bc.hidden = true; fc.hidden = false; fc.querySelector('input').focus(); fc.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
      if (fc) fc.onsubmit = function (e) {
        e.preventDefault();
        var d = Object.fromEntries(new FormData(fc).entries()), msg = fc.querySelector('[data-msg]'), btn = fc.querySelector('button');
        if (String(d.celular).replace(/\D/g, '').length < 7) { msg.textContent = 'Escribe un celular válido.'; return; }
        btn.disabled = true; msg.textContent = 'Agendando…';
        citar(S, u, d, opts).then(function (r) {
          fc.innerHTML = '<div class="sr-ok"><b>Listo, ' + esc(d.nombre.split(' ')[0]) + '.</b> Te esperamos el ' + esc(r.cuando) + '. Un asesor te confirma por celular.</div>' +
            (r.wa ? '<a class="sr-btn gold sr-full" target="_blank" rel="noopener" href="' + esc(r.wa) + '" style="text-align:center;margin-top:10px">Confirmar también por WhatsApp</a>' : '');
        }).catch(function (err) { btn.disabled = false; msg.textContent = err.message || 'No se pudo agendar. Escríbele al asesor.'; });
      };
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
    overlay: overlay, wompi: wompi, db: db, money: money, slug: slug, esc: esc, sepValue: sepValue, h: h, pts: pts, tour3D: tour3D, VISOR3D: VISOR3D
  };
})();
