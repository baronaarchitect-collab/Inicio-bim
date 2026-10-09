# Visor BIM · Oferta de coordinación (detección + resolución de interferencias)

Es un módulo independiente que se agrega a tu **Visor BIM** (de otro repositorio) con una línea. Muestra, dentro del visor, la oferta de coordinar el proyecto en el momento oportuno y te envía el lead.

- **Demo:** https://baronaarchitect-collab.github.io/Inicio-bim/visor/
- **Script:** https://baronaarchitect-collab.github.io/Inicio-bim/visor/coordinacion.js

## 1. Agregarlo al visor
Pega esto antes de `</body>` en el HTML del visor:

```html
<script src="https://baronaarchitect-collab.github.io/Inicio-bim/visor/coordinacion.js"
        data-webhook="https://TU-N8N/webhook/lead-coordinacion"
        data-whatsapp="573173371577"
        data-delay-minutes="4"
        data-cooldown-days="3" defer></script>
```

## 2. Avisarle al módulo qué pasa en el visor
En el código del visor, donde termina de cargar un modelo o se detectan cruces:

```js
// Al cargar un modelo (con 2 o más disciplinas se muestra la oferta)
LifeCityCoord.modelLoaded({ project: 'Torre D', disciplines: ['ARQ', 'EST', 'HID'], elements: 18450 });

// Si el visor detecta interferencias
LifeCityCoord.clashesFound(37);

// Desde un botón propio, p. ej. "Coordinar este proyecto"
LifeCityCoord.show();
```

Si no llamas a nada, la oferta aparece sola tras `data-delay-minutes` minutos de uso.

## Cuándo aparece
| Momento | Mensaje |
|---------|---------|
| Modelo cargado con 2 o más disciplinas | "Cargaste 3 disciplinas de «Torre D». Detectamos y resolvemos sus interferencias antes de obra." |
| `clashesFound(n)` con n > 0 | "El modelo tiene 37 posibles interferencias. Te ayudamos a resolverlas por disciplina." |
| N minutos de uso | "Detección + resolución de interferencias, tolerancia 5 mm y modelo coordinado." |

- **Frecuencia:** máximo una vez cada `data-cooldown-days` días por proyecto (excepto `show()` manual).
- **Pestaña en segundo plano:** si el usuario activó "Avísame en el navegador", llega como notificación del sistema.
- **Idioma:** español o inglés según el navegador, o con `LifeCityCoord.setLang('en')`.

## Qué recibe tu webhook (n8n)
Cada evento llega por POST con este JSON en el cuerpo. Se envía como `text/plain` para evitar el bloqueo CORS del navegador; en n8n conviértelo con un nodo **Code** (`JSON.parse($json.body)`) o activa "Raw body".

```json
{
  "event": "lead",
  "source": "visor-bim",
  "project": "Torre D",
  "disciplines": ["ARQ", "EST", "HID"],
  "elements": 18450,
  "clashes": 37,
  "lead": { "name": "…", "email": "…", "phone": "…", "area_m2": "2400" },
  "url": "https://…",
  "at": "2026-10-09T15:00:00.000Z"
}
```

Eventos posibles:
- `offer_shown`: incluye `reason` (model, clash, time o manual).
- `interested`
- `lead`
- `whatsapp`
- `dismissed`

Flujo sugerido en n8n para responder al lead en segundos:
1. Webhook.
2. IF `event = lead`.
3. Mensaje de WhatsApp o correo automático al lead, con tu cotizador de Coordinación BIM Total.
4. Notificación a ti.
5. Fila en tu CRM.

El sitio que carga el visor también recibe cada evento como `window` event `lifecity:coordination`, por si quieres registrarlo en tu propia analítica.
