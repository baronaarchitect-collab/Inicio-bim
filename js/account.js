// Cuentas con Firebase (Auth + Firestore + Functions) y estado PRO.
// El SDK se carga desde el CDN solo si config.firebase está configurado.
//
// Firestore: users/{uid} = { name, email, progress (JSON), updatedAt,
//                            premium (bool, solo lo escribe el servidor), subscription {...} }

import { CONFIG } from './config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

export const account = {
  ready: false,
  user: null, // { uid, email, name, photoURL, emailVerified, provider }
  premium: false,
  subscription: null,
  remoteProgress: null,
  data: {}, // documento users/{uid} completo (p. ej. checklistProUntil)
  error: null
};

let fb = null;
let unsubDoc = null;
let saveTimer = null;
const listeners = new Set();

export function isConfigured() {
  const c = CONFIG.firebase || {};
  return Boolean(c.apiKey && c.projectId && !c.apiKey.startsWith('TU_'));
}

// El muro de pago solo existe cuando hay Firebase para validar la suscripción.
export function premiumRequired() {
  return isConfigured();
}

export function onChange(fn) {
  listeners.add(fn);
}

function emit() {
  listeners.forEach((fn) => fn(account));
}

export async function init() {
  if (!isConfigured()) {
    account.ready = true;
    emit();
    return;
  }
  try {
    const [appMod, authMod, fsMod, fnMod] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
      import(`${SDK}/firebase-functions.js`)
    ]);
    const app = appMod.initializeApp(CONFIG.firebase);
    fb = {
      A: authMod,
      F: fsMod,
      Fn: fnMod,
      auth: authMod.getAuth(app),
      db: fsMod.getFirestore(app),
      fns: fnMod.getFunctions(app, CONFIG.firebase.functionsRegion || 'us-central1')
    };
    fb.auth.languageCode = 'es';
    await authMod.getRedirectResult(fb.auth).catch(() => null);
    authMod.onAuthStateChanged(fb.auth, handleUser);
  } catch (e) {
    account.error = 'No se pudo conectar con el servidor de cuentas. Revisa tu conexión.';
    account.ready = true;
    emit();
  }
}

function handleUser(user) {
  if (unsubDoc) unsubDoc();
  unsubDoc = null;
  if (!user) {
    Object.assign(account, { user: null, premium: false, subscription: null, remoteProgress: null, data: {}, ready: true });
    emit();
    return;
  }
  account.user = {
    uid: user.uid,
    email: user.email,
    name: user.displayName || '',
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    provider: user.providerData[0]?.providerId || 'password'
  };
  const ref = fb.F.doc(fb.db, 'users', user.uid);
  fb.F.setDoc(ref, { email: user.email || '', emailLower: user.emailVerified ? (user.email || '').toLowerCase() : '', name: user.displayName || '', updatedAt: fb.F.serverTimestamp() }, { merge: true }).catch(() => {});
  unsubDoc = fb.F.onSnapshot(
    ref,
    (snap) => {
      const d = snap.data() || {};
      account.data = d;
      account.premium = d.premium === true;
      account.subscription = d.subscription || null;
      try {
        account.remoteProgress = d.progress ? JSON.parse(d.progress) : null;
      } catch {
        account.remoteProgress = null;
      }
      account.ready = true;
      emit();
    },
    () => {
      account.error = 'No se pudo leer tu cuenta.';
      account.ready = true;
      emit();
    }
  );
}

export async function signInGoogle() {
  const provider = new fb.A.GoogleAuthProvider();
  try {
    await fb.A.signInWithPopup(fb.auth, provider);
  } catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) {
      await fb.A.signInWithRedirect(fb.auth, provider);
    } else throw e;
  }
}

export async function signInEmail(email, password) {
  await fb.A.signInWithEmailAndPassword(fb.auth, email, password);
}

export async function signUpEmail(name, email, password) {
  const cred = await fb.A.createUserWithEmailAndPassword(fb.auth, email, password);
  if (name) await fb.A.updateProfile(cred.user, { displayName: name });
  fb.A.sendEmailVerification(cred.user).catch(() => {});
  handleUser(fb.auth.currentUser);
}

export async function resetPassword(email) {
  await fb.A.sendPasswordResetEmail(fb.auth, email);
}

export async function signOut() {
  await fb.A.signOut(fb.auth);
}

// Guarda el progreso en la nube (con debounce) para usarlo en varios dispositivos.
export function saveProgress(state) {
  if (!fb || !account.user) return;
  clearTimeout(saveTimer);
  const uid = account.user.uid;
  const payload = JSON.stringify(state);
  saveTimer = setTimeout(() => {
    fb.F.setDoc(fb.F.doc(fb.db, 'users', uid), { progress: payload, updatedAt: fb.F.serverTimestamp() }, { merge: true }).catch(() => {});
  }, 1500);
}

// Subcolecciones del usuario: users/{uid}/{name}/{id} (p. ej. proyectos del checklist).
export async function listUserDocs(name) {
  const snap = await fb.F.getDocs(fb.F.collection(fb.db, 'users', account.user.uid, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveUserDoc(name, id, data) {
  await fb.F.setDoc(fb.F.doc(fb.db, 'users', account.user.uid, name, id), { ...data, updatedAt: fb.F.serverTimestamp() }, { merge: true });
}

export async function deleteUserDoc(name, id) {
  await fb.F.deleteDoc(fb.F.doc(fb.db, 'users', account.user.uid, name, id));
}

// Lee un documento cualquiera (p. ej. proLinks/{id}); null si no existe o no hay permiso.
export async function getDocData(...path) {
  try {
    const snap = await fb.F.getDoc(fb.F.doc(fb.db, ...path));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

export async function getIdToken() {
  return fb?.auth.currentUser ? fb.auth.currentUser.getIdToken() : null;
}

// Fecha (ms) hasta la que un campo de acceso con vencimiento sigue activo; 0 si no aplica.
export function accessUntil(field) {
  const v = account.data?.[field];
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

// Llama a la Cloud Function que verifica la suscripción directamente con PayPal.
export async function activateSubscription(subscriptionID) {
  const call = fb.Fn.httpsCallable(fb.fns, 'activateSubscription');
  const res = await call({ subscriptionID });
  return res.data; // { premium, status, pending }
}

const MESSAGES = {
  'auth/invalid-email': 'El correo no es válido.',
  'auth/missing-password': 'Escribe tu contraseña.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/email-already-in-use': 'Ese correo ya tiene cuenta. Inicia sesión.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'No hay una cuenta con ese correo.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains).',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  'functions/unauthenticated': 'Inicia sesión para activar tu suscripción.',
  'functions/failed-precondition': 'PayPal aún no confirma la suscripción.',
  'functions/permission-denied': 'Esta suscripción pertenece a otra cuenta.'
};

export function errorMessage(e) {
  return MESSAGES[e?.code] || e?.message || 'Ocurrió un error. Intenta de nuevo.';
}
