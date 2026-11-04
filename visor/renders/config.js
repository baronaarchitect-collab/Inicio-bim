/*
 * Configuración de Juan · Life City BIM Hub — la venta de la implementación.
 * (La Wompi de cada constructora para las separaciones se pone en el dashboard de su sala.)
 */
window.LC_CONFIG = {
  // Precio de la implementación en pesos colombianos (COP)
  precio: 2500000,
  moneda: 'COP',

  // Tu cuenta de Wompi (comercios.wompi.co → Desarrolladores).
  // Mientras publicKey esté vacía, la página ofrece "simular pago" para probar el flujo.
  wompi: {
    publicKey: '',          // pub_prod_… o pub_test_…
    integrity: '',          // test_integrity_… / prod_integrity_…  (mejor usa firmaUrl)
    firmaUrl: ''            // p. ej. https://tu-sitio.netlify.app/.netlify/functions/firma
  },

  // Firebase para el inventario en la nube de cada sala (Firebase → Configuración del proyecto → Tus apps → Web).
  // Proyecto: lifecity-salas-renders (console.firebase.google.com). Si apiKey empieza por "TU_", las salas
  // guardan los estados solo en el navegador. Los correos master van en firestore.rules (no se publican).
  firebase: {
    apiKey: 'AIzaSyAQ6TDFxdQnBFCDQdmprTVqanWN4W1MYME',
    authDomain: 'lifecity-salas-renders.firebaseapp.com',
    projectId: 'lifecity-salas-renders',
    appId: '1:978926852350:web:d4e9edc54aa2938a546daf'
  },

  whatsapp: '573173371577',
  correo: 'proyectos@lifecity.com.co',

  // Kit de la sala virtual 3D (recorrido) con el que se une esta implementación
  kit: 'https://baronaarchitect-collab.github.io/Inicio-bim/visor/implementacion/kit.js',
  implementacionLista: 'https://baronaarchitect-collab.github.io/Inicio-bim/visor/implementacion-lista.html'
};
