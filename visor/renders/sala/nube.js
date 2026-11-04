/*!
 * Life City · Inventario de la sala en la nube (Firebase Auth + Firestore), mismo esquema de accesos del visor BIM:
 *   · Master: correos fijos en las reglas (firestore.rules). Activa la sala y da accesos. No se publican en la sala:
 *     el navegador sabe que eres master porque las reglas te dejan listar los accesos.
 *   · Ventas: correos que el master agrega a la sala (los de la constructora). Marcan reservas y ventas.
 *   · Compradores: solo leen los estados (la sala pública los muestra en vivo) y dejan la separación pagada.
 *
 * Firestore:
 *   salasRenders/{sala}                 {proyecto, estados:{apto: estado}, actualizado, por}   lectura pública
 *   salasRenders/{sala}/accesos/{email} {rol:'ventas', por, creado}                           solo el master escribe
 *   salasRenders/{sala}/separaciones/{tx} {unidad, transaccion, referencia, monto, …, estado} la crea la página de gracias
 *
 *   SRNube.config(S) · id(S) · on(S) · watch(S, cb) · aplicar(S, estados)
 *   SRNube.onUser(S, cb) · google(S) · entrar(S, correo, clave) · crear(S, correo, clave) · recordar(S, correo) · salir(S) · verificar(S)
 *   SRNube.rol(S, user) → 'master' | 'ventas' | null · esMaster(S, user) · activar(S, user) · setEstado(S, id, estado, user)
 *   SRNube.accesos.lista/agregar/quitar · separacion(S, datos) · separaciones(S, cb) · revisar(S, tx, estado, user)
 */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
  var COL = 'salasRenders', cache = {};

  function config(S) {
    var c = (S && S.firebase) || (window.LC_CONFIG && window.LC_CONFIG.firebase) || null;
    return c && c.apiKey && !/^TU_/.test(c.apiKey) && c.projectId ? c : null;
  }
  function id(S) { return String((S.nube && S.nube.sala) || S.id || SR.slug((window.SALA || S).proyecto)).replace(/[\/.#$\[\]]/g, '-'); }
  function low(e) { return String(e || '').trim().toLowerCase(); }

  /* backend: Firebase real, o uno inyectado para pruebas (SRNube.backend) */
  function init(S) {
    if (api.backend) return Promise.resolve(api.backend);
    var c = config(S); if (!c) return Promise.reject(new Error('Firebase no está configurado para esta sala.'));
    var k = c.projectId;
    if (!cache[k]) cache[k] = Promise.all([import(SDK + '/firebase-app.js'), import(SDK + '/firebase-auth.js'), import(SDK + '/firebase-firestore.js')]).then(function (m) {
      var app = m[0].getApps().filter(function (a) { return a.name === 'sr-' + k; })[0] || m[0].initializeApp(c, 'sr-' + k);
      return { A: m[1], F: m[2], auth: m[1].getAuth(app), db: m[2].getFirestore(app) };
    });
    return cache[k];
  }
  function sala(B, S) { return B.F.doc(B.db, COL, id(S)); }

  /* ---- lectura pública ---- */
  function watch(S, cb) {
    return init(S).then(function (B) {
      return B.F.onSnapshot(sala(B, S), function (d) { cb(d.exists() ? d.data() : null); }, function (e) { console.warn('Nube:', e.message); cb(null, e); });
    });
  }
  /* aplica los estados de la nube a S.unidades; devuelve true si algo cambió */
  function aplicar(S, estados) {
    var ch = false;
    (S.unidades || []).forEach(function (u) { var e = estados && estados[u.id]; if (e && e !== u.estado && SR.ESTADOS[e]) { u.estado = e; ch = true; } });
    return ch;
  }

  /* ---- sesión ---- */
  function onUser(S, cb) { return init(S).then(function (B) { return B.A.onAuthStateChanged(B.auth, cb); }); }
  function google(S) { return init(S).then(function (B) { return B.A.signInWithPopup(B.auth, new B.A.GoogleAuthProvider()); }).catch(err); }
  function entrar(S, e, p) { return init(S).then(function (B) { return B.A.signInWithEmailAndPassword(B.auth, low(e), p); }).catch(err); }
  function crear(S, e, p) {
    return init(S).then(function (B) {
      return B.A.createUserWithEmailAndPassword(B.auth, low(e), p).then(function (c) { return B.A.sendEmailVerification(c.user).then(function () { return c; }); });
    }).catch(err);
  }
  function recordar(S, e) { return init(S).then(function (B) { return B.A.sendPasswordResetEmail(B.auth, low(e)); }).catch(err); }
  function verificar(S) { return init(S).then(function (B) { return B.auth.currentUser && B.A.sendEmailVerification(B.auth.currentUser); }).catch(err); }
  function salir(S) { return init(S).then(function (B) { return B.A.signOut(B.auth); }); }
  var MSG = {
    'auth/invalid-email': 'El correo no es válido.', 'auth/missing-password': 'Escribe la contraseña.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.', 'auth/email-already-in-use': 'Ese correo ya tiene cuenta. Entra con tu contraseña.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.', 'auth/wrong-password': 'Correo o contraseña incorrectos.', 'auth/user-not-found': 'No hay una cuenta con ese correo.',
    'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.', 'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase. El master debe agregarlo en Authentication → Settings → Authorized domains (mientras tanto entra con correo y contraseña).',
    'permission-denied': 'No tienes permiso para esto. Pídele acceso al master.'
  };
  function err(e) { var m = MSG[e && e.code]; if (m) { var x = new Error(m); x.code = e.code; throw x; } throw e; }

  /* ---- roles: igual que el visor BIM (admins fijos + miembros por proyecto) ---- */
  function rol(S, user) {
    if (!user || !user.email) return Promise.resolve(null);
    if (!user.emailVerified) return Promise.resolve(null);
    return init(S).then(function (B) {
      // solo el master puede listar los accesos de una sala
      return B.F.getDocs(B.F.collection(B.db, COL, id(S), 'accesos')).then(function () { return 'master'; }, function () {
        return B.F.getDoc(B.F.doc(B.db, COL, id(S), 'accesos', low(user.email))).then(function (d) { return d.exists() ? (d.data().rol || 'ventas') : null; });
      });
    }).catch(function () { return null; });
  }
  /* master sin sala: solo el master puede listar accesos (sirve para publicar implementaciones sin pagar) */
  function esMaster(S, user) {
    if (!user || !user.email || !user.emailVerified) return Promise.resolve(false);
    return init(S).then(function (B) { return B.F.getDocs(B.F.collection(B.db, COL, '_master', 'accesos')).then(function () { return true; }, function () { return false; }); }).catch(function () { return false; });
  }
  function estadosDe(S) { var o = {}; (S.unidades || []).forEach(function (u) { o[u.id] = u.estado; }); return o; }
  function activar(S, user) {
    return init(S).then(function (B) {
      return B.F.setDoc(sala(B, S), { proyecto: S.proyecto || '', estados: estadosDe(S), actualizado: B.F.serverTimestamp(), por: low(user.email) });
    }).catch(err);
  }
  function setEstado(S, uid, estado, user) {
    return init(S).then(function (B) {
      var o = {}; o['estados.' + uid] = estado; o.actualizado = B.F.serverTimestamp(); o.por = low(user.email);
      return B.F.updateDoc(sala(B, S), o);
    }).catch(err);
  }
  var accesos = {
    lista: function (S) {
      return init(S).then(function (B) { return B.F.getDocs(B.F.collection(B.db, COL, id(S), 'accesos')); })
        .then(function (q) { var out = []; q.forEach(function (d) { out.push(Object.assign({ email: d.id }, d.data())); }); return out; }).catch(err);
    },
    agregar: function (S, email, user) {
      email = low(email);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Promise.reject(new Error('Ese correo no es válido.'));
      return init(S).then(function (B) { return B.F.setDoc(B.F.doc(B.db, COL, id(S), 'accesos', email), { rol: 'ventas', por: low(user.email), creado: B.F.serverTimestamp() }); }).catch(err);
    },
    quitar: function (S, email) { return init(S).then(function (B) { return B.F.deleteDoc(B.F.doc(B.db, COL, id(S), 'accesos', low(email))); }).catch(err); }
  };

  /* ---- separaciones pagadas (la página de gracias las deja; ventas las confirma) ---- */
  function cut(s, n) { return String(s == null ? '' : s).slice(0, n); }
  function separacion(S, d) {
    return init(S).then(function (B) {
      return B.F.setDoc(B.F.doc(B.db, COL, id(S), 'separaciones', cut(d.transaccion, 80).replace(/[\/]/g, '-')), {
        unidad: cut(d.unidad, 20), transaccion: cut(d.transaccion, 80), referencia: cut(d.referencia, 120),
        monto: +d.monto || 0, moneda: cut(d.moneda, 5), nombre: cut(d.nombre, 120), correo: cut(d.correo, 120), celular: cut(d.celular, 40),
        estado: 'nueva', creado: B.F.serverTimestamp()
      });
    });
  }
  function separaciones(S, cb) {
    return init(S).then(function (B) {
      return B.F.onSnapshot(B.F.collection(B.db, COL, id(S), 'separaciones'), function (q) {
        var out = []; q.forEach(function (d) { out.push(Object.assign({ id: d.id }, d.data())); });
        out.sort(function (a, b) { return ((b.creado && b.creado.seconds) || 0) - ((a.creado && a.creado.seconds) || 0); });
        cb(out);
      }, function (e) { cb(null, e); });
    });
  }
  function revisar(S, tx, estado, user) {
    return init(S).then(function (B) { return B.F.updateDoc(B.F.doc(B.db, COL, id(S), 'separaciones', tx), { estado: estado, por: low(user.email), revisado: B.F.serverTimestamp() }); }).catch(err);
  }

  var api = {
    backend: null, config: config, id: id, on: function (S) { return !!(api.backend || config(S)); },
    watch: watch, aplicar: aplicar, onUser: onUser, google: google, entrar: entrar, crear: crear, recordar: recordar, verificar: verificar, salir: salir,
    rol: rol, esMaster: esMaster, activar: activar, setEstado: setEstado, accesos: accesos, separacion: separacion, separaciones: separaciones, revisar: revisar
  };
  window.SRNube = api;
})();
