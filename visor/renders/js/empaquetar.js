/*!
 * Life City · Empaquetador de la sala de ventas con renders
 *   Proyectos guardados (en este navegador: datos en localStorage, imágenes en IndexedDB por proyecto)
 *   LCPack.loadDraft([id])             → Promise<{S, urls}>  abre un proyecto (por defecto el último abierto)
 *   LCPack.saveDraft(S)                → guarda el proyecto y actualiza la lista
 *   LCPack.list()                      → [{id, proyecto, empresa, pisos, unidades, actualizado}] (más reciente primero)
 *   LCPack.create() · duplicate(id) · remove(id)
 *   LCPack.exportFile(id) → Promise<{blob, filename}> · importFile(file) → Promise<id>   (.sala.zip con JSON + imágenes)
 *   LCPack.thumb(id)                   → Promise<url|null>  render frontal para la lista
 *   LCPack.upload(file, nombre)        → Promise<path>  guarda una imagen del proyecto abierto
 *   LCPack.build(S, {recorridoZip})    → Promise<{blob, filename}>  ZIP listo para publicar
 *   LCPack.pedidoKit(S)                → pedido en el formato del kit 3D (LCKit) para unir el recorrido
 * Requiere sala/showroom.js (SR) y JSZip.
 */
(function () {
  'use strict';
  var IDX = 'lc:renders:proyectos', CUR = 'lc:renders:actual', PRE = 'lc:renders:p:', OLD = 'lc:renders:borrador', BASE = 'sala/';
  var TEMPLATES = ['index.html', 'gracias.html', 'dashboard.html', 'showroom.js', 'showroom.css', 'editor.js', 'zonas.js'];
  var urls = {}, cur = null;

  function ext(f) { var m = /\.([a-z0-9]+)$/i.exec(f.name || ''); return (m ? m[1] : (f.type || '').split('/')[1] || 'jpg').toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg'); }
  function ls(k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { return v === undefined ? null : false; }
  }
  function newId() { return 'sala-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function blank() { return { id: newId(), proyecto: '', empresa: '', ciudad: '', whatsapp: '', moneda: 'COP', separacion: 10, incremento: 0.5, wompi: {}, fachada: {}, pisos: [], plantas: [], unidades: [] }; }
  /* las imágenes de cada proyecto viven en IndexedDB como "<id>:img/…" */
  function key(id, path) { return id + ':' + path; }
  function getImg(id, path) { return SR.db.get(key(id, path)).then(function (b) { return b || SR.db.get(path); }); } // sin prefijo = versión anterior
  function usedImages(S) {
    var out = [];
    if (S.fachada && S.fachada.img) out.push(S.fachada.img);
    (S.plantas || []).forEach(function (p) { if (p.img) out.push(p.img); (p.aptos || []).forEach(function (a) { if (a.render) out.push(a.render); }); });
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  /* ---------- lista de proyectos ---------- */
  function list() { return (ls(IDX) || []).sort(function (a, b) { return b.actualizado - a.actualizado; }); }
  function touch(S) {
    var L = (ls(IDX) || []).filter(function (x) { return x.id !== S.id; });
    L.push({ id: S.id, proyecto: S.proyecto || 'Proyecto sin nombre', empresa: S.empresa || '', pisos: (S.pisos || []).length, unidades: (S.unidades || []).length, actualizado: Date.now() });
    ls(IDX, L);
  }
  function migrate() {
    var old = ls(OLD); if (!old) return;
    old.id = old.id || newId();
    if (!ls(PRE + old.id)) { ls(PRE + old.id, old); touch(old); if (!ls(CUR)) ls(CUR, old.id); }
    ls(OLD, null);
  }

  function loadDraft(id) {
    migrate();
    id = id || ls(CUR) || (list()[0] || {}).id;
    var S = id ? ls(PRE + id) : null;
    if (!S) S = blank();
    cur = S.id; ls(CUR, cur);
    Object.keys(urls).forEach(function (k) { URL.revokeObjectURL(urls[k]); delete urls[k]; });
    return Promise.all(usedImages(S).map(function (p) {
      return getImg(cur, p).then(function (b) { if (b) urls[p] = URL.createObjectURL(b); });
    })).catch(function () {}).then(function () { return { S: S, urls: urls }; });
  }
  function saveDraft(S) {
    S.id = S.id || cur || newId(); cur = S.id;
    var ok = ls(PRE + S.id, S);
    if (ok) { touch(S); ls(CUR, S.id); }
    return ok;
  }
  function create() { var S = blank(); ls(PRE + S.id, S); touch(S); ls(CUR, S.id); return S.id; }
  function copyImgs(from, to, S) {
    return Promise.all(usedImages(S).map(function (p) { return getImg(from, p).then(function (b) { if (b) return SR.db.put(key(to, p), b); }); }));
  }
  function duplicate(id) {
    var S = ls(PRE + id); if (!S) return Promise.reject(new Error('No existe ese proyecto'));
    var D = JSON.parse(JSON.stringify(S)); D.id = newId(); D.proyecto = (S.proyecto || 'Proyecto') + ' (copia)';
    return copyImgs(id, D.id, S).then(function () { ls(PRE + D.id, D); touch(D); return D.id; });
  }
  function remove(id) {
    var S = ls(PRE + id) || {};
    ls(PRE + id, null); ls(IDX, (ls(IDX) || []).filter(function (x) { return x.id !== id; }));
    if (ls(CUR) === id) ls(CUR, null);
    return SR.db.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k.indexOf(id + ':') === 0; }).map(function (k) { return SR.db.del(k); }));
    }).then(function () { return S; });
  }
  function thumb(id) {
    var S = ls(PRE + id); if (!S || !S.fachada || !S.fachada.img) return Promise.resolve(null);
    return getImg(id, S.fachada.img).then(function (b) { return b ? URL.createObjectURL(b) : null; }).catch(function () { return null; });
  }

  /* ---------- archivo .sala.zip para pasar proyectos entre equipos ---------- */
  function exportFile(id) {
    var S = ls(PRE + id); if (!S) return Promise.reject(new Error('No existe ese proyecto'));
    var zip = new JSZip();
    zip.file('proyecto.json', JSON.stringify({ formato: 'lc-sala-renders', version: 1, exportado: new Date().toISOString(), proyecto: S }, null, 1));
    return Promise.all(usedImages(S).map(function (p) { return getImg(id, p).then(function (b) { if (b) zip.file(p, b); }); }))
      .then(function () { return zip.generateAsync({ type: 'blob' }); })
      .then(function (blob) { return { blob: blob, filename: SR.slug(S.proyecto) + '.sala.zip' }; });
  }
  function importFile(file) {
    return JSZip.loadAsync(file).then(function (zip) {
      var j = zip.file('proyecto.json'); if (!j) throw new Error('Ese archivo no es un proyecto de sala de renders');
      return j.async('string').then(function (t) {
        var d = JSON.parse(t), S = d.proyecto;
        if (d.formato !== 'lc-sala-renders' || !S) throw new Error('Ese archivo no es un proyecto de sala de renders');
        if (!S.id || ls(PRE + S.id)) S.id = newId(); // nunca pisa un proyecto que ya está guardado
        return Promise.all(usedImages(S).map(function (p) {
          var f = zip.file(p); return f ? f.async('blob').then(function (b) { return SR.db.put(key(S.id, p), b); }) : null;
        })).then(function () { ls(PRE + S.id, S); touch(S); return S.id; });
      });
    });
  }

  function upload(file, nombre) {
    var path = 'img/' + SR.slug(nombre) + '.' + ext(file);
    return SR.db.put(key(cur, path), file).then(function () {
      if (urls[path]) URL.revokeObjectURL(urls[path]);
      urls[path] = URL.createObjectURL(file);
      return path;
    });
  }
  function img(p) { return urls[p] || p; }

  /* pedido en el formato de LCKit (precios en millones, pisos numéricos) */
  function pedidoKit(S) {
    var U = (S.unidades || []).map(function (u) {
      var p = (S.pisos || []).filter(function (x) { return x.id === u.piso; })[0] || {};
      return { id: u.id, tipo: 'apartamentos', piso: +p.nivel || 1, area: u.area, precio: Math.round((u.precio || 0) / 1e6), estado: u.estado };
    });
    var area = U.length ? Math.round(U.reduce(function (s, u) { return s + (+u.area || 0); }, 0) / U.length) : 60;
    var prom = U.length ? Math.round(U.reduce(function (s, u) { return s + u.precio; }, 0) / U.length) : 0;
    return {
      proyecto: S.proyecto, empresa: S.empresa, ciudad: S.ciudad, whatsapp: S.whatsapp, slug: SR.slug(S.proyecto),
      negocio: 'preventa', negocioN: 'Preventa',
      espacios: [{ id: 'apartamentos', cant: U.length, area: area, precio: prom }],
      unidades: U,
      paleta: (S.recorrido || {}).paleta || [], decisiones: (S.recorrido || {}).decisiones || []
    };
  }

  var FIRMA = [
    '// Firma de integridad de Wompi en el servidor (Netlify Functions).',
    '// Se publica conectando el sitio a un repositorio Git o con Netlify CLI (Netlify Drop no publica funciones).',
    '// 1. En Netlify → Site settings → Environment variables crea WOMPI_INTEGRITY con tu secreto de integridad.',
    '// 2. En el dashboard → Pagos Wompi pon la URL: https://TU-SITIO.netlify.app/.netlify/functions/firma',
    '//    y deja vacío el campo "Secreto de integridad".',
    "const crypto = require('crypto');",
    "const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };",
    'exports.handler = async (event) => {',
    "  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };",
    "  const { reference, amountInCents, currency } = JSON.parse(event.body || '{}');",
    "  if (!/^SEP-[A-Z0-9-]+$/.test(reference || '') || !(amountInCents > 0) || !currency) return { statusCode: 400, headers: CORS, body: '{\"error\":\"datos inválidos\"}' };",
    "  const signature = crypto.createHash('sha256').update(`${reference}${amountInCents}${currency}${process.env.WOMPI_INTEGRITY}`).digest('hex');",
    '  return { statusCode: 200, headers: CORS, body: JSON.stringify({ signature }) };',
    '};', ''].join('\n');

  function leeme(S, name) {
    return [
      'SALA DE VENTAS CON RENDERS · ' + (S.proyecto || '').toUpperCase(),
      'Implementación de Life City BIM Management Hub para ' + (S.empresa || ''),
      '',
      'QUÉ TRAE',
      '  sitio/index.html      La sala: render frontal → piso → planta → apartamento → separación',
      '  sitio/dashboard.html  Tu panel: inventario, precios, estados, Wompi, zonas',
      '  sitio/gracias.html    Verifica el pago en Wompi y reserva el apartamento',
      '  sitio/datos.js        Todos los datos del proyecto (lo regenera el dashboard)',
      '  sitio/img/            Tus renders y plantas',
      (S.recorrido && S.recorrido.url ? '  sitio/recorrido/      Recorrido 3D del apartamento (kit Life City)' : ''),
      '  sitio/netlify/        Función opcional para firmar los pagos en el servidor',
      '',
      'PUBLICAR (5 minutos)',
      '  1. Entra a app.netlify.com/drop y arrastra la carpeta "sitio".',
      '     (o súbela a GitHub Pages / al FTP de tu web)',
      '  2. Abre TU-SITIO/dashboard.html → Pagos Wompi y pega tu llave pública y secreto de integridad.',
      '  3. En comercios.wompi.co no hace falta configurar nada más: la URL de redirección',
      '     viaja con cada pago (TU-SITIO/gracias.html).',
      '  4. Descarga datos.js desde el dashboard (pestaña Publicar) y reemplázalo en el sitio.',
      '',
      'PROBAR SIN COBRAR',
      '  Usa la llave pub_test_… de Wompi. Tarjeta de pruebas aprobada: 4242 4242 4242 4242.',
      '',
      'SOPORTE',
      '  WhatsApp +57 317 337 1577 · proyectos@lifecity.com.co',
      ''
    ].filter(function (l) { return l !== ''; }).join('\n').replace(/\n(QUÉ|PUBLICAR|PROBAR|SOPORTE)/g, '\n\n$1');
  }

  function build(S, o) {
    o = o || {};
    if (!window.JSZip) return Promise.reject(new Error('JSZip no cargó'));
    var zip = new JSZip(), name = SR.slug(S.proyecto) + '-sala-renders', root = zip.folder(name), site = root.folder('sitio');
    var D = JSON.parse(JSON.stringify(S));
    delete D.demo;
    D.unidades = SR.syncUnits(D).unidades;
    var jobs = TEMPLATES.map(function (f) {
      return fetch(BASE + f).then(function (r) { if (!r.ok) throw new Error('Falta ' + f); return r.text(); }).then(function (t) { site.file(f, t); });
    });
    usedImages(S).forEach(function (p) {
      jobs.push(getImg(S.id || cur, p).then(function (b) {
        if (b) return site.file(p, b);
        return fetch(BASE + p).then(function (r) { return r.ok ? r.blob() : null; }).then(function (x) { if (x) site.file(p, x); });
      }));
    });
    if (o.recorridoZip) jobs.push(JSZip.loadAsync(o.recorridoZip).then(function (rz) {
      var copies = [];
      rz.forEach(function (rel, f) {
        if (f.dir) return;
        var parts = rel.split('/'); parts.shift(); // quita la carpeta raíz del kit
        copies.push(f.async('blob').then(function (b) { site.file('recorrido/' + parts.join('/'), b); }));
      });
      return Promise.all(copies);
    }));
    site.file('netlify/functions/firma.js', FIRMA);
    site.file('datos.js', '/* Datos de ' + D.proyecto + ' · Life City */\nwindow.SALA = ' + JSON.stringify(D, null, 1) + ';\n');
    root.file('ABRIR-DASHBOARD.html', '<!doctype html><meta charset="utf-8"><title>Dashboard · ' + SR.esc(D.proyecto) + '</title><meta http-equiv="refresh" content="0;url=sitio/dashboard.html"><p style="font:16px sans-serif">Abriendo el dashboard… si no abre, <a href="sitio/dashboard.html">toca aquí</a>.</p>');
    root.file('ABRIR-SALA.html', '<!doctype html><meta charset="utf-8"><title>Sala · ' + SR.esc(D.proyecto) + '</title><meta http-equiv="refresh" content="0;url=sitio/index.html"><p style="font:16px sans-serif"><a href="sitio/index.html">Abrir la sala de ventas</a></p>');
    root.file('LEEME.txt', leeme(D, name));
    return Promise.all(jobs).then(function () { return zip.generateAsync({ type: 'blob' }); }).then(function (blob) { return { blob: blob, filename: name + '.zip' }; });
  }

  function download(r) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(r.blob); a.download = r.filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
  }

  window.LCPack = {
    loadDraft: loadDraft, saveDraft: saveDraft, list: list, create: create, duplicate: duplicate, remove: remove,
    exportFile: exportFile, importFile: importFile, thumb: thumb,
    upload: upload, img: img, build: build, download: download, pedidoKit: pedidoKit,
    current: function () { return cur; }
  };
})();
