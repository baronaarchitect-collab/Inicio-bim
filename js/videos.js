// Videos de apoyo por lección (YouTube, pueden ser "no listados").
// Pega el link en la lección que corresponda; si queda vacío, el botón no aparece.
// Acepta: https://youtu.be/ID · https://www.youtube.com/watch?v=ID · /shorts/ID · /embed/ID

export const VIDEOS = {
  // Playbook 1 · Tres mitos
  u1l1: { title: 'BIM no es tamaño, es método', url: '' },
  u1l2: { title: 'BIM empieza con estrategia: alcance, BEP y LOD', url: '' },
  u1l3: { title: 'BIM es inversión: el error del concreto al modelo', url: '' },
  u1l4: { title: 'Guía de implementación: Revit, Navisworks y MS Project', url: '' },
  // Playbook 2 · Pilar 1 Modelado
  u2l1: { title: 'Los 3 pilares del modelado BIM', url: '' },
  u2l2: { title: 'Preparación: plantilla, unidades, niveles y CAD', url: '' },
  u2l3: { title: 'Orden de modelado: muros → componentes', url: '' },
  u2l4: { title: 'Control técnico del modelo', url: '' },
  // Pilar 2 Planimetría
  u3l1: { title: 'Planos conceptuales en Revit', url: '' },
  u3l2: { title: 'Estructura de planos y View Templates', url: '' },
  u3l3: { title: 'Planos constructivos: cielos, baños, cocina, muros', url: '' },
  // Pilar 3 Cantidades
  u4l1: { title: 'Cantidades por m², ML y unidad', url: '' },
  u4l2: { title: 'Configurar tablas de cantidades', url: '' },
  // Especialidades
  arq1: { title: 'Vigas y columnas desde Arquitectura', url: '' },
  arq2: { title: 'Checklist de entregables arquitectónicos', url: '' },
  ele1: { title: 'Eléctrico: dispositivos, tablero y circuitos', url: '' },
  ele2: { title: 'Eléctrico: conduits y filtros por Service Type', url: '' },
  ele3: { title: 'Eléctrico: cantidades', url: '' },
  hid1: { title: 'Hidrosanitario: modelar y clasificar', url: '' },
  hid2: { title: 'Hidrosanitario: System Types y filtros', url: '' },
  hid3: { title: 'Hidrosanitario: cantidades', url: '' },
  hvac1: { title: 'HVAC: ductos y equipos', url: '' },
  hvac2: { title: 'HVAC: cantidades y coordinación', url: '' },
  est1: { title: 'Estructural: vigas y columnas', url: '' },
  est2: { title: 'Estructural: alcance del refuerzo', url: '' },
  // Playbook 3 · Coordinación y gestión
  u6l1: { title: 'Psicología del despegue BIM', url: '' },
  u6l2: { title: 'Auditoría de procesos', url: '' },
  u6l3: { title: 'Gate de transición a coordinación', url: '' },
  u6l4: { title: 'Auditoría de personas y roles BIM', url: '' },
  u6l5: { title: 'Auditoría tecnológica', url: '' },
  u6l6: { title: 'Sistema de coordinación (tolerancia 5 mm)', url: '' },
  u6l7: { title: 'CDE, riesgos y KPIs', url: '' }
};

export function youtubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = u.searchParams.get('v') || u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] || null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function videoFor(lessonId) {
  const v = VIDEOS[lessonId];
  const id = youtubeId(v?.url);
  return id ? { ...v, id } : null;
}
