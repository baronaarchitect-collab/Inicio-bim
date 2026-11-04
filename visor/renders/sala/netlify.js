/*!
 * Life City · Publicar la sala en Netlify desde el navegador (API de Netlify + token personal)
 *   SRNetlify.token([valor, recordar])          → lee / guarda el token (solo se recuerda si el usuario lo pide)
 *   SRNetlify.me(tk) · sites(tk)                → cuenta y sitios del usuario
 *   SRNetlify.createSite(tk, nombre)            → {id, name, ssl_url, admin_url}
 *   SRNetlify.deployZip(tk, siteId, blob, log)  → publica el sitio completo (ZIP con los archivos en la raíz)
 *   SRNetlify.deployFiles(tk, siteId, {"/datos.js": texto|Blob}, log) → cambia solo esos archivos y conserva el resto
 * El token se crea en app.netlify.com → User settings → Applications → Personal access tokens.
 */
(function () {
  'use strict';
  var API = 'https://api.netlify.com/api/v1', KEY = 'lc:netlify:token';
  var TOKEN_URL = 'https://app.netlify.com/user/applications#personal-access-tokens';

  function token(v, remember) {
    if (v === undefined) { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
    try { if (remember && v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) {}
    return v;
  }
  function api(tk, path, opts) {
    opts = opts || {};
    var h = Object.assign({ Authorization: 'Bearer ' + tk }, opts.headers || {});
    return fetch(API + path, Object.assign({}, opts, { headers: h })).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) {
          var m = (j && (j.message || (j.errors && JSON.stringify(j.errors)))) || t || r.statusText;
          if (r.status === 401) m = 'El token de Netlify no es válido o venció.';
          if (r.status === 422 && /subdomain|name/i.test(m)) m = 'Ese nombre de sitio ya está tomado en Netlify. Prueba con otro.';
          var err = new Error(m); err.status = r.status; throw err;
        }
        return j;
      });
    });
  }
  function me(tk) { return api(tk, '/user'); }
  function sites(tk) { return api(tk, '/sites?filter=all&per_page=100'); }
  function createSite(tk, name) { return api(tk, '/sites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name }) }); }
  function siteName(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }

  /* espera a que Netlify procese el deploy (máx. ~3 min) */
  function waitReady(tk, id, log) {
    var n = 0;
    return new Promise(function (res, rej) {
      (function go() {
        api(tk, '/deploys/' + id).then(function (d) {
          if (d.state === 'ready') return res(d);
          if (d.state === 'error') return rej(new Error('Netlify no pudo publicar: ' + (d.error_message || 'error desconocido')));
          log && log('Netlify está procesando (' + d.state + ')…');
          if (++n > 90) return rej(new Error('Netlify está tardando más de lo normal. Revisa el sitio en app.netlify.com.'));
          setTimeout(go, 2000);
        }).catch(rej);
      })();
    });
  }
  function deployZip(tk, siteId, blob, log) {
    log && log('Subiendo ' + Math.round(blob.size / 1024) + ' KB a Netlify…');
    return api(tk, '/sites/' + siteId + '/deploys', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: blob })
      .then(function (d) { return waitReady(tk, d.id, log); });
  }
  function sha1(data) {
    var p = typeof data === 'string' ? Promise.resolve(new TextEncoder().encode(data)) : data.arrayBuffer();
    return p.then(function (buf) { return crypto.subtle.digest('SHA-1', buf); }).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
  /* deploy por huellas: se manda la lista de todos los archivos actuales y solo se suben los que cambiaron */
  function deployFiles(tk, siteId, changed, log) {
    var paths = Object.keys(changed), shas = {};
    log && log('Leyendo los archivos publicados…');
    return Promise.all([api(tk, '/sites/' + siteId + '/files'), Promise.all(paths.map(function (p) { return sha1(changed[p]).then(function (s) { shas[p] = s; }); }))])
      .then(function (r) {
        var files = {};
        (r[0] || []).forEach(function (f) { files[f.path] = f.sha; });
        // sin la sala publicada, subir solo unos archivos dejaría un sitio roto
        if (!files['/index.html']) throw new Error('Ese sitio de Netlify todavía no tiene la sala. Publícala primero completa desde la página de gracias de la implementación.');
        paths.forEach(function (p) { files[p] = shas[p]; });
        log && log('Creando el deploy…');
        return api(tk, '/sites/' + siteId + '/deploys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files: files }) });
      })
      .then(function (d) {
        var need = d.required || [];
        var up = paths.filter(function (p) { return need.indexOf(shas[p]) >= 0; });
        log && log(up.length ? 'Subiendo ' + up.join(', ') + '…' : 'Sin archivos nuevos que subir…');
        return Promise.all(up.map(function (p) {
          return api(tk, '/deploys/' + d.id + '/files' + p.split('/').map(encodeURIComponent).join('/'), { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: changed[p] });
        })).then(function () { return waitReady(tk, d.id, log); });
      });
  }

  window.SRNetlify = { TOKEN_URL: TOKEN_URL, token: token, me: me, sites: sites, createSite: createSite, siteName: siteName, deployZip: deployZip, deployFiles: deployFiles };
})();
