/*!
 * Life City · Zonas: marcar pisos en el render frontal y apartamentos en cada planta.
 *   SR.zonas(el, S, {img(path)→url, upload(file, nombre)→Promise<path>, onChange(S)})
 * Lo usan el asistente de implementación y el dashboard. Requiere showroom.js y editor.js.
 */
(function () {
  'use strict';
  var CSS = '.zn{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}' +
    '.zn-tabs{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap}' +
    '.zn-tabs button{border:1px solid var(--line,#333);background:transparent;color:inherit;border-radius:999px;padding:7px 14px;font:inherit;font-size:13px;cursor:pointer}' +
    '.zn-tabs button.on{background:#c8a96a;color:#17140d;border-color:#c8a96a;font-weight:600}' +
    '.zn-side{display:grid;gap:12px;font-size:13px}' +
    '.zn-box{border:1px solid var(--line,#333);border-radius:12px;padding:14px;display:grid;gap:9px}' +
    '.zn-box h4{margin:0;font:600 11px Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#c8a96a}' +
    '.zn label{display:grid;gap:3px;color:#b9b3a6;font-size:12px}' +
    '.zn input,.zn select{font:inherit;font-size:13px;color:#f1ede4;background:#0d0e0c;border:1px solid var(--line,#333);border-radius:7px;padding:7px 9px;width:100%;box-sizing:border-box}' +
    '.zn .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
    '.zn .help{color:#b9b3a6;font-size:12px;line-height:1.45;margin:0}' +
    '.zn .b{border:1px solid var(--line,#333);background:transparent;color:inherit;border-radius:8px;padding:8px 12px;font:inherit;font-size:13px;cursor:pointer}' +
    '.zn .b.gold{background:#c8a96a;color:#17140d;border-color:#c8a96a;font-weight:600}' +
    '.zn .b.red{color:#e06b5b}' +
    '.zn .drop{border:1.5px dashed rgba(200,169,106,.6);border-radius:12px;padding:40px 20px;text-align:center;color:#b9b3a6;cursor:pointer}' +
    '.zn .drop:hover{background:rgba(200,169,106,.07)}' +
    '.zn .chips{display:flex;flex-wrap:wrap;gap:5px}.zn .chips label{display:flex;gap:4px;align-items:center;border:1px solid var(--line,#333);border-radius:6px;padding:3px 7px;color:#f1ede4}' +
    '.zn .chips input{width:auto}' +
    '@media(max-width:860px){.zn{grid-template-columns:1fr}}';

  function zonas(el, S, o) {
    o = o || {};
    if (!document.getElementById('zn-css')) { var st = document.createElement('style'); st.id = 'zn-css'; st.textContent = CSS; document.head.appendChild(st); }
    var img = o.img || function (p) { return p; }, esc = SR.esc;
    S.pisos = S.pisos || []; S.plantas = S.plantas || []; S.fachada = S.fachada || {};
    // herramientas de la fachada: contorno → pisos (silueta recortada por losas), rectángulo → pisos, polígono libre (un piso)
    var tab = 'fachada', ed = null, sel = null, band = { n: 10, nivel: 2 }, tool = 'contorno', guide = null;
    el.innerHTML = '<div class="zn"><div class="zn-tabs"></div><div class="zn-main"></div><div class="zn-side"></div></div>';
    var tabsEl = el.querySelector('.zn-tabs'), main = el.querySelector('.zn-main'), side = el.querySelector('.zn-side');

    function changed() { SR.syncUnits(S); o.onChange && o.onChange(S); }
    function pick(accept, cb) {
      var i = document.createElement('input'); i.type = 'file'; i.accept = accept;
      i.onchange = function () { if (i.files[0]) cb(i.files[0]); }; i.click();
    }
    function up(file, name) { return o.upload ? o.upload(file, name) : Promise.reject(new Error('Sube el archivo a la carpeta img/ y escribe su nombre.')); }
    function dropZone(txt, accept, cb) {
      var d = document.createElement('div'); d.className = 'drop'; d.innerHTML = txt;
      d.onclick = function () { pick(accept, cb); };
      d.ondragover = function (e) { e.preventDefault(); };
      d.ondrop = function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f) cb(f); };
      return d;
    }

    function drawTabs() {
      tabsEl.innerHTML = '';
      [['fachada', 'Render frontal · pisos']].concat(S.plantas.map(function (p) { return [p.id, 'Planta: ' + p.nombre]; })).forEach(function (t) {
        var b = document.createElement('button'); b.textContent = t[1]; b.className = tab === t[0] ? 'on' : '';
        b.onclick = function () { tab = t[0]; sel = null; render(); }; tabsEl.appendChild(b);
      });
      var add = document.createElement('button'); add.textContent = '+ Nueva planta'; add.onclick = newPlanta; tabsEl.appendChild(add);
    }
    function newPlanta() {
      var n = S.plantas.length + 1, id = 'planta' + Date.now().toString(36);
      S.plantas.push({ id: id, nombre: n === 1 ? 'Planta tipo' : 'Planta ' + n, img: '', aptos: [] });
      S.pisos.forEach(function (p) { if (!SR.planta(S, p.planta)) p.planta = id; });
      tab = id; sel = null; changed(); render();
    }

    function render() {
      drawTabs(); main.innerHTML = ''; side.innerHTML = ''; ed = null;
      if (tab === 'fachada') renderFachada(); else renderPlanta(SR.planta(S, tab));
    }

    /* ---------- fachada ---------- */
    function renderFachada() {
      if (!S.fachada.img) {
        main.appendChild(dropZone('<b style="color:#f1ede4">Sube el render frontal del edificio</b><br>JPG o PNG en alta (mínimo 2000 px de ancho). Es la imagen donde cada piso será un botón.', 'image/*', function (f) {
          up(f, 'fachada').then(function (p) { S.fachada.img = p; changed(); render(); }).catch(alert);
        }));
        side.innerHTML = '<div class="zn-box"><h4>Render frontal</h4><p class="help">Usa una vista frontal o ligeramente en ángulo donde se vean todos los pisos. Las fotos de valla o el render de mercadeo funcionan perfecto.</p></div>';
        return;
      }
      var box = document.createElement('div'); main.appendChild(box);
      ed = SR.editor(box, {
        src: img(S.fachada.img), shapes: S.pisos,
        label: function (p) { return p.nombre || ('Piso ' + p.nivel); },
        create: function (poly) {
          if (tool === 'contorno') {
            guide = { mask: poly, lines: SR.floorLines(poly, band.n), onChange: sideFachada };
            ed.guide(guide); sideFachada(); return null;
          }
          if (tool === 'rect') {
            var bands = SR.splitBands(poly, band.n), top = band.nivel + band.n - 1;
            var made = bands.map(function (b, i) { var lv = top - i; return { id: 'p' + lv + '-' + Date.now().toString(36) + i, nivel: lv, nombre: 'Piso ' + lv, poly: b, planta: (S.plantas[0] || {}).id || '' }; });
            band.nivel = top + 1; return made;
          }
          var lv = S.pisos.reduce(function (m, p) { return Math.max(m, +p.nivel || 0); }, 1) + 1;
          return { id: 'p' + lv + '-' + Date.now().toString(36), nivel: lv, nombre: 'Piso ' + lv, poly: poly, planta: (S.plantas[0] || {}).id || '' };
        },
        onChange: function (sh) { S.pisos = sh; changed(); sideFachada(); },
        onSelect: function (s) { sel = s; sideFachada(); }
      });
      sideFachada();
    }
    function sideFachada() {
      if (guide) return sideGuide();
      var TOOLS = { contorno: 'Contorno → pisos', rect: 'Rectángulo → pisos', libre: 'Un piso a mano' };
      var HELP = {
        contorno: 'Haz <b>clics</b> alrededor de la silueta del edificio (retrocesos, jardineras, cara lateral) y ciérrala en el primer punto. Luego ajustas las líneas de losa y cada piso queda recortado con la forma exacta.',
        rect: '<b>Arrastra</b> un rectángulo de la cubierta al primer piso de vivienda: se divide en franjas iguales. Útil en fachadas planas y frontales.',
        libre: 'Dibuja la máscara de un solo piso con <b>clics</b> (ciérrala en el primer punto). Para niveles con forma muy irregular.'
      };
      var html = '<div class="zn-box"><h4>Herramienta</h4><div class="chips">' + Object.keys(TOOLS).map(function (k) { return '<label><input type="radio" name="zn-tool" data-tool="' + k + '"' + (k === tool ? ' checked' : '') + '>' + TOOLS[k] + '</label>'; }).join('') + '</div>' +
        '<p class="help">' + HELP[tool] + '</p>' +
        (tool !== 'libre' ? '<div class="row"><label>Nº de pisos<input type="number" min="1" data-k="n" value="' + band.n + '"></label><label>Desde el nivel<input type="number" data-k="nivel" value="' + band.nivel + '"></label></div>' : '') +
        '<p class="help">Para afinar una máscara: selecciona el piso, arrastra sus puntos, arrastra un <b style="color:#3fb67a">+</b> para agregar un punto y haz doble clic en un punto para quitarlo.</p></div>';
      html += '<div class="zn-box"><h4>' + S.pisos.length + ' pisos marcados</h4>' + (S.plantas.length ? '' : '<p class="help">Luego crea una planta con <b>+ Nueva planta</b> y asígnala a los pisos.</p>');
      if (sel) {
        html += '<div class="row"><label>Nombre<input data-f="nombre" value="' + esc(sel.nombre) + '"></label><label>Nivel<input type="number" data-f="nivel" value="' + esc(sel.nivel) + '"></label></div>' +
          '<label>Planta de este piso<select data-f="planta"><option value="">— sin planta —</option>' + S.plantas.map(function (p) { return '<option value="' + p.id + '"' + (p.id === sel.planta ? ' selected' : '') + '>' + esc(p.nombre) + '</option>'; }).join('') + '</select></label>' +
          '<button class="b red" data-act="del">Borrar este piso</button>';
      } else html += '<p class="help">Selecciona un piso para editar su nombre, nivel y planta.</p>';
      html += '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="b" data-act="img">Cambiar render</button>' + (S.pisos.length ? '<button class="b red" data-act="clear">Borrar todos</button>' : '') + '</div></div>';
      side.innerHTML = html;
      side.querySelectorAll('[data-k]').forEach(function (i) { i.onchange = function () { band[i.dataset.k] = +i.value; }; });
      side.querySelectorAll('[data-tool]').forEach(function (i) { i.onchange = function () { tool = i.dataset.tool; sideFachada(); }; });
      side.querySelectorAll('[data-f]').forEach(function (i) {
        i.onchange = function () { sel[i.dataset.f] = i.type === 'number' ? +i.value : i.value; if (i.dataset.f === 'nivel' && /^Piso \d+$/.test(sel.nombre)) sel.nombre = 'Piso ' + i.value; changed(); ed.redraw(); sideFachada(); };
      });
      act('del', function () { ed.remove(sel); });
      act('clear', function () { if (confirm('¿Borrar todos los pisos marcados?')) { S.pisos = []; sel = null; changed(); render(); } });
      act('img', function () { pick('image/*', function (f) { up(f, 'fachada').then(function (p) { S.fachada.img = p; changed(); ed.src(img(p)); }).catch(alert); }); });
    }

    /* contorno dibujado: se ajustan las líneas de losa y se crean los pisos recortados */
    function sideGuide() {
      var n = guide.lines.length - 1;
      side.innerHTML = '<div class="zn-box"><h4>Líneas de losa</h4>' +
        '<p class="help">Arrastra los puntos dorados para que cada línea siga el borde de la losa en el render (puedes inclinarlas por la perspectiva). Las franjas verdes y doradas son los pisos que se van a crear.</p>' +
        '<div class="row"><label>Nº de pisos<input type="number" min="1" max="80" data-g="n" value="' + n + '"></label><label>Desde el nivel<input type="number" data-g="nivel" value="' + band.nivel + '"></label></div>' +
        '<p class="help">El piso de abajo será el nivel ' + band.nivel + ' y el de arriba el ' + (band.nivel + n - 1) + '. Si el primer piso es más alto (lobby), baja solo esa línea.</p>' +
        '<button class="b" data-act="even">Repartir parejo entre la primera y la última</button>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="b gold" data-act="make">Crear ' + n + ' pisos</button><button class="b" data-act="cancel">Cancelar</button></div></div>';
      side.querySelector('[data-g=n]').onchange = function (e) {
        var k = Math.max(1, Math.min(80, +e.target.value || 1)); band.n = k;
        guide.lines = SR.evenLines(guide.lines[0], guide.lines[guide.lines.length - 1], k); ed.guide(guide); sideGuide();
      };
      side.querySelector('[data-g=nivel]').onchange = function (e) { band.nivel = +e.target.value || 1; sideGuide(); };
      act('even', function () { guide.lines = SR.evenLines(guide.lines[0], guide.lines[guide.lines.length - 1], guide.lines.length - 1); ed.guide(guide); });
      act('cancel', function () { guide = null; ed.guide(null); sideFachada(); });
      act('make', function () {
        var L = guide.lines, top = band.nivel + L.length - 2, stamp = Date.now().toString(36), made = [];
        for (var i = 0; i < L.length - 1; i++) {
          var poly = SR.clipFloors(guide.mask, [L[i], L[i + 1]])[0], lv = top - i;
          if (poly) made.push({ id: 'p' + lv + '-' + stamp + i, nivel: lv, nombre: 'Piso ' + lv, poly: poly, planta: (S.plantas[0] || {}).id || '' });
        }
        guide = null; ed.guide(null);
        S.pisos = S.pisos.concat(made); band.nivel = top + 1;
        ed.set(S.pisos); changed(); sideFachada();
      });
    }

    /* ---------- planta ---------- */
    function renderPlanta(pl) {
      if (!pl) { tab = 'fachada'; return render(); }
      if (!pl.img) {
        main.appendChild(dropZone('<b style="color:#f1ede4">Sube la planta arquitectónica: ' + esc(pl.nombre) + '</b><br>Imagen limpia de la planta (JPG/PNG). Exporta desde Revit/AutoCAD a imagen o usa la planta comercial amoblada.', 'image/*', function (f) {
          up(f, 'planta-' + pl.id).then(function (p) { pl.img = p; changed(); render(); }).catch(alert);
        }));
      } else {
        var box = document.createElement('div'); main.appendChild(box);
        ed = SR.editor(box, {
          src: img(pl.img), shapes: pl.aptos,
          label: function (a) { return 'Apto ' + String(a.n).padStart(2, '0') + (a.precio ? ' · ' + Math.round(a.precio / 1e6) + ' M' : ''); },
          create: function (poly) {
            var n = pl.aptos.reduce(function (m, a) { return Math.max(m, +a.n || 0); }, 0) + 1;
            var last = pl.aptos[pl.aptos.length - 1] || {};
            return { n: n, poly: poly, area: last.area || 60, alcobas: last.alcobas || 2, banos: last.banos || 2, precio: last.precio || 0, render: '' };
          },
          onChange: function (sh) { pl.aptos = sh; changed(); sidePlanta(pl); },
          onSelect: function (s) { sel = s; sidePlanta(pl); }
        });
      }
      sidePlanta(pl);
    }
    function sidePlanta(pl) {
      var usan = S.pisos.slice().sort(function (a, b) { return a.nivel - b.nivel; });
      var html = '<div class="zn-box"><h4>Planta</h4><label>Nombre<input data-p="nombre" value="' + esc(pl.nombre) + '"></label>' +
        '<label>Pisos que usan esta planta</label><div class="chips">' + (usan.length ? usan.map(function (p) { return '<label><input type="checkbox" data-piso="' + p.id + '"' + (p.planta === pl.id ? ' checked' : '') + '>' + esc(p.nivel) + '</label>'; }).join('') : '<span class="help">Primero marca los pisos en el render.</span>') + '</div>' +
        (usan.length ? '<div style="display:flex;gap:6px"><button class="b" data-act="all">Todos</button><button class="b" data-act="none">Ninguno</button></div>' : '') +
        campoRec('planta', pl.recorrido, 'Recorrido 3D de esta planta (todos sus aptos)') + '</div>';
      html += '<div class="zn-box"><h4>' + pl.aptos.length + ' apartamentos</h4>';
      if (sel && pl.aptos.indexOf(sel) >= 0) {
        html += '<div class="row"><label>Número<input type="number" min="1" data-a="n" value="' + esc(sel.n) + '"></label><label>Área m²<input type="number" data-a="area" value="' + esc(sel.area) + '"></label></div>' +
          '<div class="row"><label>Alcobas<input type="number" data-a="alcobas" value="' + esc(sel.alcobas) + '"></label><label>Baños<input type="number" data-a="banos" value="' + esc(sel.banos) + '"></label></div>' +
          '<label>Precio base (piso más bajo)<input type="number" step="1000000" data-a="precio" value="' + esc(sel.precio) + '"></label>' +
          '<label>Render interior (opcional)</label><div style="display:flex;gap:6px;align-items:center">' + (sel.render ? '<img src="' + esc(img(sel.render)) + '" style="width:70px;height:44px;object-fit:cover;border-radius:6px">' : '') + '<button class="b" data-act="render">' + (sel.render ? 'Cambiar' : 'Subir render') + '</button>' + (sel.render ? '<button class="b red" data-act="norender">Quitar</button>' : '') + '</div>' +
          campoRec('apto', sel.recorrido, 'Recorrido 3D de este apto') +
          '<button class="b red" data-act="del">Borrar este apartamento</button>';
      } else html += '<p class="help">' + (pl.img ? 'Dibuja cada apartamento sobre la planta (arrastra o haz clics). Luego selecciónalo para poner área, alcobas, baños y precio.' : 'Sube la imagen de la planta.') + '</p>';
      html += '<div style="display:flex;gap:6px;flex-wrap:wrap">' + (pl.img ? '<button class="b" data-act="img">Cambiar imagen</button>' : '') + '<button class="b red" data-act="drop">Eliminar planta</button></div></div>';
      side.innerHTML = html;
      side.querySelector('[data-p]').onchange = function (e) { pl.nombre = e.target.value; changed(); drawTabs(); };
      side.querySelectorAll('[data-piso]').forEach(function (c) {
        c.onchange = function () { var p = S.pisos.filter(function (x) { return x.id === c.dataset.piso; })[0]; p.planta = c.checked ? pl.id : (p.planta === pl.id ? '' : p.planta); changed(); };
      });
      side.querySelectorAll('[data-a]').forEach(function (i) { i.onchange = function () { sel[i.dataset.a] = +i.value; changed(); ed && ed.redraw(); }; });
      act('all', function () { S.pisos.forEach(function (p) { p.planta = pl.id; }); changed(); sidePlanta(pl); });
      act('none', function () { S.pisos.forEach(function (p) { if (p.planta === pl.id) p.planta = ''; }); changed(); sidePlanta(pl); });
      act('del', function () { ed.remove(sel); });
      act('render', function () { pick('image/*', function (f) { up(f, 'render-' + pl.id + '-' + sel.n).then(function (p) { sel.render = p; changed(); sidePlanta(pl); }).catch(alert); }); });
      act('norender', function () { sel.render = ''; changed(); sidePlanta(pl); });
      side.querySelectorAll('[data-rec]').forEach(function (i) {
        var obj = i.dataset.rec === 'planta' ? pl : sel;
        i.onchange = function () { obj.recorrido = i.value.trim(); changed(); sidePlanta(pl); };
      });
      side.querySelectorAll('[data-recup]').forEach(function (b) {
        var esPl = b.dataset.recup === 'planta';
        b.onclick = function () {
          pick('.glb,.gltf,.ifc,.obj,.fbx', function (f) {
            if (f.size > 100 * 1024 * 1024) { alert('El modelo pasa de 100 MB. Exporta solo el apartamento o una versión GLB más liviana.'); return; }
            up(f, 'modelo-' + pl.id + (esPl ? '' : '-' + sel.n)).then(function (path) { (esPl ? pl : sel).recorrido = path; changed(); sidePlanta(pl); }).catch(alert);
          });
        };
      });
      side.querySelectorAll('[data-recx]').forEach(function (b) { b.onclick = function () { (b.dataset.recx === 'planta' ? pl : sel).recorrido = ''; changed(); sidePlanta(pl); }; });
      act('img', function () { pick('image/*', function (f) { up(f, 'planta-' + pl.id).then(function (p) { pl.img = p; changed(); ed.src(img(p)); }).catch(alert); }); });
      act('drop', function () {
        if (!confirm('¿Eliminar la planta "' + pl.nombre + '" y sus apartamentos?')) return;
        S.plantas = S.plantas.filter(function (x) { return x !== pl; });
        S.pisos.forEach(function (p) { if (p.planta === pl.id) p.planta = ''; });
        tab = 'fachada'; sel = null; changed(); render();
      });
    }
    /* recorrido 3D: link de una página publicada o de un modelo (.glb/.ifc), o el modelo subido aquí */
    function campoRec(cual, v, titulo) {
      var esModelo = /\.(ifc|glb|gltf|obj|fbx)(\?|#|$)/i.test(v || '');
      return '<label style="margin-top:8px">' + titulo + '<input data-rec="' + cual + '" placeholder="https://… (página o modelo .glb/.ifc)" value="' + esc(v || '') + '"></label>' +
        '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' + (o.upload ? '<button class="b" data-recup="' + cual + '">Subir modelo 3D</button>' : '') +
        (v ? '<button class="b red" data-recx="' + cual + '">Quitar</button>' : '') + '</div>' +
        '<p class="help">' + (v ? (esModelo ? 'Se abre en el visor 3D con chat y cita.' : 'Se abre esa página encima de la sala.') : (cual === 'apto' ? 'Vacío = usa el de la planta' + (cual === 'apto' ? ' o la app 3D del edificio' : '') + '.' : 'Vacío = la app 3D del edificio (con el IFC si lo tiene).')) + '</p>';
    }
    function act(name, fn) { var b = side.querySelector('[data-act=' + name + ']'); if (b) b.onclick = fn; }

    render();
    return { render: render, tab: function (t) { tab = t; sel = null; render(); } };
  }

  window.SR.zonas = zonas;
})();
