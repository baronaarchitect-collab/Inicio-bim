/*!
 * Life City · Kit de la sala de ventas virtual
 * --------------------------------------------
 * Lo usan la Sales App (visor/sala-ventas.html) y la página de descarga
 * (visor/implementacion-lista.html):
 *   LCKit.genUnits(espacios)        → unidades a partir de los espacios y precios promedio
 *   LCKit.viewer(el, opts)          → visor 3D (modelo subido o torre generada con las unidades)
 *   LCKit.save(pedido, file)        → guarda el pedido (localStorage) y el modelo 3D (IndexedDB)
 *   LCKit.load()                    → Promise<{pedido, model}>
 *   LCKit.buildZip(pedido, model)   → Promise<Blob> con el instalador (sitio + dashboard + tutoriales)
 * Requiere THREE (r147, con GLTFLoader, OBJLoader y OrbitControls) para el visor y JSZip para el instalador.
 */
(function () {
  'use strict';

  var CDN = {
    three: 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
    gltf: 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js',
    obj: 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/OBJLoader.js',
    orbit: 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js'
  };

  var ESPACIOS = {
    locales: { n: 'Locales comerciales', p: 'L', area: 45, cant: 6, precio: 380, suelo: true },
    apartamentos: { n: 'Apartamentos', p: 'A', area: 68, cant: 40, precio: 420 },
    apartaestudios: { n: 'Apartaestudios', p: 'E', area: 34, cant: 24, precio: 260 },
    oficinas: { n: 'Oficinas', p: 'O', area: 52, cant: 12, precio: 340 },
    casas: { n: 'Casas', p: 'C', area: 140, cant: 10, precio: 780, suelo: true },
    lotes: { n: 'Lotes', p: 'T', area: 300, cant: 12, precio: 220, suelo: true },
    parqueaderos: { n: 'Parqueaderos', p: 'P', area: 12, cant: 30, precio: 35, suelo: true },
    bodegas: { n: 'Bodegas', p: 'B', area: 6, cant: 20, precio: 18, suelo: true }
  };
  var COLOR = { disponible: 0x2f9e5f, reservado: 0xd39b2a, vendido: 0x9a948d };

  /* Genera las unidades: los espacios de primer piso (locales, casas, lotes, parqueaderos, bodegas) van al piso 1;
     los demás suben por la torre con 4 unidades por piso. El precio varía ±7 % alrededor del promedio. */
  function genUnits(espacios) {
    var out = [], piso = 1, slot = 0, suelo = [], alto = [];
    espacios.forEach(function (e) { (ESPACIOS[e.id] && ESPACIOS[e.id].suelo ? suelo : alto).push(e); });
    suelo.forEach(function (e) {
      for (var i = 0; i < e.cant; i++) out.push(unit(e, i, 1, i + 1));
    });
    if (suelo.length) piso = 2;
    alto.forEach(function (e) {
      for (var i = 0; i < e.cant; i++) {
        out.push(unit(e, i, piso, slot + 1));
        slot++;
        if (slot === 4) { slot = 0; piso++; }
      }
    });
    return out;
    function unit(e, i, p, n) {
      var meta = ESPACIOS[e.id] || { p: 'U' };
      var k = 0.93 + 0.14 * ((i * 5) % 7) / 6 + (p > 1 ? Math.min(0.06, p * 0.004) : 0);
      return {
        id: meta.p + '-' + (meta.suelo ? (100 + n) : (p * 100 + n)),
        tipo: e.id, piso: p, area: Math.round(e.area * (0.95 + 0.1 * ((i * 3) % 5) / 4)),
        precio: Math.round(e.precio * k), estado: 'disponible'
      };
    }
  }

  /* Visor 3D. opts: {units, modelUrl, modelExt, onPick(unit), height} */
  function viewer(el, opts) {
    var THREE = window.THREE;
    if (!THREE) { el.innerHTML = '<p style="padding:20px;font:14px sans-serif;color:#88a890">El visor 3D no pudo cargar. Revisa tu conexión.</p>'; return null; }
    var w = el.clientWidth || 600, h = opts.height || Math.max(320, Math.round(w * 0.62));
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    renderer.outputEncoding = THREE.sRGBEncoding;
    el.innerHTML = ''; el.appendChild(renderer.domElement);
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(40, w / h, 0.1, 5000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 0.9));
    var sun = new THREE.DirectionalLight(0xfff2dd, 0.9); sun.position.set(30, 60, 40); scene.add(sun);
    var controls = THREE.OrbitControls ? new THREE.OrbitControls(cam, renderer.domElement) : null;
    if (controls) { controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 0.6; }
    var boxes = [], group = new THREE.Group(); scene.add(group);
    var ground = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshLambertMaterial({ color: 0x9fb3a3 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);

    function frame(obj) {
      var box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      var r = Math.max(size.x, size.y, size.z) || 10;
      ground.position.set(c.x, box.min.y - 0.01, c.z); ground.scale.setScalar(r * 0.9);
      cam.position.set(c.x + r * 1.3, c.y + r * 0.7, c.z + r * 1.5); cam.near = r / 200; cam.far = r * 50; cam.updateProjectionMatrix();
      if (controls) { controls.target.copy(c); controls.update(); } else cam.lookAt(c);
    }
    function tower(units) {
      while (group.children.length) group.remove(group.children[0]);
      boxes = [];
      var floors = {};
      units.forEach(function (u) { (floors[u.piso] = floors[u.piso] || []).push(u); });
      var maxPer = 4; Object.keys(floors).forEach(function (p) { maxPer = Math.max(maxPer, floors[p].length > 8 ? 8 : floors[p].length); });
      var W = 4.2, D = 9, H = 3, gap = 0.25;
      var core = new THREE.Mesh(new THREE.BoxGeometry(maxPer * W + 0.6, Object.keys(floors).length * H + 0.4, D + 0.6), new THREE.MeshLambertMaterial({ color: 0xf2f4ef }));
      core.position.set(0, (Object.keys(floors).length * H) / 2, 0); group.add(core);
      Object.keys(floors).sort(function (a, b) { return a - b; }).forEach(function (p, fi) {
        floors[p].forEach(function (u, i) {
          var row = Math.floor(i / maxPer), col = i % maxPer;
          var m = new THREE.Mesh(new THREE.BoxGeometry(W - gap, H - gap, 1.2), new THREE.MeshLambertMaterial({ color: COLOR[u.estado] || COLOR.disponible }));
          m.position.set((col - (maxPer - 1) / 2) * W, fi * H + H / 2 + 0.2, D / 2 + 0.4 + row * 1.25);
          m.userData.u = u; group.add(m); boxes.push(m);
        });
      });
      frame(group);
    }
    function loadModel(url, ext) {
      var done = function (obj) {
        while (group.children.length) group.remove(group.children[0]);
        boxes = [];
        group.add(obj); frame(obj);
        if (opts.onModel) opts.onModel(true);
      };
      var fail = function () { tower(opts.units || []); if (opts.onModel) opts.onModel(false); };
      try {
        if ((ext === 'glb' || ext === 'gltf') && THREE.GLTFLoader) new THREE.GLTFLoader().load(url, function (g) { done(g.scene); }, null, fail);
        else if (ext === 'obj' && THREE.OBJLoader) new THREE.OBJLoader().load(url, function (o) {
          o.traverse(function (n) { if (n.isMesh) n.material = new THREE.MeshLambertMaterial({ color: 0xe8e4dc }); }); done(o);
        }, null, fail);
        else fail();
      } catch (e) { fail(); }
    }
    if (opts.modelUrl) loadModel(opts.modelUrl, opts.modelExt); else tower(opts.units || []);

    var ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), down = null;
    renderer.domElement.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; if (controls) controls.autoRotate = false; });
    renderer.domElement.addEventListener('pointerup', function (e) {
      if (!down || Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) > 6 || !boxes.length) return;
      var r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mouse, cam);
      var hit = ray.intersectObjects(boxes)[0];
      if (hit && opts.onPick) opts.onPick(hit.object.userData.u);
    });
    var alive = true;
    (function loop() { if (!alive) return; if (controls) controls.update(); renderer.render(scene, cam); requestAnimationFrame(loop); })();
    function resize() { var nw = el.clientWidth; if (!nw) return; var nh = opts.height || Math.max(320, Math.round(nw * 0.62)); renderer.setSize(nw, nh); cam.aspect = nw / nh; cam.updateProjectionMatrix(); }
    window.addEventListener('resize', resize);
    return {
      setUnits: function (u) { opts.units = u; if (!opts.modelUrl) tower(u); },
      highlight: function (id) { boxes.forEach(function (b) { b.material.emissive && b.material.emissive.setHex(b.userData.u.id === id ? 0x664400 : 0); }); },
      destroy: function () { alive = false; window.removeEventListener('resize', resize); renderer.dispose(); }
    };
  }

  /* ---------- guardar / cargar el pedido ---------- */
  var KEY = 'lc-sala-implementacion';
  function idb(fn) {
    return new Promise(function (res) {
      try {
        var rq = indexedDB.open('lc-sala', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('files'); };
        rq.onsuccess = function () { fn(rq.result, res); };
        rq.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  function save(pedido, file) {
    try { localStorage.setItem(KEY, JSON.stringify(pedido)); } catch (e) {}
    return idb(function (db, res) {
      var tx = db.transaction('files', 'readwrite');
      if (file) tx.objectStore('files').put({ name: file.name, blob: file }, 'modelo'); else tx.objectStore('files').delete('modelo');
      tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); };
    });
  }
  function load() {
    var pedido = null;
    try { pedido = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    return idb(function (db, res) {
      var rq = db.transaction('files').objectStore('files').get('modelo');
      rq.onsuccess = function () { res(rq.result || null); }; rq.onerror = function () { res(null); };
    }).then(function (model) { return { pedido: pedido, model: model }; });
  }

  function slug(s) { return String(s || 'proyecto').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto'; }

  /* ---------- instalador ---------- */
  function buildZip(pedido, model) {
    if (!window.JSZip) return Promise.reject(new Error('JSZip no cargó'));
    var zip = new window.JSZip(), name = slug(pedido.proyecto) + '-sala-virtual';
    var root = zip.folder(name), site = root.folder('sitio');
    var datos = Object.assign({}, pedido, { modelo: model ? { archivo: 'modelo.' + ext(model.name), ext: ext(model.name) } : null });
    site.file('datos.js', 'window.SALA = ' + JSON.stringify(datos, null, 2) + ';\n');
    site.file('visor.js', '/* Visor 3D de la sala virtual · Life City */\nwindow.LCViewer = ' + viewer.toString() + ';\nvar COLOR = ' + JSON.stringify(COLOR) + ';\nwindow.LC_ESPACIOS = ' + JSON.stringify(ESPACIOS) + ';\n');
    site.file('index.html', SITE_HTML);
    site.file('dashboard.html', DASH_HTML);
    if (model && model.blob) site.file('modelo.' + ext(model.name), model.blob);
    root.file('ABRIR-DASHBOARD.html', '<!doctype html><meta charset="utf-8"><title>Dashboard · ' + esc(pedido.proyecto) + '</title><meta http-equiv="refresh" content="0;url=sitio/dashboard.html"><p style="font:16px sans-serif">Abriendo el dashboard… si no abre, <a href="sitio/dashboard.html">toca aquí</a>.</p>');
    root.file('LEEME.txt', leeme(pedido, name));
    return zip.generateAsync({ type: 'blob' }).then(function (blob) { return { blob: blob, filename: name + '.zip' }; });
  }
  function ext(n) { return String(n || '').split('.').pop().toLowerCase(); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function leeme(p, name) {
    return [
      'SALA DE VENTAS VIRTUAL · ' + (p.proyecto || '').toUpperCase(),
      'Implementación de Life City BIM Management Hub para ' + (p.empresa || ''),
      '',
      '1. Descomprime este archivo.',
      '2. Abre ABRIR-DASHBOARD.html (doble clic). Es el acceso directo a tu dashboard:',
      '   - Unidades: dale el valor y el estado a cada unidad.',
      '   - Tutoriales: busca tu pregunta (precios, WhatsApp, modelo 3D, dominio).',
      '   - Publicar: instrucciones para lanzarla en tu propio dominio.',
      '3. Cuando cambies precios, toca "Descargar datos.js" y reemplaza sitio/datos.js.',
      '4. Para publicar, sube la carpeta "sitio" a Netlify, GitHub Pages o tu hosting.',
      '',
      'Soporte: WhatsApp +57 317 337 1577 · proyectos@lifecity.com.co',
      'Carpeta: ' + name
    ].join('\r\n');
  }

  /* ===== Plantilla del sitio para compradores (sitio/index.html) ===== */
  var SITE_HTML = '<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sala de ventas virtual</title>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Source+Sans+3:wght@400;600;700&display=swap">\n' +
    '<style>:root{--bg:#f3f5f1;--s:#fff;--l:#d3ddd2;--ink:#13201a;--soft:#33463a;--mu:#64786a;--g:#2e5c3a;--gs:#dbeadd;--gold:#b8963e;--sky:#dcebf2}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 "Source Sans 3",system-ui,sans-serif}' +
    '.w{max-width:1100px;margin:0 auto;padding:0 16px}h1,h2,h3{font-family:"Barlow Condensed",sans-serif;text-transform:uppercase;margin:0;line-height:1}h1{font-size:clamp(38px,6vw,64px)}h2{font-size:30px}' +
    'header{padding:18px 0;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.k{font:600 12px monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}' +
    '.grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:16px;align-items:start}.card{background:var(--s);border:1px solid var(--l);border-radius:10px;padding:14px;min-width:0}#v{border-radius:10px;overflow:hidden;background:linear-gradient(#e3ece4,#f6f8f4);border:1px solid var(--l);min-height:320px}' +
    '.tabs{display:flex;flex-wrap:wrap;gap:6px}.tabs button,.btn{border:1.5px solid var(--l);background:var(--s);border-radius:99px;padding:7px 12px;font:700 14px inherit;cursor:pointer}.tabs button[aria-pressed=true]{background:var(--g);color:#fff;border-color:var(--g)}' +
    '.list{display:flex;flex-direction:column;gap:6px;max-height:380px;overflow:auto;margin-top:10px}.u{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1.5px solid var(--l);border-radius:8px;padding:8px 10px;background:var(--s);cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%}.u[aria-pressed=true]{border-color:var(--gold)}' +
    '.u b{font-family:monospace}.u small{color:var(--mu)}.pill{font-size:11.5px;font-weight:700;border-radius:99px;padding:2px 8px}.disponible{background:#e0f0e6;color:#2f7d4f}.reservado{background:#f8ecd2;color:#9a6a10}.vendido{background:#eee;color:#888}' +
    '.btn.p{background:var(--g);color:#fff;border-color:var(--g);border-radius:6px;font-family:"Barlow Condensed",sans-serif;font-size:18px;text-transform:uppercase;letter-spacing:.05em}.f{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:700;color:var(--mu)}.f input,.f select{border:1px solid var(--l);border-radius:8px;padding:10px;font:16px inherit}' +
    '.row{display:flex;flex-wrap:wrap;gap:10px;align-items:end}.bub{background:var(--sky);border-radius:12px 12px 12px 3px;padding:12px;margin-top:10px}footer{padding:24px 0;color:var(--mu);font-size:13px}@media(max-width:820px){.grid{grid-template-columns:1fr}}</style>\n' +
    '<script src="' + CDN.three + '"><\/script><script src="' + CDN.gltf + '"><\/script><script src="' + CDN.obj + '"><\/script><script src="' + CDN.orbit + '"><\/script>\n' +
    '<script src="datos.js"><\/script><script src="visor.js"><\/script></head><body><div class="w">\n' +
    '<header><div><span class="k" id="emp"></span><h1 id="proj"></h1><p id="sub" style="color:var(--soft);margin:6px 0 0"></p></div><a class="btn p" href="#cita">Agendar visita</a></header>\n' +
    '<div class="grid"><div id="v"></div><div class="card"><h3>Unidades</h3><div class="tabs" id="tabs"></div><div class="list" id="list"></div></div></div>\n' +
    '<section class="card" style="margin-top:16px" id="cita"><span class="k">Encuentra tu unidad</span><h2 style="margin:6px 0 10px">Cuéntanos qué buscas</h2>' +
    '<div class="row"><label class="f">Tipo<select id="q-t"></select></label><label class="f">Presupuesto (millones)<input id="q-p" type="number" inputmode="numeric" value="450"></label><label class="f">Nombre<input id="q-n" autocomplete="name"></label><label class="f">WhatsApp<input id="q-w" type="tel" autocomplete="tel"></label><button class="btn p" id="q-go" type="button">Ver mi recomendación</button></div><div id="q-r"></div></section>\n' +
    '<footer>Sala de ventas virtual · implementación de Life City BIM Management Hub</footer></div>\n' +
    '<script>(function(){var D=window.SALA;try{var o=JSON.parse(localStorage.getItem("lc-sala-datos:"+D.slug)||"null");if(o&&o.unidades)D.unidades=o.unidades}catch(e){}\n' +
    'var E=window.LC_ESPACIOS,$=function(i){return document.getElementById(i)},cop=function(m){return "$"+Number(m).toLocaleString("es-CO")+" M"},sel=null,tipo="todos";\n' +
    '$("emp").textContent=D.empresa;$("proj").textContent=D.proyecto;$("sub").textContent=(D.ciudad?D.ciudad+" · ":"")+D.unidades.length+" unidades · "+D.negocioN;\n' +
    'var V=LCViewer($("v"),{units:D.unidades,modelUrl:D.modelo?D.modelo.archivo:null,modelExt:D.modelo?D.modelo.ext:null,onPick:function(u){pick(u.id)}});\n' +
    'var tipos=["todos"].concat(D.espacios.map(function(e){return e.id}));$("tabs").innerHTML=tipos.map(function(t){return "<button type=button data-t="+t+" aria-pressed="+(t===tipo)+">"+(t==="todos"?"Todas":E[t].n)+"</button>"}).join("");\n' +
    '$("tabs").onclick=function(e){var b=e.target.closest("button");if(!b)return;tipo=b.dataset.t;[].forEach.call($("tabs").children,function(x){x.setAttribute("aria-pressed",x===b)});list()};\n' +
    '$("q-t").innerHTML=D.espacios.map(function(e){return "<option value="+e.id+">"+E[e.id].n+"</option>"}).join("");\n' +
    'function list(){$("list").innerHTML=D.unidades.filter(function(u){return tipo==="todos"||u.tipo===tipo}).map(function(u){return "<button type=button class=u data-id="+u.id+" aria-pressed="+(u.id===sel)+"><b>"+u.id+"</b><span>"+E[u.tipo].n+" · "+u.area+" m²<br><small>Piso "+u.piso+" · "+cop(u.precio)+"</small></span><span class=\\"pill "+u.estado+"\\">"+u.estado+"</span></button>"}).join("")}\n' +
    '$("list").onclick=function(e){var b=e.target.closest(".u");if(b)pick(b.dataset.id)};function pick(id){sel=id;V&&V.highlight(id);list()}list();\n' +
    'var R={planos:" está disponible en preventa: comprando sobre planos aseguras el precio de hoy",inmediata:" tiene entrega inmediata: puedes visitarla y estrenarla este mes",colaborativa:" te permite entrar como inversionista desde "+cop(D.ticket||50)+" con una rentabilidad estimada de "+(D.rentab||12)+" % anual",renta:" está disponible para arriendo desde el próximo mes"};\n' +
    '$("q-go").onclick=function(){var t=$("q-t").value,p=+$("q-p").value||0,n=$("q-n").value.trim()||"Hola",w=$("q-w").value.trim();var c=D.unidades.filter(function(u){return u.tipo===t&&u.estado==="disponible"&&u.precio<=p*1.05}).sort(function(a,b){return b.precio-a.precio}).slice(0,3);\n' +
    'if(!c.length){$("q-r").innerHTML="<div class=bub>"+n.split(" ")[0]+", no tenemos "+E[t].n.toLowerCase()+" disponibles en ese presupuesto. Un asesor te muestra opciones cercanas.</div>";return}pick(c[0].id);\n' +
    'var msg=n.split(" ")[0]+", la unidad "+c[0].id+" de "+c[0].area+" m² ("+cop(c[0].precio)+")"+R[D.negocio]+". ¿Te agendamos una visita esta semana?";var txt="Hola, soy "+n+(w?" ("+w+")":"")+". Me interesa la unidad "+c[0].id+" de "+D.proyecto+". "+(c.length>1?"También vi: "+c.slice(1).map(function(u){return u.id}).join(", ")+".":"");\n' +
    '$("q-r").innerHTML="<div class=bub>"+msg+"</div><p><a class=\\"btn p\\" target=_blank rel=noopener href=\\"https://wa.me/"+D.whatsapp+"?text="+encodeURIComponent(txt)+"\\">Agendar por WhatsApp</a></p>"};})();<\/script></body></html>\n';

  /* ===== Plantilla del dashboard (sitio/dashboard.html) ===== */
  var TUTORIALES = [
    ['Cambiar el precio de una unidad', 'En Unidades, escribe el nuevo valor en millones en la columna Precio. Toca Guardar cambios y luego Descargar datos.js. Reemplaza el archivo sitio/datos.js y vuelve a subir la carpeta sitio a tu hosting.'],
    ['Subir o bajar los precios de un tipo de espacio', 'En Unidades, elige el tipo (por ejemplo Apartamentos), escribe el porcentaje (5 o -3) y toca Aplicar. Todas las unidades de ese tipo cambian a la vez.'],
    ['Marcar una unidad como reservada o vendida', 'En la columna Estado elige reservado o vendido. En el sitio la unidad cambia de color en el 3D y deja de aparecer en las recomendaciones.'],
    ['Cambiar el WhatsApp que recibe los clientes', 'En Proyecto, cambia el número con indicativo (57 para Colombia, sin el +). Guarda y descarga datos.js.'],
    ['Cambiar el modelo 3D', 'Exporta el modelo en formato .glb (recomendado) u .obj. Ponlo en la carpeta sitio con el nombre modelo.glb y, en Proyecto, escribe modelo.glb en Archivo del modelo. Si tu modelo está en Revit, Unreal o 3ds Max, escríbenos y lo convertimos.'],
    ['Ver el sitio antes de publicarlo', 'Abre sitio/index.html con Chrome. Los cambios guardados en este dashboard se ven en ese mismo navegador. En tu computador el visor muestra la torre con tus unidades; tu modelo 3D aparece cuando el sitio ya está publicado.'],
    ['Publicar en Netlify (gratis)', 'Entra a app.netlify.com/drop y arrastra la carpeta sitio. En segundos tienes un link .netlify.app. Para actualizar, vuelve a arrastrar la carpeta en Deploys.'],
    ['Conectar mi propio dominio', 'En Netlify: Domain management → Add a domain. En tu proveedor del dominio crea un registro CNAME de www hacia tu-sitio.netlify.app y un registro A del dominio raíz hacia 75.2.60.5. El certificado HTTPS se activa solo.'],
    ['Publicar en mi hosting (cPanel, Hostinger)', 'Sube el contenido de la carpeta sitio a public_html (o a una subcarpeta como /sala). Debe quedar index.html en la raíz de esa carpeta.'],
    ['Poner el link en Instagram y en la pauta', 'Usa el link de tu dominio en la bio, en los botones de los anuncios y en el código QR de la sala física.']
  ];
  var DASH_HTML = '<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard · Sala virtual</title>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Source+Sans+3:wght@400;600;700&display=swap">\n' +
    '<style>:root{--bg:#0c110e;--s:#16211a;--s2:#1c2a20;--l:#26382b;--fg:#eef4ef;--soft:#c9dccd;--mu:#88a890;--g:#5fae74;--gold:#d4ae5a}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 "Source Sans 3",system-ui,sans-serif}' +
    '.w{max-width:1100px;margin:0 auto;padding:0 16px 40px}h1,h2,h3{font-family:"Barlow Condensed",sans-serif;text-transform:uppercase;margin:0;line-height:1}h1{font-size:40px}h2{font-size:26px}header{padding:18px 0;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center}' +
    '.k{font:600 11.5px monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--g)}nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}nav button,.b{border:1.5px solid var(--l);background:var(--s);color:var(--fg);border-radius:6px;padding:8px 12px;font:700 14px inherit;cursor:pointer;text-decoration:none;display:inline-flex}nav button[aria-pressed=true]{background:var(--gold);color:#16130a;border-color:var(--gold)}' +
    '.b.p{background:var(--gold);color:#16130a;border-color:var(--gold)}.card{background:var(--s);border:1px solid var(--l);border-radius:10px;padding:14px;margin-bottom:12px}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}.stats div{background:var(--s);border:1px solid var(--l);border-radius:10px;padding:12px}.stats b{display:block;font:800 28px "Barlow Condensed",sans-serif;color:var(--gold)}.stats span{font-size:13px;color:var(--mu)}' +
    '.tw{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:620px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--l)}th{font:600 11px monospace;text-transform:uppercase;color:var(--mu)}td input,td select,.f input,.f select{background:var(--s2);color:var(--fg);border:1px solid var(--l);border-radius:6px;padding:6px 8px;font:15px inherit;width:100%}' +
    '.row{display:flex;flex-wrap:wrap;gap:8px;align-items:end}.f{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--mu);font-weight:700}details{background:var(--s);border:1px solid var(--l);border-radius:8px;padding:10px 12px;margin-bottom:8px}summary{font-weight:700;cursor:pointer}details p{color:var(--soft)}' +
    'ol li{margin-bottom:8px;color:var(--soft)}code{background:var(--s2);padding:1px 5px;border-radius:4px}.ok{color:var(--g);font-weight:700}@media(max-width:700px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}</style>\n' +
    '<script src="datos.js"><\/script></head><body><div class="w">\n' +
    '<header><div><span class="k">Dashboard · <span id="emp"></span></span><h1 id="proj"></h1></div><div class="row"><a class="b" href="index.html" target="_blank">Ver el sitio ↗</a><button class="b p" id="dl" type="button">Descargar datos.js</button></div></header>\n' +
    '<nav id="nav"><button data-t="u" aria-pressed="true">Unidades</button><button data-t="p">Proyecto</button><button data-t="t">Tutoriales</button><button data-t="d">Publicar en tu dominio</button></nav>\n' +
    '<section id="t-u"><div class="stats" id="stats"></div><div class="card"><div class="row"><label class="f">Tipo<select id="b-t"></select></label><label class="f">Ajuste %<input id="b-p" type="number" value="5" style="width:90px"></label><button class="b" id="b-go" type="button">Aplicar</button><span id="saved" class="ok"></span><button class="b p" id="save" type="button" style="margin-left:auto">Guardar cambios</button></div></div>' +
    '<div class="card tw"><table><thead><tr><th>Unidad</th><th>Tipo</th><th>Piso</th><th>Área m²</th><th>Precio (millones)</th><th>Estado</th></tr></thead><tbody id="rows"></tbody></table></div></section>\n' +
    '<section id="t-p" hidden><div class="card"><div class="row"><label class="f">Proyecto<input id="p-n"></label><label class="f">WhatsApp de ventas<input id="p-w"></label><label class="f">Archivo del modelo<input id="p-m" placeholder="modelo.glb"></label></div><p style="color:var(--mu)">Guarda en Unidades y descarga datos.js para aplicar los cambios.</p></div></section>\n' +
    '<section id="t-t" hidden><div class="card"><label class="f">¿Qué necesitas hacer?<input id="t-q" placeholder="Ej. cambiar precio, dominio, WhatsApp"></label></div><div id="tuts"></div><div class="card">¿No encuentras tu respuesta? <a class="b p" id="t-wa" target="_blank" rel="noopener">Pregúntanos por WhatsApp</a></div></section>\n' +
    '<section id="t-d" hidden><div class="card"><h2>Lanza tu sala en tu propio dominio</h2><ol style="margin-top:12px">' +
    '<li>Guarda tus precios y toca <b>Descargar datos.js</b>. Reemplaza el archivo <code>sitio/datos.js</code>.</li>' +
    '<li>Entra a <b>app.netlify.com/drop</b> y arrastra la carpeta <code>sitio</code>. Netlify te da un link <code>.netlify.app</code> en segundos.</li>' +
    '<li>En Netlify ve a <b>Domain management → Add a domain</b> y escribe tu dominio (por ejemplo <code>sala.tuproyecto.com</code>).</li>' +
    '<li>En tu proveedor del dominio (GoDaddy, Hostinger, Cloudflare) crea un registro <b>CNAME</b> de <code>sala</code> o <code>www</code> hacia <code>tu-sitio.netlify.app</code>. Para el dominio raíz, un registro <b>A</b> hacia <code>75.2.60.5</code>.</li>' +
    '<li>Espera la propagación (de minutos a 24 horas). Netlify activa el HTTPS solo.</li>' +
    '<li>Pon el link en Instagram, en la pauta y en un QR de la sala física.</li></ol>' +
    '<p style="color:var(--mu)">¿Prefieres hosting propio? Sube el contenido de <code>sitio</code> a <code>public_html</code> por cPanel o FTP.</p></div></section>\n' +
    '</div><script>(function(){var D=window.SALA,KEY="lc-sala-datos:"+D.slug,$=function(i){return document.getElementById(i)};try{var o=JSON.parse(localStorage.getItem(KEY)||"null");if(o){if(o.unidades)D.unidades=o.unidades;if(o.proyecto)D.proyecto=o.proyecto;if(o.whatsapp)D.whatsapp=o.whatsapp;if("modelo" in o)D.modelo=o.modelo}}catch(e){}\n' +
    'var T=' + JSON.stringify(TUTORIALES) + ',N={};(D.espacios||[]).forEach(function(e){N[e.id]=e.n});\n' +
    '$("emp").textContent=D.empresa;$("proj").textContent=D.proyecto;\n' +
    '$("nav").onclick=function(e){var b=e.target.closest("button");if(!b)return;[].forEach.call($("nav").children,function(x){x.setAttribute("aria-pressed",x===b);$("t-"+x.dataset.t).hidden=x!==b})};\n' +
    'function stats(){var u=D.unidades,d=u.filter(function(x){return x.estado==="disponible"}),v=u.filter(function(x){return x.estado==="vendido"}),tot=u.reduce(function(a,x){return a+(+x.precio||0)},0);$("stats").innerHTML="<div><b>"+u.length+"</b><span>unidades</span></div><div><b>"+d.length+"</b><span>disponibles</span></div><div><b>"+v.length+"</b><span>vendidas</span></div><div><b>$"+Math.round(tot).toLocaleString("es-CO")+" M</b><span>valor del inventario</span></div>"}\n' +
    'function rows(){$("rows").innerHTML=D.unidades.map(function(u,i){return "<tr><td><b>"+u.id+"</b></td><td>"+(N[u.tipo]||u.tipo)+"</td><td>"+u.piso+"</td><td><input type=number data-i="+i+" data-k=area value="+u.area+"></td><td><input type=number data-i="+i+" data-k=precio value="+u.precio+"></td><td><select data-i="+i+" data-k=estado>"+["disponible","reservado","vendido"].map(function(s){return "<option"+(s===u.estado?" selected":"")+">"+s+"</option>"}).join("")+"</select></td></tr>"}).join("");stats()}\n' +
    '$("rows").oninput=function(e){var t=e.target,i=t.dataset.i;if(i==null)return;var k=t.dataset.k;D.unidades[i][k]=k==="estado"?t.value:+t.value;stats();$("saved").textContent=""};\n' +
    '$("b-t").innerHTML=Object.keys(N).map(function(k){return "<option value="+k+">"+N[k]+"</option>"}).join("");$("b-go").onclick=function(){var t=$("b-t").value,p=+$("b-p").value||0;D.unidades.forEach(function(u){if(u.tipo===t)u.precio=Math.round(u.precio*(1+p/100))});rows()};\n' +
    '$("p-n").value=D.proyecto;$("p-w").value=D.whatsapp;$("p-m").value=D.modelo?D.modelo.archivo:"";\n' +
    'function sync(){D.proyecto=$("p-n").value.trim()||D.proyecto;D.whatsapp=$("p-w").value.replace(/\\D/g,"")||D.whatsapp;var m=$("p-m").value.trim();D.modelo=m?{archivo:m,ext:m.split(".").pop().toLowerCase()}:null}\n' +
    '$("save").onclick=function(){sync();try{localStorage.setItem(KEY,JSON.stringify({unidades:D.unidades,proyecto:D.proyecto,whatsapp:D.whatsapp,modelo:D.modelo}));$("saved").textContent="✓ Guardado"}catch(e){$("saved").textContent="Descarga datos.js para guardar"}};\n' +
    '$("dl").onclick=function(){sync();var a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["window.SALA = "+JSON.stringify(D,null,2)+";\\n"],{type:"text/javascript"}));a.download="datos.js";document.body.appendChild(a);a.click();a.remove()};\n' +
    'function tuts(q){q=(q||"").toLowerCase();$("tuts").innerHTML=T.filter(function(t){return !q||(t[0]+" "+t[1]).toLowerCase().indexOf(q)>=0}).map(function(t){return "<details><summary>"+t[0]+"</summary><p>"+t[1]+"</p></details>"}).join("")||"<p>No hay un tutorial para eso todavía.</p>";$("t-wa").href="https://wa.me/573173371577?text="+encodeURIComponent("Hola Life City, tengo una pregunta sobre la sala virtual de "+D.proyecto+": "+(q||""))}\n' +
    '$("t-q").oninput=function(e){tuts(e.target.value)};tuts("");rows();})();<\/script></body></html>\n';

  window.LCKit = { CDN: CDN, ESPACIOS: ESPACIOS, genUnits: genUnits, viewer: viewer, save: save, load: load, buildZip: buildZip, slug: slug };
})();
