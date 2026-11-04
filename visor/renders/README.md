# Sala de ventas con renders · Life City

Implementación hermana de la [sala de ventas virtual 3D](https://baronaarchitect-collab.github.io/Inicio-bim/visor/sala-ventas.html#demo):
en vez de pedir el modelo 3D, pide **render frontal y plantas**, y arma el flujo tipo Morph Granada.

## Flujo

**Comprador** (`sala/`): render frontal → cada piso es un botón → planta del piso → cada apto es un botón
(área, alcobas, baños, render, valor) → separa con el 10 % en Wompi → `gracias.html` verifica la transacción
y marca el apto como reservado.

**3D y cita:** el render frontal tiene **Ver el edificio en 3D** y la ficha de cada apto **Entrar al apartamento en 3D**: abren la
[app 3D de la sala](https://github.com/baronaarchitect-collab/sala-3d-apartamentos) encima de la sala, entrando directo a ese apto.
En *Zonas* cada planta y cada apto pueden llevar su **recorrido 3D**: el link de un modelo (`.glb`, `.ifc`…), un modelo subido
(viaja en el ZIP como `img/modelo-….glb`) o el link de una página publicada (Matterport, Kuula, un recorrido propio).
Sin recorrido propio entra en automático (el apto del IFC del edificio, si la app 3D lo tiene). Además de separar, la ficha ofrece
**Agendar cita en la sala de ventas** (día, hora, presencial o videollamada): va al CRM de Life City si está activo y se confirma por WhatsApp.

**Constructora** (lo que tú vendes, raíz):
1. `index.html`: demo en vivo + asistente (datos → render y pisos → plantas y aptos → precios → Wompi de la constructora → vista previa) → paga la implementación con **tu** Wompi.
2. `gracias.html`: consulta la transacción en Wompi; si está APROBADA y el monto coincide, **descarga sola el ZIP**.
   Ahí mismo crea el **recorrido**: sube el modelo 3D, lo pinta con la paleta de colores, escribe las decisiones
   arquitectónicas y lo **une con el kit 3D** (`LCKit` de Inicio-bim): el ZIP final trae `sitio/recorrido/`.

**Mis proyectos:** el asistente guarda varios proyectos en el navegador (datos en localStorage, imágenes en
IndexedDB con el prefijo `<id>:`). Desde el panel se abren, duplican, eliminan y se exportan/importan como
`.sala.zip` (`proyecto.json` + `img/`) para pasarlos a otro equipo. Cada pago queda atado a su proyecto.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `config.js` | Tu precio y tu llave de Wompi (vacía = modo "simular pago") |
| `sala/showroom.js` / `.css` | Motor del showroom + Wompi (firma, checkout, consulta) + IndexedDB |
| `sala/editor.js`, `sala/zonas.js` | Editor de zonas: pisos sobre el render, aptos sobre la planta |
| `sala/index.html`, `dashboard.html`, `gracias.html` | Plantillas que viajan en el ZIP (aquí corren con el demo Torre Alborada) |
| `sala/datos.js`, `sala/img/` | Datos e imágenes del demo |
| `js/empaquetar.js` | Arma el ZIP y traduce los datos al formato del kit 3D |

## Publicar

Súbelo a GitHub Pages **dentro de `baronaarchitect-collab.github.io`** (p. ej. `Inicio-bim/visor/renders/`):
al compartir dominio con el kit, el recorrido también queda disponible en `implementacion-lista.html`.

Local: `python -m http.server 8765` y abre http://localhost:8765.

## Recorrido 3D, llamado a la acción e inventario en la nube

- **Recorrido 3D:** en el dashboard → Proyecto → *Link del recorrido 3D*. Con link, el render frontal muestra el botón **Ver recorrido en 3D** (y la ficha del apto también).
- **Llamado a la acción:** dashboard → Proyecto → *Pagar la separación* (Wompi) o *Ir a la sala de ventas* (link propio, admite `{apto}`; vacío = agendar por WhatsApp).
- **Inventario en la nube (Firebase), mismo esquema de accesos del visor BIM:**
  - **Master:** correos fijos en `firestore.rules` (no se publican en las salas). Activa la sala y da accesos por correo desde dashboard → Accesos.
  - **Ventas (constructora):** el correo que el master agrega. Entra al dashboard (Google o correo verificado) y marca reservas y ventas; la sala pública las ve en vivo.
  - **Separaciones pagadas:** la página de gracias las deja en la nube y aparecen en Inventario para *Confirmar y reservar*.
  - Configuración: pega la config web de Firebase en `config.js → firebase` (va a cada sala que se genere) o en dashboard → Accesos. Publica `firestore.rules` y agrega el dominio de cada sala en Authentication → Authorized domains si van a entrar con Google.
