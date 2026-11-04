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
  // Puede ser el mismo proyecto del Estudio de Inicio-bim. Mientras apiKey empiece por "TU_", las salas
  // guardan los estados solo en el navegador. Los correos master van en firestore.rules (no se publican).
  firebase: {
    apiKey: 'TU_API_KEY',
    authDomain: 'TU_PROYECTO.firebaseapp.com',
    projectId: 'TU_PROYECTO',
    appId: 'TU_APP_ID'
  },

  whatsapp: '573173371577',
  correo: 'proyectos@lifecity.com.co',

  // Kit de la sala virtual 3D (recorrido) con el que se une esta implementación
  kit: 'https://baronaarchitect-collab.github.io/Inicio-bim/visor/implementacion/kit.js',
  implementacionLista: 'https://baronaarchitect-collab.github.io/Inicio-bim/visor/implementacion-lista.html'
};
