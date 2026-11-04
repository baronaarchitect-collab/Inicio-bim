/*!
 * Life City · Estudio de salas de ventas — guardado de proyectos
 * ---------------------------------------------------------------
 * Con Firebase configurado (firebase-config.js) y sesión iniciada, cada proyecto vive en
 * Firestore en users/{uid}/salas/{id}. Sin Firebase o sin sesión, vive en este navegador.
 * Los archivos pesados (modelo 3D, render de fachada) se guardan siempre en este navegador (IndexedDB).
 *
 *   LCStore.init(onChange)           → arranca; onChange({modo, usuario}) cada vez que cambia la sesión
 *   LCStore.list() / save(p) / remove(id)
 *   LCStore.google() / email(correo, clave, crear) / salir()
 *   LCStore.files.put(k, blob) / get(k) / del(k)
 */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var KEY = 'lc:estudio:proyectos';
  var cfg = window.LC_FIREBASE || {};
  var configurado = !!(cfg.apiKey && cfg.apiKey.indexOf('TU_') !== 0);
  var fb = null, user = null, listeners = [];

  function lsGet() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function lsSet(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function script(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('No cargó ' + src)); }; document.head.appendChild(s); });
  }
  function estado() { return { modo: user ? 'nube' : 'local', configurado: configurado, usuario: user ? { uid: user.uid, nombre: user.displayName || '', correo: user.email || '' } : null }; }
  function emit() { var e = estado(); listeners.forEach(function (f) { f(e); }); }

  function init(onChange) {
    if (onChange) listeners.push(onChange);
    if (!configurado) { emit(); return Promise.resolve(estado()); }
    return script(SDK + 'firebase-app-compat.js')
      .then(function () { return Promise.all([script(SDK + 'firebase-auth-compat.js'), script(SDK + 'firebase-firestore-compat.js')]); })
      .then(function () {
        fb = window.firebase; fb.initializeApp(cfg);
        return new Promise(function (res) {
          fb.auth().onAuthStateChanged(function (u) { user = u; emit(); res(estado()); });
        });
      })
      .catch(function () { configurado = false; emit(); return estado(); });
  }
  function col() { return fb.firestore().collection('users').doc(user.uid).collection('salas'); }
  function clean(p) { return JSON.parse(JSON.stringify(p)); } // Firestore no acepta undefined

  function list() {
    if (!user) return Promise.resolve(lsGet().sort(function (a, b) { return (b.actualizado || 0) - (a.actualizado || 0); }));
    return col().orderBy('actualizado', 'desc').get().then(function (q) { return q.docs.map(function (d) { return d.data(); }); });
  }
  function save(p) {
    p.actualizado = Date.now();
    if (!user) {
      var L = lsGet().filter(function (x) { return x.id !== p.id; }); L.push(clean(p));
      return Promise.resolve(lsSet(L)).then(function (ok) { if (!ok) throw new Error('El navegador no dejó guardar: libera espacio o inicia sesión'); return 'local'; });
    }
    var size = JSON.stringify(p).length;
    if (size > 900000) return Promise.reject(new Error('El proyecto pesa ' + Math.round(size / 1000) + ' KB y Firestore admite hasta 1 MB por proyecto'));
    return col().doc(p.id).set(clean(p)).then(function () { return 'nube'; });
  }
  function remove(id) {
    if (!user) { lsSet(lsGet().filter(function (x) { return x.id !== id; })); return Promise.resolve(); }
    return col().doc(id).delete();
  }
  /* Sube a la nube los proyectos que estaban solo en este navegador */
  function subirLocales() {
    if (!user) return Promise.resolve(0);
    var L = lsGet(); if (!L.length) return Promise.resolve(0);
    return Promise.all(L.map(function (p) { return col().doc(p.id).set(clean(p)); })).then(function () { lsSet([]); return L.length; }); // ya quedaron en la nube
  }
  function google() { var pr = new fb.auth.GoogleAuthProvider(); return fb.auth().signInWithPopup(pr); }
  function email(correo, clave, crear) { return crear ? fb.auth().createUserWithEmailAndPassword(correo, clave) : fb.auth().signInWithEmailAndPassword(correo, clave); }
  function salir() { return fb ? fb.auth().signOut() : Promise.resolve(); }

  function idb(mode, fn) {
    return new Promise(function (res) {
      try {
        var rq = indexedDB.open('lc-estudio', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('files'); };
        rq.onsuccess = function () { var tx = rq.result.transaction('files', mode), r = fn(tx.objectStore('files')); tx.oncomplete = function () { res(r && 'result' in r ? r.result : null); }; tx.onerror = function () { res(null); }; };
        rq.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  var files = {
    put: function (k, v) { return idb('readwrite', function (s) { s.put(v, k); }); },
    get: function (k) { return idb('readonly', function (s) { return s.get(k); }); },
    del: function (k) { return idb('readwrite', function (s) { s.delete(k); }); }
  };

  window.LCStore = { init: init, list: list, save: save, remove: remove, subirLocales: subirLocales, google: google, email: email, salir: salir, files: files, estado: estado, localCount: function () { return lsGet().length; } };
})();
