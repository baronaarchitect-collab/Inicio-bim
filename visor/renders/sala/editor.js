/*!
 * Life City · Editor de zonas sobre una imagen (pisos en el render, apartamentos en la planta)
 *   var ed = SR.editor(el, {src, shapes, label(shape), create(poly)→shape|null, onChange(shapes), onSelect(shape)})
 *   Arrastrar en vacío → rectángulo · clics → polígono (cierra con el primer punto, doble clic o Enter)
 *   Clic en una zona → seleccionar · arrastrar sus vértices → ajustar · Supr → borrar · Esc → cancelar
 *   Zona seleccionada: arrastra un "+" (mitad de cada borde) para agregar un punto · doble clic o clic derecho en un punto → quitarlo
 *   ed.set(shapes) · ed.select(id) · ed.remove(id) · ed.guide({mask, lines, onChange}) | ed.guide(null)
 *   SR.splitBands(rectPoly, n) → polys · SR.floorLines(mask, n) → líneas de losa · SR.clipFloors(mask, lines) → polys
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function sv(tag, a) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); return e; }
  function pts(p) { return p.map(function (q) { return q[0] + ',' + q[1]; }).join(' '); }
  function r4(v) { return Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000; }

  var CSS = '.ed{position:relative;user-select:none;touch-action:none;background:#111;border-radius:10px;overflow:hidden}' +
    '.ed img{display:block;width:100%;height:auto;pointer-events:none}' +
    '.ed svg{position:absolute;inset:0;width:100%;height:100%;cursor:crosshair}' +
    '.ed .z{fill:rgba(200,169,106,.25);stroke:#c8a96a;stroke-width:1.5;vector-effect:non-scaling-stroke;cursor:pointer}' +
    '.ed .z.s{fill:rgba(63,182,122,.3);stroke:#3fb67a;stroke-width:2.5}' +
    '.ed .d{fill:rgba(255,255,255,.12);stroke:#fff;stroke-dasharray:4 3;stroke-width:1.5;vector-effect:non-scaling-stroke;pointer-events:none}' +
    '.ed .lb{position:absolute;transform:translate(-50%,-50%);font:600 11px Inter,sans-serif;color:#111;background:rgba(255,255,255,.88);padding:1px 6px;border-radius:5px;pointer-events:none;white-space:nowrap}' +
    '.ed .hd{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#fff;border:2px solid #3fb67a;cursor:move}' +
    '.ed .hd.f{background:#c8a96a;border-color:#fff}' +
    '.ed .hd.m{width:10px;height:10px;margin:-5px 0 0 -5px;background:#3fb67a;border-color:#fff;opacity:.75;cursor:copy}' +
    '.ed .hd.m:hover{opacity:1;transform:scale(1.3)}' +
    '.ed .hd.g{background:#c8a96a;border-color:#111;cursor:ns-resize}' +
    '.ed .gm{fill:none;stroke:#c8a96a;stroke-width:2;stroke-dasharray:6 4;vector-effect:non-scaling-stroke;pointer-events:none}' +
    '.ed .gl{stroke:#fff;stroke-width:1.5;vector-effect:non-scaling-stroke;pointer-events:none}' +
    '.ed .gp{stroke:none;pointer-events:none}';

  function editor(el, o) {
    if (!document.getElementById('ed-css')) { var st = document.createElement('style'); st.id = 'ed-css'; st.textContent = CSS; document.head.appendChild(st); }
    var shapes = (o.shapes || []).slice(), sel = null, draft = [], down = null, dragV = null, guide = null, dragG = null;
    el.innerHTML = ''; el.classList.add('ed'); el.tabIndex = 0;
    var img = document.createElement('img'); img.src = o.src; img.alt = '';
    var svg = sv('svg', { viewBox: '0 0 1 1', preserveAspectRatio: 'none' });
    var layer = document.createElement('div'); layer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    el.appendChild(img); el.appendChild(svg); el.appendChild(layer);
    img.onload = draw;

    function xy(e) { var r = el.getBoundingClientRect(); return [r4((e.clientX - r.left) / r.width), r4((e.clientY - r.top) / r.height)]; }
    function near(a, b) { var r = el.getBoundingClientRect(); return Math.hypot((a[0] - b[0]) * r.width, (a[1] - b[1]) * r.height) < 10; }
    function changed() { draw(); o.onChange && o.onChange(shapes); }

    function draw() {
      svg.innerHTML = ''; layer.innerHTML = '';
      shapes.forEach(function (s) {
        var p = sv('polygon', { class: 'z' + (s === sel ? ' s' : ''), points: pts(s.poly) });
        p.addEventListener('pointerdown', function (e) { e.stopPropagation(); if (draft.length) return; select(s); });
        svg.appendChild(p);
        var c = s.poly.reduce(function (a, q) { return [a[0] + q[0] / s.poly.length, a[1] + q[1] / s.poly.length]; }, [0, 0]);
        var lb = document.createElement('div'); lb.className = 'lb'; lb.textContent = o.label ? o.label(s) : (s.id || '');
        lb.style.left = c[0] * 100 + '%'; lb.style.top = c[1] * 100 + '%'; layer.appendChild(lb);
      });
      if (guide) drawGuide();
      if (sel && !guide) sel.poly.forEach(function (q, i) {
        var hd = handle('hd', q);
        hd.title = 'Arrastra para mover · doble clic o clic derecho para quitar';
        hd.addEventListener('pointerdown', function (e) { if (e.button === 2) return; e.stopPropagation(); e.preventDefault(); dragV = i; cap(e); });
        function del(e) { e.preventDefault(); e.stopPropagation(); dragV = null; if (sel.poly.length > 3) { sel.poly.splice(i, 1); changed(); } }
        hd.addEventListener('dblclick', del); hd.addEventListener('contextmenu', del);
        // "+" en la mitad del borde i → i+1: al arrastrarlo nace un punto nuevo
        var nx = sel.poly[(i + 1) % sel.poly.length], m = handle('hd m', [(q[0] + nx[0]) / 2, (q[1] + nx[1]) / 2]);
        m.title = 'Arrastra para agregar un punto';
        m.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); sel.poly.splice(i + 1, 0, xy(e)); dragV = i + 1; cap(e); draw(); });
      });
      if (draft.length) {
        svg.appendChild(sv('polyline', { class: 'd', points: pts(draft), fill: 'none' }));
        draft.forEach(function (q, i) {
          var hd = document.createElement('div'); hd.className = 'hd' + (i === 0 ? ' f' : '');
          hd.style.left = q[0] * 100 + '%'; hd.style.top = q[1] * 100 + '%'; layer.appendChild(hd);
        });
      }
    }
    function handle(cls, q) {
      var hd = document.createElement('div'); hd.className = cls;
      hd.style.left = q[0] * 100 + '%'; hd.style.top = q[1] * 100 + '%'; hd.style.pointerEvents = 'auto';
      layer.appendChild(hd); return hd;
    }
    /* guía de contorno: silueta + líneas de losa arrastrables + vista previa de los pisos recortados */
    function drawGuide() {
      svg.appendChild(sv('polygon', { class: 'gm', points: pts(guide.mask) }));
      clipFloors(guide.mask, guide.lines).forEach(function (p, i) {
        svg.appendChild(sv('polygon', { class: 'gp', points: pts(p), fill: i % 2 ? 'rgba(200,169,106,.42)' : 'rgba(63,182,122,.38)' }));
      });
      guide.lines.forEach(function (l, i) {
        svg.appendChild(sv('line', { class: 'gl', x1: l[0][0], y1: l[0][1], x2: l[1][0], y2: l[1][1] }));
        l.forEach(function (q, j) {
          var hd = handle('hd g', q); hd.title = 'Línea de losa ' + (i + 1) + ': arrastra para ajustarla';
          hd.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); dragG = [i, j]; cap(e); });
        });
      });
    }
    function select(s) { sel = s; draw(); o.onSelect && o.onSelect(s); }
    function finish(poly) {
      draft = [];
      if (poly.length < 3) return draw();
      var s = o.create ? o.create(poly) : { id: 'z' + Date.now(), poly: poly };
      if (!s) return draw();
      if (Array.isArray(s)) { shapes = shapes.concat(s); sel = s[s.length - 1]; } else { shapes.push(s); sel = s; }
      changed(); o.onSelect && o.onSelect(sel);
    }

    svg.addEventListener('pointerdown', function (e) {
      if (guide) return;
      el.focus(); down = { p: xy(e), moved: false }; cap(e);
    });
    el.addEventListener('pointermove', function (e) {
      if (dragG) { guide.lines[dragG[0]][dragG[1]] = xy(e); draw(); return; }
      if (dragV != null && sel) { sel.poly[dragV] = xy(e); draw(); return; }
      if (!down) return;
      var p = xy(e);
      if (!down.moved && !near(p, down.p)) down.moved = true;
      if (down.moved && !draft.length) {
        draw();
        var a = down.p; svg.appendChild(sv('polygon', { class: 'd', points: pts([a, [p[0], a[1]], p, [a[0], p[1]]]) }));
      }
    });
    function cap(e) { try { el.setPointerCapture(e.pointerId); } catch (x) {} }
    // también en window: si el puntero se suelta fuera del editor (o sin captura) igual se cierra la zona
    el.addEventListener('pointerup', onUp);
    window.addEventListener('pointerup', onUp);
    function onUp(e) {
      if (dragG) { dragG = null; guide.onChange && guide.onChange(guide); return; }
      if (dragV != null) { dragV = null; changed(); return; }
      if (!down) return;
      var p = xy(e), a = down.p, moved = down.moved; down = null;
      if (moved && !draft.length) return finish([a, [p[0], a[1]], p, [a[0], p[1]]]);
      if (draft.length >= 3 && near(p, draft[0])) return finish(draft.slice());
      if (!draft.length && sel) { sel = null; draw(); o.onSelect && o.onSelect(null); }
      draft.push(p); draw();
    }
    el.addEventListener('dblclick', function () { if (draft.length >= 3) finish(draft.slice(0, -1).length >= 3 ? draft.slice(0, -1) : draft.slice()); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { draft = []; draw(); }
      if (e.key === 'Enter' && draft.length >= 3) finish(draft.slice());
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel && !draft.length && e.target === el) { e.preventDefault(); api.remove(sel); }
    });

    var api = {
      set: function (s) { shapes = s.slice(); if (shapes.indexOf(sel) < 0) sel = null; draw(); },
      get: function () { return shapes; },
      select: function (s) { select(s); },
      remove: function (s) { shapes = shapes.filter(function (x) { return x !== s; }); if (sel === s) sel = null; changed(); o.onSelect && o.onSelect(null); },
      redraw: draw,
      guide: function (g) { guide = g; if (g) { sel = null; draft = []; } draw(); },
      src: function (s) { img.src = s; }
    };
    return api;
  }

  /* divide un rectángulo (o cuadrilátero) en n franjas horizontales, de arriba hacia abajo */
  function splitBands(poly, n) {
    var xs = poly.map(function (p) { return p[0]; }), ys = poly.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var out = [], hh = (y1 - y0) / n;
    for (var i = 0; i < n; i++) out.push([[x0, r4(y0 + hh * i)], [x1, r4(y0 + hh * i)], [x1, r4(y0 + hh * (i + 1))], [x0, r4(y0 + hh * (i + 1))]]);
    return out;
  }

  /* líneas de losa por defecto: n+1 horizontales repartidas en la altura de la silueta */
  function floorLines(mask, n) {
    var xs = mask.map(function (p) { return p[0]; }), ys = mask.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    return evenLines([[x0, y0], [x1, y0]], [[x0, y1], [x1, y1]], n);
  }
  /* reparte n+1 líneas entre la primera y la última (sirve para perspectiva: ambas pueden ir inclinadas) */
  function evenLines(top, bot, n) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      out.push([0, 1].map(function (j) { return [r4(top[j][0] + (bot[j][0] - top[j][0]) * t), r4(top[j][1] + (bot[j][1] - top[j][1]) * t)]; }));
    }
    return out;
  }
  /* cada piso = silueta ∩ franja entre dos líneas de losa (Sutherland–Hodgman contra la franja, que es convexa) */
  function clipFloors(mask, lines) {
    var xs = mask.map(function (p) { return p[0]; }), X0 = Math.min.apply(null, xs) - 0.05, X1 = Math.max.apply(null, xs) + 0.05;
    function at(l, x) { var a = l[0], b = l[1], dx = b[0] - a[0]; return dx === 0 ? a[1] : a[1] + (b[1] - a[1]) * (x - a[0]) / dx; }
    var out = [];
    for (var i = 0; i < lines.length - 1; i++) {
      var band = [[X0, at(lines[i], X0)], [X1, at(lines[i], X1)], [X1, at(lines[i + 1], X1)], [X0, at(lines[i + 1], X0)]];
      var p = simplify(clip(mask, band).map(function (q) { return [r4(q[0]), r4(q[1])]; }));
      if (p.length >= 3 && Math.abs(area(p)) > 1e-6) out.push(p);
    }
    return out;
  }
  /* quita puntos repetidos y alineados que deja el recorte, para que la máscara tenga solo las esquinas reales */
  function simplify(p) {
    var changed = true;
    while (changed && p.length > 3) {
      changed = false;
      for (var i = 0; i < p.length; i++) {
        var a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length];
        if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-7) { p.splice(i, 1); changed = true; break; }
      }
    }
    return p;
  }
  function area(p) { var s = 0; for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
  function clip(subject, c) {
    var o = area(c) > 0 ? 1 : -1, out = subject.slice();
    for (var i = 0; i < c.length && out.length; i++) {
      var a = c[i], b = c[(i + 1) % c.length], inp = out; out = [];
      var ins = function (p) { return o * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0; };
      var cut = function (p, q) {
        var d = (p[0] - q[0]) * (a[1] - b[1]) - (p[1] - q[1]) * (a[0] - b[0]);
        var t = ((p[0] - a[0]) * (a[1] - b[1]) - (p[1] - a[1]) * (a[0] - b[0])) / d;
        return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
      };
      for (var j = 0; j < inp.length; j++) {
        var P = inp[j], Q = inp[(j + 1) % inp.length], pi = ins(P), qi = ins(Q);
        if (pi && qi) out.push(Q);
        else if (pi && !qi) out.push(cut(P, Q));
        else if (!pi && qi) { out.push(cut(P, Q)); out.push(Q); }
      }
    }
    return out;
  }

  window.SR = window.SR || {};
  window.SR.editor = editor;
  window.SR.splitBands = splitBands;
  window.SR.floorLines = floorLines;
  window.SR.evenLines = evenLines;
  window.SR.clipFloors = clipFloors;
})();
