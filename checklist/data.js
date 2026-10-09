// Contenido del Checklist BIM de despegue (Playbook 2 · Checklist de despegue + Gate de coordinación del Playbook 3).
// Bilingüe: cada texto es { es, en }.

export const GROUPS = [
  {
    id: 'arq',
    icon: '📐',
    title: { es: 'Modelado arquitectónico', en: 'Architectural modeling' },
    sections: [
      {
        id: 'arq-setup',
        title: { es: 'Configuración inicial', en: 'Initial setup' },
        items: [
          { es: 'Plantilla correcta seleccionada', en: 'Correct template selected' },
          { es: 'Unidades configuradas correctamente', en: 'Units set up correctly' },
          { es: 'Niveles definidos en alzado', en: 'Levels defined in elevation' },
          { es: 'Rejillas colocadas', en: 'Grids placed' },
          { es: 'Norte definido', en: 'North defined' },
          { es: 'Planta AutoCAD insertada y alineada', en: 'AutoCAD plan linked and aligned' },
          { es: 'Archivo limpio sin líneas 2D innecesarias', en: 'Clean file with no unnecessary 2D lines' }
        ]
      },
      {
        id: 'arq-order',
        title: { es: 'Orden correcto de modelado', en: 'Correct modeling order' },
        items: [
          { es: 'Muros modelados', en: 'Walls modeled' },
          { es: 'Puertas insertadas correctamente', en: 'Doors placed correctly' },
          { es: 'Ventanas colocadas y alineadas', en: 'Windows placed and aligned' },
          { es: 'Pisos definidos por nivel', en: 'Floors defined per level' },
          { es: 'Cielos modelados', en: 'Ceilings modeled' },
          { es: 'Cubierta modelada', en: 'Roof modeled' },
          { es: 'Componentes especiales insertados', en: 'Special components placed' }
        ]
      },
      {
        id: 'arq-control',
        title: { es: 'Control técnico', en: 'Technical control' },
        items: [
          { es: 'Espesores correctos', en: 'Correct thicknesses' },
          { es: 'Materiales asignados', en: 'Materials assigned' },
          { es: 'Muros correctamente unidos', en: 'Walls properly joined' },
          { es: 'Sin advertencias críticas', en: 'No critical warnings' },
          { es: 'Habitaciones colocadas y nombradas', en: 'Rooms placed and named' }
        ]
      }
    ]
  },
  {
    id: 'plan',
    icon: '🗂️',
    title: { es: 'Planimetría', en: 'Drawings' },
    sections: [
      {
        id: 'plan-concept',
        title: { es: 'Planos conceptuales', en: 'Conceptual drawings' },
        items: [
          { es: 'Vistas duplicadas correctamente', en: 'Views duplicated correctly' },
          { es: 'Nombre de plano estandarizado', en: 'Standardized sheet names' },
          { es: 'Patrón de corte en negro', en: 'Cut pattern in black' },
          { es: 'Secciones longitudinales creadas', en: 'Longitudinal sections created' },
          { es: 'Secciones transversales creadas', en: 'Cross sections created' },
          { es: 'Rellenos en corte configurados', en: 'Cut fills configured' },
          { es: 'Plantas acotadas', en: 'Plans dimensioned' },
          { es: 'Niveles visibles', en: 'Levels visible' },
          { es: 'Rejillas visibles', en: 'Grids visible' },
          { es: 'Tabla de áreas creada', en: 'Area schedule created' },
          { es: 'Site plan incluido', en: 'Site plan included' },
          { es: 'Norte colocado', en: 'North arrow placed' },
          { es: 'Linderos acotados', en: 'Property lines dimensioned' },
          { es: 'Andén y calzada dibujados', en: 'Sidewalk and roadway drawn' }
        ]
      },
      {
        id: 'plan-constr',
        title: { es: 'Planos constructivos', en: 'Construction drawings' },
        items: [
          { es: 'Planos de cielo creados', en: 'Reflected ceiling plans created' },
          { es: 'Detalles de baños', en: 'Bathroom details' },
          { es: 'Detalles de cocina', en: 'Kitchen details' },
          { es: 'Detalles de pisos', en: 'Floor details' },
          { es: 'Detalles de muros (alma y acabado)', en: 'Wall details (core and finish)' }
        ]
      }
    ]
  },
  {
    id: 'qty',
    icon: '📊',
    title: { es: 'Cantidades · Arquitectura', en: 'Quantities · Architecture' },
    sections: [
      {
        id: 'qty-m2',
        title: { es: 'Elementos por m²', en: 'Items by m²' },
        items: [
          { es: 'Tabla creada por categoría', en: 'Schedule created per category' },
          { es: 'Campos: Type y Area', en: 'Fields: Type and Area' },
          { es: 'Sort por Type', en: 'Sorted by Type' },
          { es: '"Itemize every instance" desactivado', en: '"Itemize every instance" turned off' },
          { es: 'Totales activados en Area', en: 'Totals enabled on Area' }
        ]
      },
      {
        id: 'qty-ml',
        title: { es: 'Elementos por ML', en: 'Items by linear meter' },
        items: [
          { es: 'Campos: Type y Length', en: 'Fields: Type and Length' },
          { es: 'Sort por Type', en: 'Sorted by Type' },
          { es: 'Totales activados', en: 'Totals enabled' }
        ]
      },
      {
        id: 'qty-unit',
        title: { es: 'Elementos por unidad', en: 'Items by unit' },
        items: [
          { es: 'Campos: Type y Count', en: 'Fields: Type and Count' },
          { es: 'Totales activados', en: 'Totals enabled' }
        ]
      }
    ]
  },
  {
    id: 'ele',
    icon: '⚡',
    title: { es: 'Eléctrico', en: 'Electrical' },
    sections: [
      {
        id: 'ele-model',
        title: { es: 'Modelado', en: 'Modeling' },
        items: [
          { es: 'Tomas colocadas correctamente', en: 'Receptacles placed correctly' },
          { es: 'Alturas definidas', en: 'Mounting heights defined' },
          { es: 'Tablero eléctrico insertado', en: 'Electrical panel placed' },
          { es: 'Circuitos creados (Power asignado)', en: 'Circuits created (Power assigned)' },
          { es: 'Luminarias colocadas', en: 'Light fixtures placed' },
          { es: 'Interruptores colocados', en: 'Switches placed' }
        ]
      },
      {
        id: 'ele-conduit',
        title: { es: 'Conduits', en: 'Conduits' },
        items: [
          { es: 'Altura definida antes de trazar', en: 'Height set before drawing' },
          { es: 'Tuberías alineadas correctamente', en: 'Conduits aligned correctly' },
          { es: 'Cajas 4x4 conectadas', en: '4x4 boxes connected' },
          { es: 'Service Type asignado', en: 'Service Type assigned' }
        ]
      },
      {
        id: 'ele-filters',
        title: { es: 'Filtros', en: 'Filters' },
        items: [
          { es: 'Filtro creado por Service Type', en: 'Filter created by Service Type' },
          { es: 'Vista duplicada por sistema', en: 'View duplicated per system' },
          { es: 'Tomas separadas de iluminación', en: 'Power separated from lighting' },
          { es: 'Voz y datos separados', en: 'Voice and data separated' }
        ]
      },
      {
        id: 'ele-qty',
        title: { es: 'Cantidades', en: 'Quantities' },
        items: [
          { es: 'Conduits → ML', en: 'Conduits → linear meters' },
          { es: 'Conduit Fittings → unidad', en: 'Conduit Fittings → units' },
          { es: 'Electrical Fixtures → unidad', en: 'Electrical Fixtures → units' },
          { es: 'Lighting Fixtures → unidad', en: 'Lighting Fixtures → units' },
          { es: 'Lighting Devices → unidad', en: 'Lighting Devices → units' }
        ]
      }
    ]
  },
  {
    id: 'hid',
    icon: '💧',
    title: { es: 'Hidrosanitario', en: 'Plumbing' },
    sections: [
      {
        id: 'hid-model',
        title: { es: 'Modelado', en: 'Modeling' },
        items: [
          { es: 'Diámetros correctos', en: 'Correct diameters' },
          { es: 'Tuberías modeladas completas', en: 'Pipes fully modeled' },
          { es: 'System Type creado', en: 'System Type created' },
          { es: 'System Type aplicado', en: 'System Type applied' }
        ]
      },
      {
        id: 'hid-vis',
        title: { es: 'Visualización', en: 'Visualization' },
        items: [
          { es: 'Filtro creado por sistema', en: 'Filter created per system' },
          { es: 'Vista duplicada por disciplina', en: 'View duplicated per discipline' },
          { es: 'Etiquetas con diámetro', en: 'Tags showing diameter' },
          { es: 'Etiquetas con pendiente', en: 'Tags showing slope' },
          { es: 'Etiquetas con altura', en: 'Tags showing elevation' }
        ]
      },
      {
        id: 'hid-qty',
        title: { es: 'Cantidades', en: 'Quantities' },
        items: [
          { es: 'Pipes → ML', en: 'Pipes → linear meters' },
          { es: 'Pipe Fittings → unidad', en: 'Pipe Fittings → units' },
          { es: 'Diferenciación codos 45° y 90°', en: '45° and 90° elbows counted separately' },
          { es: 'Aparatos sanitarios → unidad', en: 'Plumbing fixtures → units' }
        ]
      }
    ]
  },
  {
    id: 'hvac',
    icon: '❄️',
    title: { es: 'HVAC', en: 'HVAC' },
    sections: [
      {
        id: 'hvac-model',
        title: { es: 'Modelado', en: 'Modeling' },
        items: [
          { es: 'Ductos modelados', en: 'Ducts modeled' },
          { es: 'Sección correcta seleccionada', en: 'Correct section selected' },
          { es: 'Tamaños ajustados', en: 'Sizes adjusted' },
          { es: 'Condensadoras modeladas', en: 'Condensing units modeled' },
          { es: 'Manejadoras modeladas', en: 'Air handlers modeled' }
        ]
      },
      {
        id: 'hvac-qty',
        title: { es: 'Cantidades', en: 'Quantities' },
        items: [
          { es: 'Ducts → ML o área', en: 'Ducts → linear meters or area' },
          { es: 'Equipos → unidad', en: 'Equipment → units' }
        ]
      }
    ]
  },
  {
    id: 'coord',
    icon: '🧩',
    title: { es: 'Gate de coordinación', en: 'Coordination gate' },
    sections: [
      {
        id: 'coord-gate',
        title: { es: 'Antes de iniciar clash detection', en: 'Before starting clash detection' },
        items: [
          { es: 'Topografía revisada por constructora', en: 'Survey reviewed by the contractor' },
          { es: 'Arquitectura validada', en: 'Architecture validated' },
          { es: 'Estructura validada', en: 'Structure validated' },
          { es: 'Coordenadas compartidas configuradas', en: 'Shared coordinates set up' },
          { es: 'Plantilla Revit unificada', en: 'Unified Revit template' }
        ]
      }
    ]
  }
];

// Clave estable de cada ítem: "<sección>:<índice>"
export function itemKey(sectionId, index) {
  return `${sectionId}:${index}`;
}

export function allItemKeys() {
  return GROUPS.flatMap((g) => g.sections.flatMap((s) => s.items.map((_, i) => itemKey(s.id, i))));
}
