# Sala de ventas con renders · Life City

Implementación hermana de la [sala de ventas virtual 3D](https://baronaarchitect-collab.github.io/Inicio-bim/visor/sala-ventas.html#demo):
en vez de pedir el modelo 3D, pide **render frontal y plantas**, y arma el flujo tipo Morph Granada.

## Flujo

**Comprador** (`sala/`): render frontal → cada piso es un botón → planta del piso → cada apto es un botón
(área, alcobas, baños, render, valor) → separa con el 10 % en Wompi → `gracias.html` verifica la transacción
y marca el apto como reservado.

**Constructora** (lo que tú vendes, raíz):
1. `index.html`: demo en vivo + asistente (datos → render y pisos → plantas y aptos → precios → Wompi de la constructora → vista previa) → paga la implementación con **tu** Wompi.
2. `gracias.html`: consulta la transacción en Wompi; si está APROBADA y el monto coincide, **descarga sola el ZIP**.
   Ahí mismo crea el **recorrido**: sube el modelo 3D, lo pinta con la paleta de colores, escribe las decisiones
   arquitectónicas y lo **une con el kit 3D** (`LCKit` de Inicio-bim): el ZIP final trae `sitio/recorrido/`.

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
