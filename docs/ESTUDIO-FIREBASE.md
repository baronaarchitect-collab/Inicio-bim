# Estudio de salas de ventas · Firebase

**Estudio:** https://baronaarchitect-collab.github.io/Inicio-bim/visor/panel.html

Por proyecto creas y guardas:

| Pestaña | Qué pide | Qué genera |
|---------|----------|------------|
| Proyecto | Nombre, constructora, director, WhatsApp, ciudad, zona, cómo se comercializa, entrega, sala | Datos comunes |
| Typeform | Tipologías: área, habitaciones, baños, precio desde, renta mensual, para vivir o invertir | `typeform.html` (plantilla de Antonio) |
| Recorrido virtual | Ambientes de cada tipología (ancho × largo) y, opcional, modelo 3D .glb/.obj | `recorrido.html` (planta navegable con medición, asesor y cita) |
| Dashboard | Unidades (importa el JSON de la sala 14 o créalas desde las tipologías), precios y estados | Instalador `.zip`: dashboard + sitio 3D + Typeform + recorrido |
| Links | Link publicado de cada pieza | Orquesta Typeform, recorrido, sala de renders, dashboard y propuesta |

**Importar la sala 14 (2D + render):** acepta el `.sala.zip` (proyecto.json + img), `proyecto.json`, `datos.js` o el instalador de la sala de renders. Trae pisos, unidades, áreas, alcobas, baños, precios, estados y el render de la fachada, y arma las tipologías solas.

## Guardado

- **Sin Firebase o sin sesión:** los proyectos se guardan en el navegador (localStorage).
- **Con Firebase y sesión:** cada proyecto vive en Firestore en `users/{uid}/salas/{id}` y lo ves desde cualquier equipo con tu cuenta. El botón "Subir N proyectos de este navegador" pasa a la nube lo que tenías local.
- **Archivos pesados** (modelo 3D, render de fachada): siempre en el navegador (IndexedDB). Firebase Storage pide el plan Blaze; si lo activas, se pueden subir ahí.

## Conectar Firebase (plan gratuito Spark)

1. Entra a https://console.firebase.google.com y crea el proyecto (o usa el de la Plataforma BIM).
2. **Configuración del proyecto → Tus apps → Web (</>)**: registra la app y copia `apiKey`, `authDomain`, `projectId` y `appId` en `visor/estudio/firebase-config.js`.
3. **Authentication → Sign-in method**: habilita **Google** y **Correo/contraseña**.
4. **Authentication → Settings → Authorized domains**: agrega `baronaarchitect-collab.github.io`.
5. **Firestore Database**: créala en modo producción y publica las reglas de `firestore.rules` (incluyen `users/{uid}/salas`). Con Firebase CLI: `firebase deploy --only firestore:rules`.
6. Haz commit de `firebase-config.js`. GitHub Pages se actualiza solo.

La configuración web de Firebase es pública por diseño; lo que protege los datos son las reglas: cada usuario solo lee y escribe sus propios proyectos.
