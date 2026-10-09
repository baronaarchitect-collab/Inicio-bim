/**
 * Checklist BIM · Activación de suscripciones Wompi → Firebase (gratis)
 * ---------------------------------------------------------------------
 * Publica este script como "Aplicación web" (Ejecutar como: Yo · Acceso: Cualquier usuario).
 *
 *  POST  (webhook de Wompi)   evento transaction.updated APPROVED del link de pago
 *        → busca users/{uid} con el mismo correo y extiende checklistProUntil.
 *        → guarda purchases/{transactionId} (idempotente; sirve para reclamar después).
 *  GET   ?action=claim&idToken=…  la app lo llama al iniciar sesión: verifica el token de
 *        Firebase (correo verificado) y aplica compras pendientes con ese correo.
 *
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *  PROJECT_ID            id del proyecto de Firebase
 *  FIREBASE_API_KEY      apiKey web de Firebase (la misma de js/config.js)
 *  SA_EMAIL              client_email de la cuenta de servicio de Firebase
 *  SA_PRIVATE_KEY        private_key de la cuenta de servicio (con los \n)
 *  WOMPI_EVENTS_SECRET   Secreto de eventos de Wompi (Desarrolladores → Secretos)
 *  PAYMENT_LINK_ID       4O0ONc  (vacío = aceptar cualquier link de pago)
 *  ACCESS_DAYS           30
 */

var FIELD = 'checklistProUntil';

function doPost(e) {
  var P = props_();
  var ev;
  try {
    ev = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_json' });
  }
  if (!verifyWompiEvent(ev, P.WOMPI_EVENTS_SECRET)) {
    console.warn('Firma de Wompi inválida');
    return json_({ ok: false, error: 'signature' });
  }
  if (ev.event !== 'transaction.updated') return json_({ ok: true, ignored: ev.event });
  var tx = (ev.data && ev.data.transaction) || {};
  if (tx.status !== 'APPROVED') return json_({ ok: true, status: tx.status });
  if (P.PAYMENT_LINK_ID && tx.payment_link_id && tx.payment_link_id !== P.PAYMENT_LINK_ID) {
    console.log('Transacción de otro link: ' + tx.payment_link_id);
    return json_({ ok: true, ignored: 'other_link' });
  }
  var email = normEmail(tx.customer_email);
  if (!email) return json_({ ok: false, error: 'no_email' });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var path = 'purchases/' + tx.id;
    var existing = fsGet_(P, path);
    if (existing) return json_({ ok: true, duplicate: true }); // Wompi reintenta: no duplicar días
    var users = findUsersByEmail_(P, email);
    var appliedTo = '';
    if (users.length) {
      appliedTo = users[0];
      extendAccess_(P, appliedTo);
    }
    fsPatch_(P, path, {
      email: { stringValue: email },
      transactionId: { stringValue: String(tx.id) },
      amountInCents: { integerValue: String(tx.amount_in_cents || 0) },
      paymentLinkId: { stringValue: String(tx.payment_link_id || '') },
      appliedTo: { stringValue: appliedTo },
      createdAt: { timestampValue: new Date().toISOString() }
    });
    console.log('Pago aprobado ' + tx.id + ' ' + email + ' → ' + (appliedTo || 'pendiente'));
    return json_({ ok: true, appliedTo: appliedTo || null });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'claim') return json_(claim_(props_(), p.idToken));
  return json_({ ok: true, service: 'checklist-bim-wompi' });
}

// ── Reclamar compras pendientes con un ID token de Firebase ──────────
function claim_(P, idToken) {
  if (!idToken) return { ok: false, error: 'no_token' };
  var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + P.FIREBASE_API_KEY, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: idToken }),
    muteHttpExceptions: true
  });
  var user = (JSON.parse(res.getContentText()).users || [])[0];
  if (!user) return { ok: false, error: 'invalid_token' };
  if (!user.emailVerified) return { ok: false, error: 'email_not_verified' };
  var email = normEmail(user.email);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var pending = fsQuery_(P, 'purchases', [
      ['email', email],
      ['appliedTo', '']
    ]);
    pending.forEach(function (doc) {
      extendAccess_(P, user.localId);
      fsPatch_(P, docPath_(doc.name), { appliedTo: { stringValue: user.localId } });
    });
    return { ok: true, granted: pending.length };
  } finally {
    lock.releaseLock();
  }
}

