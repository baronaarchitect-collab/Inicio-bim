/*!
 * Life City · Empaquetador de la sala de ventas con renders
 *   LCPack.loadDraft()                 → Promise<{S, urls}>  borrador del asistente (localStorage + IndexedDB)
 *   LCPack.saveDraft(S)                → guarda el borrador
 *   LCPack.upload(file, nombre)        → Promise<path>  guarda una imagen del asistente
 *   LCPack.build(S, {recorridoZip})    → Promise<{blob, filename}>  ZIP listo para publicar
 *   LCPack.pedidoKit(S)                → pedido en el formato del kit 3D (LCKit) para unir el recorrido
 * Requiere sala/showroom.js (SR) y JSZip.
 */
(function () {
  'use strict';
  var DRAFT = 'lc:renders:borrador', BASE = 'sala/';
  var TEMPLATES = ['index.html', 'gracias.html', 'dashboard.html', 'showroom.js', 'showroom.css', 'editor.js', 'zonas.js'];
  var urls = {};

  function ext(f) { var m = /\.([a-z0-9]+)$/i.exec(f.name || ''); return (m ? m[1] : (f.type || '').split('/')[1] || 'jpg').toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg'); }

  function loadDraft() {
    var S = null;
    try { S = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) {}
    S = S || { id: 'sala-' + Date.now().toString(36), proyecto: '', empresa: '', ciudad: '', whatsapp: '', moneda: 'COP', separacion: 10, incremento: 0.5, wompi: {}, fachada: {}, pisos: [], plantas: [], unidades: [] };
    return SR.db.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return /^img\//.test(k); }).map(function (k) {
        return SR.db.get(k).then(function (b) { if (b) urls[k] = URL.createObjectURL(b); });
      }));
    }).catch(function () {}).then(function () { return { S: S, urls: urls }; });
  }
  function saveDraft(S) { try { localStorage.setItem(DRAFT, JSON.stringify(S)); return true; } catch (e) { return false; } }
  function upload(file, nombre) {
    var path = 'img/' + SR.slug(nombre) + '.' + ext(file);
    return SR.db.put(path, file).then(function () {
      if (urls[path]) URL.revokeObjectURL(urls[path]);
      urls[path] = URL.createObjectURL(file);
      return path;
    });
  }
  function img(p) { return urls[p] || p; }
  function usedImages(S) {
    var out = [];
    if (S.fachada && S.fachada.img) out.push(S.fachada.img);
    (S.plantas || []).forEach(function (p) { if (p.img) out.push(p.img); (p.aptos || []).forEach(function (a) { if (a.render) out.push(a.render); }); });
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

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
      jobs.push(SR.db.get(p).then(function (b) {
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

  window.LCPack = { loadDraft: loadDraft, saveDraft: saveDraft, upload: upload, img: img, build: build, download: download, pedidoKit: pedidoKit, DRAFT: DRAFT };
})();
