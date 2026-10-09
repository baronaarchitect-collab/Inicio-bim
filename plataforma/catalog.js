// Catálogo público de la plataforma (títulos y descripciones).
// Las URLs NO están aquí: viven en Firestore en proLinks/{id} y solo se leen con acceso PRO
// (ver firestore.rules y la función seedProLinks() de wompi/Code.gs).

export const PLAYBOOKS = [
  {
    id: 'pb-mitos',
    cat: 'start',
    format: 'PDF',
    title: { es: 'Tres mitos sobre iniciar en BIM', en: 'Three myths about starting with BIM' },
    desc: { es: 'BIM no es tamaño, es método. Estrategia, BEP, LOD y la guía de implementación para diseño y construcción.', en: 'BIM is method, not size. Strategy, BEP, LOD and the implementation guide for design and construction.' }
  },
  {
    id: 'pb-pilares',
    cat: 'model',
    format: 'PDF',
    title: { es: 'Los 3 pilares: modelado, planimetría y cantidades', en: 'The 3 pillars: modeling, drawings and quantities' },
    desc: { es: 'Orden de modelado, estructura de planos, tablas de cantidades y modelado eléctrico, hidrosanitario, HVAC y estructural.', en: 'Modeling order, sheet structure, quantity schedules and electrical, plumbing, HVAC and structural modeling.' }
  },
  {
    id: 'pb-consultoria',
    cat: 'manage',
    format: 'PDF',
    title: { es: 'Consultoría BIM: implementación en oficina', en: 'BIM consulting: office implementation' },
    desc: { es: 'Auditoría de procesos, personas y tecnología, sistema de coordinación, CDE, riesgos, KPIs y plan piloto.', en: 'Process, people and technology audit, coordination system, CDE, risks, KPIs and pilot plan.' }
  },
  {
    id: 'pb-mep',
    cat: 'coord',
    format: 'MD',
    title: { es: 'Coordinación MEP automatizada en Revit', en: 'Automated MEP coordination in Revit' },
    desc: { es: 'Nivelación de redes, archivo MEP unificado, fittings offset en cruces, detección de interferencias e informe HTML.', en: 'Network leveling, unified MEP file, offset fittings at crossings, clash detection and HTML report.' }
  },
  {
    id: 'pb-lote-cali',
    cat: 'urban',
    format: 'PDF',
    title: { es: 'Cómo encontrar la normativa de un lote en Cali', en: 'How to find the zoning rules for a lot in Cali' },
    desc: { es: 'Del recibo predial a la volumetría paramétrica en Revit: viabilidad normativa antes de comprometer recursos.', en: 'From the tax bill to a parametric massing in Revit: zoning feasibility before committing resources.' }
  },
  {
    id: 'pb-pot-cali',
    cat: 'urban',
    format: 'PDF',
    title: { es: 'Normas volumétricas POT Cali', en: 'Cali POT massing rules' },
    desc: { es: 'Acuerdo 0373 de 2014: tratamientos C1–C3 y Desarrollo para vivienda y comercio. Menos reprocesos en curaduría.', en: 'Agreement 0373 of 2014: C1–C3 and Development treatments for housing and retail. Fewer permit resubmittals.' }
  },
  {
    id: 'pb-applyleveltotag',
    cat: 'plugins',
    format: 'PDF',
    title: { es: 'Plugin Apply Level To Tag', en: 'Apply Level To Tag plugin' },
    desc: { es: 'Instalación y uso: asigna automáticamente el nivel de referencia a todas las tuberías antes de los planos de detalle.', en: 'Install and use: automatically assigns the reference level to every pipe before detail drawings.' }
  },
  {
    id: 'pb-cadtorevit',
    cat: 'plugins',
    format: 'PDF',
    title: { es: 'Plugin CAD to Revit Converter', en: 'CAD to Revit Converter plugin' },
    desc: { es: 'Instalación, verificación y flujo semanal para convertir redes CAD complejas en elementos de Revit.', en: 'Install, verify and weekly workflow to turn complex CAD networks into Revit elements.' }
  }
];

export const CATEGORIES = {
  start: { es: 'Inicio BIM', en: 'Getting started' },
  model: { es: 'Modelado', en: 'Modeling' },
  manage: { es: 'Gestión', en: 'Management' },
  coord: { es: 'Coordinación', en: 'Coordination' },
  urban: { es: 'Normativa', en: 'Zoning' },
  plugins: { es: 'Plugins Revit', en: 'Revit plugins' }
};

// Herramientas. "link" = id en proLinks (protegido); "href" = ruta pública.
export const TOOLS = [
  {
    id: 'coord-dashboard',
    icon: '🧭',
    link: 'coord-dashboard',
    title: { es: 'Coordination control', en: 'Coordination control' },
    desc: { es: 'Tablero de coordinación por gates: decisiones de diseño, revisión de modelos, interferencias y entrega a obra.', en: 'Gate-based coordination board: design decisions, model checks, clashes and site handoff.' }
  },
  {
    id: 'checklist',
    icon: '✅',
    route: 'checklist',
    title: { es: 'Checklist BIM de despegue', en: 'BIM launch checklist' },
    desc: { es: '92 controles en 7 gates, por proyecto, con estados, notas e impresión.', en: '92 checks across 7 gates, per project, with statuses, notes and printing.' }
  },
  {
    id: 'course',
    icon: '🔥',
    href: '../',
    free: true,
    title: { es: 'Despegue BIM: planes diarios', en: 'Despegue BIM: daily plans' },
    desc: { es: 'Lecciones de 5 minutos, planes por especialidad, videos y recordatorios para crear el hábito.', en: '5-minute lessons, plans per discipline, videos and reminders to build the habit.' }
  }
];