// ── Lógica de negocio ────────────────────────────────────────────────
function extendAccess_(P, uid) {
  var doc = fsGet_(P, 'users/' + uid);
  var current = doc && doc.fields && doc.fields[FIELD] ? Date.parse(doc.fields[FIELD].timestampValue) : 0;
  var until = newAccessUntil(current, Date.now(), Number(P.ACCESS_DAYS || 30));
  fsPatch_(P, 'users/' + uid, { checklistProUntil: { timestampValue: new Date(until).toISOString() } });
  return until;
}

function findUsersByEmail_(P, email) {
  // La app guarda emailLower en users/{uid} al iniciar sesión.
  return fsQuery_(P, 'users', [['emailLower', email]]).map(function (d) {
    return d.name.split('/').pop();
  });
}

// ── Funciones puras (probadas en tests/wompi.test.mjs) ───────────────
function normEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Acumula días: si aún tiene acceso, suma desde la fecha de vencimiento.
function newAccessUntil(currentMs, nowMs, days) {
  return Math.max(currentMs || 0, nowMs) + days * 86400000;
}

function getPath(obj, path) {
  return path.split('.').reduce(function (o, k) {
    return o == null ? undefined : o[k];
  }, obj);
}

// Firma de eventos de Wompi: SHA256(valores de signature.properties + timestamp + secreto).
function wompiChecksum(ev, secret) {
  var concat = (ev.signature.properties || [])
    .map(function (p) {
      var v = getPath(ev.data, p);
      return v == null ? '' : String(v);
    })
    .join('');
  return sha256Hex(concat + ev.timestamp + secret);
}

function verifyWompiEvent(ev, secret) {
  if (!ev || !ev.signature || !ev.signature.checksum || !secret) return false;
  return wompiChecksum(ev, secret).toUpperCase() === String(ev.signature.checksum).toUpperCase();
}

function sha256Hex(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes
    .map(function (b) {
      return ('0' + (b & 0xff).toString(16)).slice(-2);
    })
    .join('');
}

// ── Firestore REST con cuenta de servicio ───────────────────────────
function base_(P) {
  return 'https://firestore.googleapis.com/v1/projects/' + P.PROJECT_ID + '/databases/(default)/documents';
}

function docPath_(name) {
  return name.split('/documents/')[1];
}

function token_(P) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('fs_token');
  if (cached) return cached;
  var now = Math.floor(Date.now() / 1000);
  var enc = function (o) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, '');
  };
  var input =
    enc({ alg: 'RS256', typ: 'JWT' }) +
    '.' +
    enc({ iss: P.SA_EMAIL, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  var key = String(P.SA_PRIVATE_KEY).replace(/\\n/g, '\n');
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(input, key)).replace(/=+$/, '');
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: input + '.' + sig }
  });
  var token = JSON.parse(res.getContentText()).access_token;
  cache.put('fs_token', token, 3300);
  return token;
}

function fsFetch_(P, url, options) {
  options = options || {};
  options.headers = { Authorization: 'Bearer ' + token_(P) };
  options.muteHttpExceptions = true;
  var res = UrlFetchApp.fetch(url, options);
  var code = res.getResponseCode();
  if (code === 404) return null;
  if (code >= 300) throw new Error('Firestore ' + code + ': ' + res.getContentText());
  return JSON.parse(res.getContentText());
}

function fsGet_(P, path) {
  return fsFetch_(P, base_(P) + '/' + path);
}

function fsPatch_(P, path, fields) {
  var mask = Object.keys(fields)
    .map(function (f) {
      return 'updateMask.fieldPaths=' + encodeURIComponent(f);
    })
    .join('&');
  return fsFetch_(P, base_(P) + '/' + path + '?' + mask, {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify({ fields: fields })
  });
}

// filters: [[campo, valorString], ...] (igualdades combinadas con AND)
function fsQuery_(P, collection, filters) {
  var clauses = filters.map(function (f) {
    return { fieldFilter: { field: { fieldPath: f[0] }, op: 'EQUAL', value: { stringValue: f[1] } } };
  });
  var where = clauses.length === 1 ? clauses[0] : { compositeFilter: { op: 'AND', filters: clauses } };
  var rows =
    fsFetch_(P, base_(P) + ':runQuery', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: where, limit: 20 } })
    }) || [];
  return rows
    .filter(function (r) {
      return r.document;
    })
    .map(function (r) {
      return r.document;
    });
}

// ── Utilidades ───────────────────────────────────────────────────────
function props_() {
  return PropertiesService.getScriptProperties().getProperties();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
