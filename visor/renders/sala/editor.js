/*!
 * Life City · Editor de zonas sobre una imagen (pisos en el render, apartamentos en la planta)
 *   var ed = SR.editor(el, {src, shapes, label(shape), create(poly)→shape|null, onChange(shapes), onSelect(shape)})
 *   Arrastrar en vacío → rectángulo · clics → polígono (cierra con el primer punto, doble clic o Enter)
 *   Clic en una zona → seleccionar · arrastrar sus vértices → ajustar · Supr → borrar · Esc → cancelar
 *   ed.set(shapes) · ed.select(id) · ed.remove(id) · ed.splitBands(rectPoly, n) → polys
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
    '.ed .hd.f{background:#c8a96a;border-color:#fff}';

  function editor(el, o) {
    if (!document.getElementById('ed-css')) { var st = document.createElement('style'); st.id = 'ed-css'; st.textContent = CSS; document.head.appendChild(st); }
    var shapes = (o.shapes || []).slice(), sel = null, draft = [], down = null, dragV = null;
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
      if (sel) sel.poly.forEach(function (q, i) {
        var hd = document.createElement('div'); hd.className = 'hd';
        hd.style.left = q[0] * 100 + '%'; hd.style.top = q[1] * 100 + '%'; hd.style.pointerEvents = 'auto';
        hd.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); dragV = i; cap(e); });
        layer.appendChild(hd);
      });
      if (draft.length) {
        svg.appendChild(sv('polyline', { class: 'd', points: pts(draft), fill: 'none' }));
        draft.forEach(function (q, i) {
          var hd = document.createElement('div'); hd.className = 'hd' + (i === 0 ? ' f' : '');
          hd.style.left = q[0] * 100 + '%'; hd.style.top = q[1] * 100 + '%'; layer.appendChild(hd);
        });
      }
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
      el.focus(); down = { p: xy(e), moved: false }; cap(e);
    });
    el.addEventListener('pointermove', function (e) {
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

  window.SR = window.SR || {};
  window.SR.editor = editor;
  window.SR.splitBands = splitBands;
})();
