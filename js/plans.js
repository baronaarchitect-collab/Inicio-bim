// Planes BIM específicos: cada día = lección de 5 min + video (si la lección tiene uno en
// videos.js) + tarea para aplicar en un proyecto real + herramienta de la plataforma.
// Se desbloquea un día por fecha calendario para crear frecuencia.

const P = './plataforma/';
const T = {
  gate: (id, name) => ({ label: `Checklist · ${name}`, href: `${P}#checklist/${id}` }),
  market: (name) => ({ label: `Playbook: ${name}`, href: `${P}#marketplace` }),
  dashboard: { label: 'Coordination control', href: `${P}#tools` },
  consult: { label: 'Consultoría 1:1', href: '#consult' }
};
const d = (lesson, task, tool = null) => ({ lesson, task, tool });

export const PLANS = [
  {
    id: 'despegue-7',
    icon: '🚀',
    title: 'Despegue BIM en 7 días',
    desc: 'Mentalidad, herramientas y primer modelo ordenado. Ideal para empezar.',
    for: 'all',
    days: [
      d('u1l1', 'Revisa los planos de un proyecto actual y anota 3 interferencias que podrías anticipar con BIM.', T.market('Tres mitos')),
      d('u1l2', 'Escribe en 5 líneas el alcance, el LOD y el responsable de coordinación de tu próximo proyecto.', T.market('Consultoría BIM')),
      d('u1l3', 'Lista 3 retrabajos de tu último proyecto y estima cuánto costaron en obra.'),
      d('u1l4', 'Confirma que tienes Revit, Navisworks y un gestor de cronograma instalados y en la misma versión.', T.gate('arq', 'Modelado')),
      d('u2l1', 'Abre tu proyecto en Revit y verifica qué pilar (modelado, planos o cantidades) está más débil.'),
      d('u2l2', 'Configura plantilla, unidades, niveles y rejillas en un archivo nuevo.', T.gate('arq', 'Modelado')),
      d('u6l1', 'Define con tu equipo una regla de coordinación: quién decide y en cuánto tiempo responde.', T.consult)
    ]
  },
  {
    id: 'arq-14',
    icon: '📐',
    title: 'Modelador arquitectónico · 14 días',
    desc: 'Del archivo limpio a planos y cantidades confiables.',
    for: ['arquitecto', 'estructural'],
    days: [
      d('u2l1', 'Elige un proyecto real para practicar los 14 días.'),
      d('u2l2', 'Configura plantilla, unidades, niveles en alzado y vincula la planta CAD.', T.gate('arq', 'Modelado')),
      d('u2l3', 'Modela muros, puertas y ventanas del primer nivel en el orden correcto.'),
      d('u2l4', 'Revisa espesores, materiales, uniones y advertencias críticas.', T.gate('arq', 'Modelado')),
      d('u3l1', 'Crea la planta conceptual con cotas, niveles, rejillas y tabla de áreas.', T.gate('plan', 'Planimetría')),
      d('u3l2', 'Arma el set A-01 a A-06 y aplica View Templates.'),
      d('u3l3', 'Dibuja el detalle de un baño y el de un muro (alma y acabado).', T.gate('plan', 'Planimetría')),
      d('u4l1', 'Identifica qué elementos de tu proyecto se miden por m², ML y unidad.'),
      d('u4l2', 'Crea la tabla de pisos por m² con totales activados.', T.gate('qty', 'Cantidades')),
      d('arq1', 'Modela las columnas y vigas principales desde la pestaña Arquitectura.'),
      d('arq2', 'Revisa tu set de planos contra el checklist de entregables.', T.gate('plan', 'Planimetría')),
      d('u6l3', 'Valida el gate de coordinación: coordenadas compartidas y plantilla unificada.', T.gate('coord', 'Coordinación')),
      d('u6l6', 'Exporta tu modelo y revísalo con la disciplina estructural.', T.dashboard),
      d('u6l7', 'Organiza las carpetas de tu proyecto con la estructura CDE y la nomenclatura.', T.consult)
    ]
  },
  {
    id: 'ele-10',
    icon: '⚡',
    title: 'Modelado eléctrico · 10 días',
    desc: 'Dispositivos, circuitos, conduits, filtros y cantidades.',
    for: ['electrico'],
    days: [
      d('u2l1', 'Elige un proyecto eléctrico real para practicar.'),
      d('u2l2', 'Prepara el archivo eléctrico: plantilla, niveles y vínculo arquitectónico.', T.gate('arq', 'Modelado')),
      d('ele1', 'Coloca tomas y tablero, y crea los circuitos de un apartamento.', T.gate('ele', 'Eléctrico')),
      d('ele2', 'Traza los conduits a altura definida y crea el filtro por Service Type.', T.gate('ele', 'Eléctrico')),
      d('ele3', 'Saca las cantidades de conduit en ML y de accesorios por unidad.'),
      d('u4l1', 'Revisa qué categorías eléctricas se miden por ML y cuáles por unidad.'),
      d('u4l2', 'Configura la tabla de luminarias con totales.', T.gate('qty', 'Cantidades')),
      d('u6l3', 'Confirma que arquitectura y estructura estén validadas antes de coordinar.', T.gate('coord', 'Coordinación')),
      d('u6l6', 'Aplica la estrategia eléctrica de pases de 4" en una interferencia real.', T.dashboard),
      d('u6l7', 'Nombra tus archivos como PROYECTO_ELE-FZA.RVT y súbelos al CDE.', T.consult)
    ]
  },
  {
    id: 'hid-10',
    icon: '💧',
    title: 'Modelado hidrosanitario · 10 días',
    desc: 'Redes completas, System Types, etiquetas y cantidades.',
    for: ['hidrosanitario'],
    days: [
      d('u2l1', 'Elige un proyecto hidrosanitario real para practicar.'),
      d('u2l2', 'Prepara el archivo: plantilla, niveles y vínculo arquitectónico.', T.gate('arq', 'Modelado')),
      d('hid1', 'Modela la red de un baño completa, sin pendiente, con diámetros de cálculo.', T.gate('hid', 'Hidrosanitario')),
      d('hid2', 'Crea los System Types y el filtro por sistema; etiqueta diámetro, pendiente y altura.', T.gate('hid', 'Hidrosanitario')),
      d('hid3', 'Saca tuberías en ML y accesorios por unidad, separando codos de 45° y 90°.', T.market('Coordinación MEP')),
      d('u4l1', 'Revisa qué categorías se miden por ML y cuáles por unidad.'),
      d('u4l2', 'Configura la tabla de aparatos sanitarios con totales.', T.gate('qty', 'Cantidades')),
      d('u6l3', 'Confirma que arquitectura y estructura estén validadas antes de coordinar.', T.gate('coord', 'Coordinación')),
      d('u6l6', 'Resuelve una interferencia pasando la red por debajo de la estructura.', T.dashboard),
      d('u6l7', 'Nombra tus archivos como PROYECTO_HID.RVT y súbelos al CDE.', T.consult)
    ]
  },
  {
    id: 'hvac-8',
    icon: '❄️',
    title: 'Modelado HVAC · 8 días',
    desc: 'Ductos, equipos, cantidades y coordinación.',
    for: ['hvac'],
    days: [
      d('u2l1', 'Elige un proyecto con aire acondicionado para practicar.'),
      d('u2l2', 'Prepara el archivo mecánico con niveles y vínculo arquitectónico.', T.gate('arq', 'Modelado')),
      d('hvac1', 'Modela los ductos y las condensadoras y manejadoras de un piso.', T.gate('hvac', 'HVAC')),
      d('hvac2', 'Saca las cantidades de ductos y equipos.', T.gate('hvac', 'HVAC')),
      d('u4l1', 'Define si medirás los ductos por ML o por área.'),
      d('u6l3', 'Confirma el gate antes de iniciar la detección de interferencias.', T.gate('coord', 'Coordinación')),
      d('u6l6', 'Evalúa dónde la estrategia de cobre + Rubatex evita conflictos con estructura.', T.dashboard),
      d('u6l7', 'Organiza tus entregables HVAC en el CDE.', T.consult)
    ]
  },
  {
    id: 'coord-9',
    icon: '🧩',
    title: 'Coordinador BIM · 9 días',
    desc: 'Auditorías, gate, sistema de coordinación y CDE para liderar proyectos.',
    for: 'all',
    days: [
      d('u1l2', 'Redacta el BEP básico de tu proyecto: alcance, LOD, responsables y revisiones.', T.market('Consultoría BIM')),
      d('u1l4', 'Mapea qué herramienta usa cada disciplina de tu equipo.'),
      d('u6l1', 'Presenta a tu equipo la regla "coordinación es comunicación, no control".'),
      d('u6l2', 'Dibuja el flujo Cliente → Arquitectura → Estructura → MEP → Presupuesto → Obra de tu oficina.'),
      d('u6l3', 'Revisa el gate de coordinación de tu proyecto.', T.gate('coord', 'Coordinación')),
      d('u6l4', 'Haz la tabla persona / rol / nivel / potencial de tu equipo.'),
      d('u6l5', 'Haz el checklist tecnológico: versiones, worksets y coordenadas compartidas.'),
      d('u6l6', 'Clasifica las interferencias de tu modelo en críticas, medias y leves.', T.dashboard),
      d('u6l7', 'Monta la estructura del CDE y define 3 KPIs.', T.consult)
    ]
  }
];

export function planById(id) {
  return PLANS.find((p) => p.id === id) || null;
}

export function plansForProfile(profile) {
  const fit = (p) => p.for === 'all' || p.for.includes(profile);
  return [...PLANS.filter((p) => fit(p) && p.for !== 'all'), ...PLANS.filter((p) => p.for === 'all'), ...PLANS.filter((p) => !fit(p))];
}
