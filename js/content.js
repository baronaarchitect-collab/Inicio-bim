// Contenido del curso, en el orden de los playbooks de Life City:
//   Playbook 1 · Tres mitos sobre iniciar en BIM
//   Playbook 2 · Los 3 pilares del modelado BIM (Modelado – Planimetría – Cantidades + especialidades)
//   Playbook 3 · Consultoría BIM / Guía de implementación BIM en oficina
//
// Tipos de ejercicio:
//   card  -> tarjeta de enseñanza { title, body, bullets? }
//   mc    -> opción múltiple { q, options, answer (índice), explain }
//   tf    -> verdadero/falso { q, answer (bool), explain }
//   fill  -> completar la frase { q (con ___), options, answer (índice), explain }
//   order -> ordenar pasos { q, items (en orden correcto), explain }
//   match -> emparejar { q, pairs: [[izq, der], ...] }

export const PROFILES = [
  { id: 'arquitecto', label: 'Arquitecto(a)', icon: '📐', specialtyUnit: 'esp-arq' },
  { id: 'electrico', label: 'Ing. Eléctrico(a)', icon: '⚡', specialtyUnit: 'esp-ele' },
  { id: 'hidrosanitario', label: 'Ing. Hidrosanitario(a)', icon: '💧', specialtyUnit: 'esp-hid' },
  { id: 'hvac', label: 'Ing. Mecánico / HVAC', icon: '❄️', specialtyUnit: 'esp-hvac' },
  { id: 'estructural', label: 'Ing. Estructural', icon: '🏗️', specialtyUnit: 'esp-est' }
];

export const UNITS = [
  // ───────────────────────── PLAYBOOK 1 ─────────────────────────
  {
    id: 'u1',
    track: 'common',
    playbook: 'Playbook 1 · Tres mitos sobre iniciar en BIM',
    title: 'Despegue: 3 mitos de BIM',
    subtitle: 'BIM no es tamaño, es método',
    color: '#2e9e5b',
    lessons: [
      {
        id: 'u1l1',
        title: 'Mito 1: "BIM es solo para proyectos grandes"',
        items: [
          {
            type: 'card',
            title: 'BIM no es tamaño. Es método.',
            body: 'Lo que cambia entre un proyecto pequeño y uno grande no es si aplica BIM, sino el nivel de estructuración del proyecto.',
            bullets: [
              'Viviendas unifamiliares',
              'Edificios medianos',
              'Remodelaciones técnicas',
              'Proyectos industriales pequeños',
              'Coordinaciones específicas (eléctrico, hidrosanitario, HVAC)'
            ]
          },
          {
            type: 'tf',
            q: 'BIM solo es rentable en proyectos de gran escala.',
            answer: false,
            explain: 'BIM funciona en viviendas, remodelaciones y coordinaciones puntuales. Es método, no tamaño.'
          },
          {
            type: 'fill',
            q: 'Si tu proyecto tiene planos, tiene ___.',
            options: ['interferencias', 'licencias', 'renders'],
            answer: 0,
            explain: 'Y si tiene interferencias, necesita BIM.'
          },
          {
            type: 'mc',
            q: '¿Qué cambia realmente cuando aplicas BIM a un proyecto pequeño?',
            options: [
              'El nivel de estructuración del proyecto',
              'El tamaño del equipo de diseño',
              'El software obligatorio por ley',
              'La escala de los planos'
            ],
            answer: 0,
            explain: 'Lo que cambia no es el tamaño, es qué tan estructurado está el proyecto.'
          },
          {
            type: 'mc',
            q: '¿En cuál de estos casos funciona BIM?',
            options: [
              'Todos los anteriores',
              'Una vivienda unifamiliar',
              'Una remodelación técnica',
              'Una coordinación solo hidrosanitaria'
            ],
            answer: 0,
            explain: 'Todos son casos reales donde BIM reduce interferencias.'
          }
        ]
      },
      {
        id: 'u1l2',
        title: 'Mito 2: "Necesito todo modelado para empezar"',
        items: [
          {
            type: 'card',
            title: 'BIM empieza con estrategia, no con modelado perfecto',
            body: 'No necesitas tenerlo todo perfecto. Necesitas un método de trabajo claro.',
            bullets: [
              'Alcance definido',
              'BEP básico (Plan de Ejecución BIM)',
              'Nivel de desarrollo claro (LOD)',
              'Responsable de coordinación',
              'Flujo de revisión y control'
            ]
          },
          {
            type: 'tf',
            q: 'Antes de iniciar en BIM debo tener todo el proyecto modelado a la perfección.',
            answer: false,
            explain: 'Se arranca con alcance, BEP, LOD, responsable y flujo de revisión.'
          },
          {
            type: 'match',
            q: 'Empareja cada concepto con su significado',
            pairs: [
              ['BEP', 'Plan de Ejecución BIM'],
              ['LOD', 'Nivel de desarrollo'],
              ['Alcance', 'Qué se modela y para qué'],
              ['Coordinador', 'Responsable de coordinación']
            ]
          },
          {
            type: 'fill',
            q: 'BIM no es un software. Es una forma de organizar ___.',
            options: ['decisiones', 'archivos', 'licencias'],
            answer: 0,
            explain: 'El software es la herramienta; BIM es el método de decisión.'
          },
          {
            type: 'mc',
            q: '¿Cuál de estos elementos NO es requisito para empezar en BIM?',
            options: [
              'Un modelo 100% terminado',
              'Alcance definido',
              'Responsable de coordinación',
              'Flujo de revisión y control'
            ],
            answer: 0,
            explain: 'El modelo se construye en el proceso; el método va primero.'
          }
        ]
      },
      {
        id: 'u1l3',
        title: 'Mito 3: "BIM es un gasto adicional"',
        items: [
          {
            type: 'card',
            title: 'BIM no cuesta. Lo que cuesta es corregir en obra.',
            body: 'BIM traslada el error del concreto al modelo. Es inversión en previsibilidad, reducción de riesgo y control técnico.',
            bullets: ['Retrabajos', 'Cambios tardíos', 'Descoordinación entre disciplinas', 'Retrasos en cronograma', 'Estrés operativo']
          },
          {
            type: 'fill',
            q: 'BIM traslada el error del ___ al modelo.',
            options: ['concreto', 'cliente', 'presupuesto'],
            answer: 0,
            explain: 'Corregir en el modelo es mucho más barato que demoler en obra.'
          },
          {
            type: 'tf',
            q: 'BIM es una inversión en previsibilidad.',
            answer: true,
            explain: 'Reduce riesgo y da control técnico antes de construir.'
          },
          {
            type: 'mc',
            q: '¿Cuál NO es un costo típico de un proyecto sin BIM?',
            options: [
              'Previsibilidad del cronograma',
              'Retrabajos',
              'Cambios tardíos',
              'Descoordinación entre disciplinas'
            ],
            answer: 0,
            explain: 'La previsibilidad es justamente lo que gana un proyecto con BIM.'
          },
          {
            type: 'match',
            q: 'Empareja el problema con lo que BIM aporta',
            pairs: [
              ['Retrabajos en obra', 'Error corregido en el modelo'],
              ['Cambios tardíos', 'Decisiones tempranas'],
              ['Retrasos', 'Previsibilidad'],
              ['Descoordinación', 'Control técnico']
            ]
          }
        ]
      },
      {
        id: 'u1l4',
        title: 'Guía de implementación: tecnología y proceso',
        items: [
          {
            type: 'card',
            title: 'Tres áreas clave: tecnología, proceso y capacitación',
            body: 'Para implementar BIM de forma integral necesitas herramientas para cada dimensión de la metodología.',
            bullets: [
              'Revit (3D): modelado preciso y detallado',
              'Navisworks: federar disciplinas, clash detection y 4D',
              'MS Project: cronograma vinculado al modelo (4D)',
              'Google Workspace: colaboración y organización del equipo'
            ]
          },
          {
            type: 'match',
            q: 'Empareja cada herramienta con su función',
            pairs: [
              ['Revit', 'Modelado 3D'],
              ['Navisworks', 'Detección de interferencias'],
              ['MS Project', 'Cronograma (4D)'],
              ['Google Workspace', 'Colaboración del equipo']
            ]
          },
          {
            type: 'order',
            q: 'Ordena las 6 etapas del proceso BIM de diseño y construcción',
            items: [
              'Levantamiento de lo existente',
              'Modelado arquitectónico',
              'Modelado MEP',
              'Coordinación y detallado',
              'Presupuesto',
              'Planos constructivos'
            ],
            explain: 'Del levantamiento al manual de construcción, cada etapa alimenta la siguiente.'
          },
          {
            type: 'mc',
            q: '¿Qué herramienta integra arquitectura, estructura y MEP para detectar interferencias y simular 4D?',
            options: ['Navisworks', 'Revit', 'MS Project', 'AutoCAD'],
            answer: 0,
            explain: 'Navisworks es la herramienta clave para anticipar errores antes de obra.'
          },
          {
            type: 'tf',
            q: 'La capacitación es una de las tres áreas clave de la implementación BIM.',
            answer: true,
            explain: 'Tecnología, proceso y capacitación.'
          }
        ]
      }
    ]
  },

  // ───────────────────────── PLAYBOOK 2 · Pilar 1 ─────────────────────────
  {
    id: 'u2',
    track: 'common',
    playbook: 'Playbook 2 · Los 3 pilares del modelado BIM',
    title: 'Pilar 1: Modelado',
    subtitle: 'El modelo es base de información',
    color: '#1f7a8c',
    lessons: [
      {
        id: 'u2l1',
        title: 'Los 3 pilares del modelado BIM',
        items: [
          {
            type: 'card',
            title: 'Modelado → Planimetría → Cantidades',
            body: 'Modelado correcto → planimetría clara → cantidades confiables. Si uno falla, los otros dos se rompen.'
          },
          {
            type: 'order',
            q: 'Ordena los 3 pilares del modelado BIM',
            items: ['Modelado', 'Planimetría', 'Cantidades'],
            explain: 'Cada pilar depende del anterior.'
          },
          {
            type: 'tf',
            q: 'El modelo BIM es, ante todo, un dibujo 3D.',
            answer: false,
            explain: 'El modelo no es dibujo 3D: es base de información.'
          },
          {
            type: 'fill',
            q: 'Si las cantidades no salen bien, el problema es el ___.',
            options: ['modelado', 'software', 'presupuesto'],
            answer: 0,
            explain: 'Si el modelo está bien hecho, las cantidades salen solas.'
          },
          {
            type: 'mc',
            q: '¿Qué pasa si falla uno de los 3 pilares?',
            options: [
              'Los otros dos se rompen',
              'Solo se afecta ese pilar',
              'Se compensa con más planos',
              'No pasa nada si el render es bueno'
            ],
            answer: 0,
            explain: 'Los pilares están encadenados.'
          }
        ]
      },
      {
        id: 'u2l2',
        title: 'Preparación del modelo',
        items: [
          {
            type: 'card',
            title: 'Paso 1 · Preparación',
            body: 'Modela en orden lógico y estructurado desde el inicio para evitar reprocesos.',
            bullets: ['Seleccionar plantilla adecuada', 'Configurar unidades', 'Ajustar niveles en alzado', 'Insertar planta AutoCAD como referencia']
          },
          {
            type: 'order',
            q: 'Ordena los pasos de preparación',
            items: ['Seleccionar plantilla', 'Configurar unidades', 'Ajustar niveles en alzado', 'Insertar planta AutoCAD como referencia'],
            explain: 'Plantilla y unidades primero: todo lo demás depende de ellas.'
          },
          {
            type: 'mc',
            q: '¿Cuál NO hace parte del checklist inicial obligatorio?',
            options: ['Render fotorrealista', 'Plantilla correcta', 'Rejillas colocadas', 'Norte definido'],
            answer: 0,
            explain: 'Checklist: plantilla, niveles, rejillas, norte y modelo limpio.'
          },
          {
            type: 'tf',
            q: 'Un modelo limpio no debe tener líneas 2D innecesarias.',
            answer: true,
            explain: 'Las líneas 2D sueltas no son información y ensucian el modelo.'
          },
          {
            type: 'mc',
            q: '¿En qué tipo de vista se ajustan los niveles?',
            options: ['Alzado', 'Planta de cielo', 'Vista 3D', 'Tabla de cantidades'],
            answer: 0,
            explain: 'Los niveles se definen y ajustan en alzado.'
          }
        ]
      },
      {
        id: 'u2l3',
        title: 'El orden correcto de modelado',
        items: [
          {
            type: 'card',
            title: 'Sigue la pestaña Arquitectura de Revit',
            body: 'Siempre de lo estructural a lo detallado.',
            bullets: ['1. Muros', '2. Puertas', '3. Ventanas', '4. Pisos', '5. Cielos', '6. Cubiertas', '7. Componentes']
          },
          {
            type: 'order',
            q: 'Ordena los elementos según el orden correcto de modelado',
            items: ['Muros', 'Puertas', 'Ventanas', 'Pisos', 'Cielos', 'Cubiertas', 'Componentes'],
            explain: 'Es el mismo orden de la pestaña Arquitectura.'
          },
          {
            type: 'fill',
            q: 'Siempre se modela de lo ___ a lo detallado.',
            options: ['estructural', 'decorativo', 'exterior'],
            answer: 0,
            explain: 'Primero lo que soporta, luego lo que se apoya.'
          },
          {
            type: 'mc',
            q: '¿Qué se modela inmediatamente antes de las puertas?',
            options: ['Muros', 'Pisos', 'Cubiertas', 'Componentes'],
            answer: 0,
            explain: 'Las puertas son elementos alojados en muros.'
          }
        ]
      },
      {
        id: 'u2l4',
        title: 'Control técnico del modelo',
        items: [
          {
            type: 'card',
            title: 'Checklist de control técnico',
            body: 'Antes de pasar a planimetría, valida la calidad del modelo.',
            bullets: ['Espesores correctos', 'Materiales asignados', 'Muros correctamente unidos', 'Sin advertencias críticas', 'Habitaciones colocadas y nombradas']
          },
          {
            type: 'mc',
            q: '¿Qué debes resolver antes de entregar el modelo a planimetría?',
            options: ['Advertencias críticas', 'El color del fondo', 'La versión del navegador', 'El logo del rótulo'],
            answer: 0,
            explain: 'Un modelo con advertencias críticas genera planos y cantidades errados.'
          },
          {
            type: 'tf',
            q: 'Las habitaciones deben colocarse y nombrarse en el modelo.',
            answer: true,
            explain: 'Alimentan la tabla de áreas y los planos.'
          },
          {
            type: 'match',
            q: 'Empareja el control con lo que asegura',
            pairs: [
              ['Espesores correctos', 'Cantidades reales'],
              ['Materiales asignados', 'Información por elemento'],
              ['Muros unidos', 'Geometría limpia'],
              ['Habitaciones nombradas', 'Tabla de áreas']
            ]
          }
        ]
      }
    ]
  },

  // ───────────────────────── PLAYBOOK 2 · Pilar 2 ─────────────────────────
  {
    id: 'u3',
    track: 'common',
    playbook: 'Playbook 2 · Los 3 pilares del modelado BIM',
    title: 'Pilar 2: Planimetría',
    subtitle: 'La planimetría comunica decisiones',
    color: '#6a4c93',
    lessons: [
      {
        id: 'u3l1',
        title: 'Planos conceptuales',
        items: [
          {
            type: 'card',
            title: 'El modelo produce información; la planimetría comunica decisiones',
            body: 'Cada plano debe tener un propósito claro.',
            bullets: [
              'Duplicar vistas y nombrar cada plano',
              'Patrón de corte en negro; rellenos en gris/negro',
              'Secciones longitudinales y transversales',
              'Plantas acotadas con niveles y rejillas visibles',
              'Habitaciones nombradas + tabla de áreas'
            ]
          },
          {
            type: 'fill',
            q: 'El modelo produce información; la planimetría comunica ___.',
            options: ['decisiones', 'renders', 'licencias'],
            answer: 0,
            explain: 'Un plano sin propósito no comunica nada.'
          },
          {
            type: 'mc',
            q: '¿De qué color va el patrón de corte en planos conceptuales?',
            options: ['Negro', 'Rojo', 'Azul', 'Sin patrón'],
            answer: 0,
            explain: 'Patrón de corte en negro y rellenos en gris/negro.'
          },
          {
            type: 'mc',
            q: '¿Qué contiene el Plano 1?',
            options: ['Site + N1 + cuadro de áreas', 'Solo fachadas', 'Detalles de baños', 'Cortes estructurales'],
            answer: 0,
            explain: 'Además: norte, linderos acotados, andén y calzada.'
          },
          {
            type: 'tf',
            q: 'En planos conceptuales se requieren secciones longitudinales y transversales.',
            answer: true,
            explain: 'Ambas secciones explican el proyecto en altura.'
          }
        ]
      },
      {
        id: 'u3l2',
        title: 'Estructura de planos y View Templates',
        items: [
          {
            type: 'card',
            title: 'Plantilla de estructura de planos',
            body: 'Duplica vistas y aplica View Template desde el inicio.',
            bullets: ['A-01 Site', 'A-02 Planta N1', 'A-03 Planta N2', 'A-04 Cortes', 'A-05 Fachadas', 'A-06 Detalles']
          },
          {
            type: 'match',
            q: 'Empareja el código con su contenido',
            pairs: [
              ['A-01', 'Site'],
              ['A-02', 'Planta N1'],
              ['A-04', 'Cortes'],
              ['A-05', 'Fachadas'],
              ['A-06', 'Detalles']
            ]
          },
          {
            type: 'order',
            q: 'Ordena el set de planos arquitectónicos',
            items: ['Site', 'Planta N1', 'Planta N2', 'Cortes', 'Fachadas', 'Detalles'],
            explain: 'De lo general (lote) a lo particular (detalle).'
          },
          {
            type: 'mc',
            q: '¿Qué aplicas a las vistas duplicadas desde el inicio para mantener coherencia gráfica?',
            options: ['View Template', 'Un render', 'Un vínculo IFC', 'Un workset nuevo'],
            answer: 0,
            explain: 'El View Template controla escala, visibilidad y gráficos de forma consistente.'
          }
        ]
      },
      {
        id: 'u3l3',
        title: 'Planos constructivos',
        items: [
          {
            type: 'card',
            title: 'De la idea a la obra',
            body: 'Los planos constructivos llevan el diseño a un nivel ejecutable.',
            bullets: ['Planos de cielo', 'Detalles de baños', 'Detalles de cocina', 'Pisos', 'Muros (alma y acabados)']
          },
          {
            type: 'mc',
            q: '¿Cuál de estos NO es un plano constructivo del playbook?',
            options: ['Render de mercadeo', 'Planos de cielo', 'Detalles de cocina', 'Detalles de pisos'],
            answer: 0,
            explain: 'El render vende; el plano constructivo construye.'
          },
          {
            type: 'tf',
            q: 'Los detalles de muros deben mostrar alma y acabados.',
            answer: true,
            explain: 'Así se entiende la composición real del muro.'
          },
          {
            type: 'fill',
            q: 'Antes de construir, los baños y la cocina requieren planos de ___.',
            options: ['detalle', 'mercadeo', 'localización'],
            answer: 0,
            explain: 'Son los espacios con más instalaciones y acabados.'
          }
        ]
      }
    ]
  },

  // ───────────────────────── PLAYBOOK 2 · Pilar 3 ─────────────────────────
  {
    id: 'u4',
    track: 'common',
    playbook: 'Playbook 2 · Los 3 pilares del modelado BIM',
    title: 'Pilar 3: Cantidades',
    subtitle: 'Si el modelo está bien, las cantidades salen solas',
    color: '#c9752b',
    upsellAfter: 'midway',
    lessons: [
      {
        id: 'u4l1',
        title: 'm², ML y unidad',
        items: [
          {
            type: 'card',
            title: 'Tres formas de medir',
            body: 'Diferencia las mediciones por área, longitud o unidad para un control presupuestal temprano.',
            bullets: ['m² → suelos, muros, cielos (Type + Area)', 'ML → cornisas, elementos lineales (Type + Length)', 'Unidad → puertas, aparatos, equipos (Type + Count)']
          },
          {
            type: 'match',
            q: 'Empareja el elemento con su unidad de medida',
            pairs: [
              ['Pisos', 'm²'],
              ['Cornisas', 'ML'],
              ['Puertas', 'Unidad'],
              ['Cielos', 'm²']
            ]
          },
          {
            type: 'mc',
            q: '¿Qué campos usas para una tabla de elementos por m²?',
            options: ['Type y Area', 'Type y Count', 'Type y Length', 'Level y Mark'],
            answer: 0,
            explain: 'Area para m²; Length para ML; Count para unidades.'
          },
          {
            type: 'fill',
            q: 'Para elementos lineales como cornisas, el campo clave es ___.',
            options: ['Length', 'Area', 'Count'],
            answer: 0,
            explain: 'Length entrega metros lineales.'
          }
        ]
      },
      {
        id: 'u4l2',
        title: 'Configura una tabla de cantidades',
        items: [
          {
            type: 'card',
            title: 'Tabla de cantidades en Revit',
            body: 'Fields: Type + Area. Sort & Group: Sort by Type y desactiva "Itemize every instance". Formato: activa el cálculo de totales.'
          },
          {
            type: 'order',
            q: 'Ordena la creación de una tabla por m²',
            items: ['Crear tabla por categoría', 'Agregar campos Type y Area', 'Ordenar por Type', 'Desactivar "Itemize every instance"', 'Activar totales en Area'],
            explain: 'Así obtienes un total por tipo, listo para presupuesto.'
          },
          {
            type: 'tf',
            q: 'Para agrupar por tipo, "Itemize every instance" debe estar activado.',
            answer: false,
            explain: 'Se desactiva para que cada tipo quede en una sola fila con su total.'
          },
          {
            type: 'mc',
            q: '¿Dónde se activa el cálculo de totales?',
            options: ['En Formato, sobre el campo Area', 'En la vista 3D', 'En Gestionar > Unidades', 'En el rótulo del plano'],
            answer: 0,
            explain: 'Formatting → Calculate totals.'
          }
        ]
      }
    ]
  },

  // ───────────────────────── PLAYBOOK 2 · Especialidades ─────────────────────────
  {
    id: 'esp-arq',
    track: 'specialty',
    specialty: 'arquitecto',
    playbook: 'Playbook 2 · Checklist de despegue',
    title: 'Especialidad: Arquitectura',
    subtitle: 'Estructura de apoyo y control de entregables',
    color: '#2e9e5b',
    lessons: [
      {
        id: 'arq1',
        title: 'Vigas y columnas desde Arquitectura',
        items: [
          {
            type: 'card',
            title: 'Estructura para coordinar desde el diseño',
            body: 'Modela vigas y columnas a través de la pestaña Arquitectura. Inserta familias del contenido de Autodesk (redondas, cuadradas, concreto, acero), duplícalas y crea los tamaños de los planos de ingeniería.'
          },
          {
            type: 'order',
            q: 'Ordena el flujo para modelar columnas',
            items: ['Cargar familia del contenido de Autodesk', 'Duplicar la familia', 'Crear el tamaño especificado en ingeniería', 'Colocar en el modelo'],
            explain: 'Duplicar evita dañar la familia original.'
          },
          {
            type: 'tf',
            q: 'Es eficiente modelar todo el refuerzo de acero del proyecto en BIM.',
            answer: false,
            explain: 'Aún no hay un proceso eficiente; el refuerzo se modela solo en elementos puntuales como piscinas.'
          }
        ]
      },
      {
        id: 'arq2',
        title: 'Checklist de entregables arquitectónicos',
        items: [
          {
            type: 'card',
            title: 'Checklist de planimetría',
            body: 'Revisa estos puntos antes de emitir.',
            bullets: ['Nombre de plano estandarizado', 'Niveles y rejillas visibles', 'Tabla de áreas creada', 'Site plan con norte y linderos', 'Andén y calzada dibujados']
          },
          {
            type: 'mc',
            q: '¿Qué debe incluir el site plan?',
            options: ['Norte, linderos acotados, andén y calzada', 'Solo la fachada principal', 'El detalle de cocina', 'El cronograma de obra'],
            answer: 0,
            explain: 'El site ubica el proyecto en su contexto urbano.'
          },
          {
            type: 'match',
            q: 'Empareja el plano con su contenido clave',
            pairs: [
              ['Site', 'Linderos y norte'],
              ['Planta N1', 'Cotas y niveles'],
              ['Cortes', 'Rellenos en negro/gris'],
              ['Cielos', 'Plano constructivo']
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'esp-ele',
    track: 'specialty',
    specialty: 'electrico',
    playbook: 'Playbook 2 · Modelado eléctrico',
    title: 'Especialidad: Eléctrica',
    subtitle: 'Dispositivos → circuitos → tubería',
    color: '#d4a017',
    lessons: [
      {
        id: 'ele1',
        title: 'Dispositivos y circuitos',
        items: [
          {
            type: 'card',
            title: 'Estrategia eléctrica',
            body: 'Primero define dispositivos → luego circuitos → luego tubería.',
            bullets: ['Systems → Electrical', 'Insertar tomas: Device / Electrical Fixture', 'Ajustar altura en propiedades', 'Insertar tablero (Electrical Equipment)', 'Crear circuitos: seleccionar tomas → Power → asignar tablero']
          },
          {
            type: 'order',
            q: 'Ordena la estrategia de modelado eléctrico',
            items: ['Dispositivos', 'Circuitos', 'Tubería (conduit)'],
            explain: 'La tubería sigue a los circuitos, no al revés.'
          },
          {
            type: 'order',
            q: 'Ordena cómo se crea un circuito',
            items: ['Seleccionar tomas', 'Presionar Power', 'Asignar tablero'],
            explain: 'Repite el proceso para luminarias.'
          },
          {
            type: 'mc',
            q: '¿En qué categoría se inserta el tablero?',
            options: ['Electrical Equipment', 'Lighting Devices', 'Conduit Fittings', 'Generic Models'],
            answer: 0,
            explain: 'Electrical Equipment permite asignarle circuitos.'
          }
        ]
      },
      {
        id: 'ele2',
        title: 'Conduits y filtros por Service Type',
        items: [
          {
            type: 'card',
            title: 'Trazado de conduit',
            body: 'Systems → Electrical Conduit. Selecciona la altura antes de trazar, traza desde ambos extremos y alinea con AL. Crea filtros: VG → Filters → New → Category: Conduits → Rule: Service Type = "Tomas".'
          },
          {
            type: 'tf',
            q: 'La altura del conduit se define antes de trazar.',
            answer: true,
            explain: 'Evita reprocesos de nivelación.'
          },
          {
            type: 'fill',
            q: 'Para alinear tuberías trazadas desde ambos extremos usa la tecla ___.',
            options: ['AL', 'MV', 'TR'],
            answer: 0,
            explain: 'AL = Align.'
          },
          {
            type: 'order',
            q: 'Ordena la creación de un filtro de conduits',
            items: ['VG → Filters', 'New Filter', 'Category: Conduits', 'Rule: Service Type = "Tomas"', 'Aplicar a la vista'],
            explain: 'Luego duplica la vista para tomas, iluminación y voz y datos.'
          }
        ]
      },
      {
        id: 'ele3',
        title: 'Cantidades eléctricas',
        items: [
          {
            type: 'match',
            q: 'Empareja la categoría con su unidad',
            pairs: [
              ['Conduit', 'ML'],
              ['Conduit Fittings', 'Unidad'],
              ['Lighting Fixtures', 'Unidad'],
              ['Electrical Fixtures', 'Unidad']
            ]
          },
          {
            type: 'mc',
            q: '¿Qué vistas duplicas para separar sistemas eléctricos?',
            options: ['Tomas, iluminación y voz y datos', 'Norte, sur y oriente', 'Cielos y pisos', 'Solo una vista 3D'],
            answer: 0,
            explain: 'Una vista por sistema, cada una con su filtro.'
          },
          {
            type: 'tf',
            q: 'Las cajas 4x4 deben quedar conectadas a la tubería.',
            answer: true,
            explain: 'Hace parte del checklist eléctrico.'
          }
        ]
      }
    ]
  },
  {
    id: 'esp-hid',
    track: 'specialty',
    specialty: 'hidrosanitario',
    playbook: 'Playbook 2 · Modelado hidrosanitario',
    title: 'Especialidad: Hidrosanitaria',
    subtitle: 'Modelar completo → clasificar por sistema',
    color: '#2b7bb9',
    lessons: [
      {
        id: 'hid1',
        title: 'Modelar y luego clasificar',
        items: [
          {
            type: 'card',
            title: 'Estrategia hidrosanitaria',
            body: 'Modela completo primero y luego clasifica por sistema. Modela tuberías sin pendiente, define diámetros según cálculo y después asigna System Type.'
          },
          {
            type: 'order',
            q: 'Ordena la táctica hidrosanitaria',
            items: ['Modelar tuberías sin pendiente', 'Definir diámetros según cálculo', 'Asignar System Type'],
            explain: 'Clasificar al final evita rehacer conexiones.'
          },
          {
            type: 'tf',
            q: 'En la táctica del playbook, las tuberías se modelan inicialmente sin pendiente.',
            answer: true,
            explain: 'Primero topología y diámetros; luego sistemas.'
          }
        ]
      },
      {
        id: 'hid2',
        title: 'System Types y filtros',
        items: [
          {
            type: 'card',
            title: 'Crear System Type',
            body: 'Selecciona tubería → Edit Type → Duplicate → renombra.',
            bullets: ['Agua fría', 'Agua caliente', 'Sanitaria', 'Lluvia', 'Ventilación']
          },
          {
            type: 'order',
            q: 'Ordena la creación de un System Type',
            items: ['Seleccionar tubería', 'Edit Type', 'Duplicate', 'Cambiar nombre del sistema'],
            explain: 'Luego crea un filtro para ver un sistema por vista.'
          },
          {
            type: 'mc',
            q: '¿Cuál NO es uno de los sistemas del playbook?',
            options: ['Gas natural', 'Agua fría', 'Lluvia', 'Ventilación'],
            answer: 0,
            explain: 'Sistemas: agua fría, agua caliente, sanitaria, lluvia y ventilación.'
          },
          {
            type: 'mc',
            q: '¿Qué datos deben mostrar las etiquetas hidrosanitarias?',
            options: ['Diámetro, pendiente y altura', 'Solo el color', 'Material del muro', 'Nombre del modelador'],
            answer: 0,
            explain: 'Etiquetas con diámetro, pendiente y altura.'
          }
        ]
      },
      {
        id: 'hid3',
        title: 'Cantidades hidrosanitarias',
        items: [
          {
            type: 'match',
            q: 'Empareja la categoría con su unidad',
            pairs: [
              ['Pipes', 'ML'],
              ['Pipe Fittings', 'Unidad'],
              ['Aparatos sanitarios', 'Unidad']
            ]
          },
          {
            type: 'fill',
            q: 'En las cantidades de accesorios hay que diferenciar codos de 45° y ___.',
            options: ['90°', '30°', '120°'],
            answer: 0,
            explain: 'Tienen precio y uso distinto.'
          }
        ]
      }
    ]
  },
  {
    id: 'esp-hvac',
    track: 'specialty',
    specialty: 'hvac',
    playbook: 'Playbook 2 · Modelado HVAC',
    title: 'Especialidad: HVAC',
    subtitle: 'Ductos, equipos y sistemas',
    color: '#4a90a4',
    lessons: [
      {
        id: 'hvac1',
        title: 'Ductos y equipos',
        items: [
          {
            type: 'card',
            title: 'Modelado HVAC',
            body: 'Modela ductos escogiendo la sección (rectangular o circular) y define tamaños. Modela condensadoras y manejadoras. En planos, duplica vistas y filtra por sistema.'
          },
          {
            type: 'mc',
            q: '¿Qué secciones de ducto plantea el playbook?',
            options: ['Rectangular y circular', 'Solo triangular', 'Solo flexible', 'Ninguna'],
            answer: 0,
            explain: 'Escoge la sección según diseño.'
          },
          {
            type: 'tf',
            q: 'Condensadoras y manejadoras se modelan como equipos.',
            answer: true,
            explain: 'Y se cuantifican por unidad.'
          }
        ]
      },
      {
        id: 'hvac2',
        title: 'Cantidades y coordinación HVAC',
        items: [
          {
            type: 'match',
            q: 'Empareja la categoría con su medición',
            pairs: [
              ['Ducts', 'ML o área'],
              ['Condensadoras', 'Unidad'],
              ['Manejadoras', 'Unidad']
            ]
          },
          {
            type: 'mc',
            q: 'Según la estrategia de coordinación, ¿cómo se resuelve HVAC para reducir conflictos?',
            options: ['Cobre + Rubatex (no ducto)', 'Ducto por encima de vigas siempre', 'Sin aislamiento', 'Pases de 4" en losa'],
            answer: 0,
            explain: 'Reduce conflictos repetitivos con estructura y otras redes.'
          }
        ]
      }
    ]
  },
  {
    id: 'esp-est',
    track: 'specialty',
    specialty: 'estructural',
    playbook: 'Playbook 2 · Modelado estructural',
    title: 'Especialidad: Estructural',
    subtitle: 'Vigas, columnas y alcance del refuerzo',
    color: '#7d7d7d',
    lessons: [
      {
        id: 'est1',
        title: 'Vigas y columnas',
        items: [
          {
            type: 'card',
            title: 'Familias estructurales',
            body: 'Inserta columnas y vigas desde el contenido de Autodesk (redondas, cuadradas, concreto, acero). Duplica las familias y crea los tamaños especificados en los planos de ingeniería.'
          },
          {
            type: 'order',
            q: 'Ordena el flujo de familias estructurales',
            items: ['Cargar familia del contenido de Autodesk', 'Duplicar la familia', 'Crear el tamaño de los planos de ingeniería', 'Colocar en el modelo'],
            explain: 'Así cada tamaño es un tipo cuantificable.'
          },
          {
            type: 'tf',
            q: 'Si no tienes el contenido de Autodesk, debes descargarlo.',
            answer: true,
            explain: 'Ahí están las familias base de vigas y columnas.'
          }
        ]
      },
      {
        id: 'est2',
        title: 'Refuerzo: dónde sí y dónde no',
        items: [
          {
            type: 'mc',
            q: '¿Cuándo tiene sentido modelar refuerzo en BIM según el playbook?',
            options: ['En elementos puntuales como piscinas', 'En todo el proyecto siempre', 'Nunca, en ningún caso', 'Solo en fachadas'],
            answer: 0,
            explain: 'Aún no existe un proceso eficiente para extraer refuerzo de todo el proyecto.'
          },
          {
            type: 'mc',
            q: 'Antes de iniciar clash detection, la estructura debe estar…',
            options: ['Validada', 'Renderizada', 'Exportada a PDF', 'Sin niveles'],
            answer: 0,
            explain: 'Hace parte del gate de transición a coordinación.'
          }
        ]
      }
    ]
  },

  // ───────────────────────── PLAYBOOK 3 ─────────────────────────
  {
    id: 'u6',
    track: 'common',
    playbook: 'Playbook 3 · Consultoría BIM · Implementación en oficina',
    title: 'Coordinación y gestión BIM',
    subtitle: 'No necesitas más recursos. Necesitas orden.',
    color: '#0b6e4f',
    upsellAfter: 'complete',
    lessons: [
      {
        id: 'u6l1',
        title: 'Psicología del despegue BIM',
        items: [
          {
            type: 'card',
            title: 'No necesitas más recursos. Necesitas orden.',
            body: 'BIM se implementa con Google Drive + Revit + Navisworks. Coordinación no es control: es comunicación técnica eficiente. Un pequeño ajuste metodológico cambia la rentabilidad.'
          },
          {
            type: 'fill',
            q: 'Coordinación no es control, es comunicación técnica ___.',
            options: ['eficiente', 'jerárquica', 'opcional'],
            answer: 0,
            explain: 'La coordinación alinea, no castiga.'
          },
          {
            type: 'tf',
            q: 'Implementar BIM exige obligatoriamente más personal y más presupuesto.',
            answer: false,
            explain: 'Exige orden y estructura.'
          },
          {
            type: 'mc',
            q: '¿Con qué stack mínimo plantea el playbook implementar BIM en oficina?',
            options: ['Google Drive + Revit + Navisworks', 'Solo AutoCAD', 'Excel + WhatsApp', 'Un render farm'],
            answer: 0,
            explain: 'Herramientas accesibles, bien organizadas.'
          }
        ]
      },
      {
        id: 'u6l2',
        title: 'Auditoría de procesos',
        items: [
          {
            type: 'card',
            title: 'Aquí es donde realmente se transforma la empresa',
            body: 'Se mapea el flujo de información: Cliente → Arquitectura → Estructura → MEP → Presupuesto → Obra. ¿Quién recibe, qué recibe, qué transforma, qué entrega y a quién?',
            bullets: ['Duplicidad de trabajo', 'Pérdida de información', 'Versiones desactualizadas', 'Decisiones sin trazabilidad', 'Falta de responsable']
          },
          {
            type: 'order',
            q: 'Ordena el flujo de información del proyecto',
            items: ['Cliente', 'Arquitectura', 'Estructura', 'MEP', 'Presupuesto', 'Obra'],
            explain: 'Cada eslabón recibe, transforma y entrega.'
          },
          {
            type: 'mc',
            q: '¿Cuál de estos NO es un hallazgo que busca la auditoría de procesos?',
            options: ['Exceso de previsibilidad', 'Duplicidad de trabajo', 'Versiones desactualizadas', 'Falta de responsable'],
            answer: 0,
            explain: 'La auditoría busca pérdidas, duplicidades y falta de trazabilidad.'
          },
          {
            type: 'match',
            q: 'Empareja la herramienta con su propósito',
            pairs: [
              ['Mapeo BPMN', 'Visualizar el proceso'],
              ['LOD por fase', 'Nivel de detalle esperado'],
              ['CDE', 'Información centralizada'],
              ['BEP simplificado', 'Reglas del proyecto']
            ]
          }
        ]
      },
      {
        id: 'u6l3',
        title: 'Flujo lineal y gate de coordinación',
        items: [
          {
            type: 'card',
            title: 'Gate de transición a coordinación',
            body: 'Antes de iniciar clash detection:',
            bullets: ['Topografía revisada por constructora', 'Arquitectura validada', 'Estructura validada', 'Coordenadas compartidas configuradas', 'Plantilla Revit unificada']
          },
          {
            type: 'order',
            q: 'Ordena este tramo del flujo lineal',
            items: ['Esquema básico', 'Validación normativa', 'Diseño arquitectónico', 'Diseño estructural', 'Validación topográfica', 'Inicio de coordinación BIM in-house'],
            explain: 'La coordinación arranca cuando las bases están validadas.'
          },
          {
            type: 'mc',
            q: '¿Quién revisa la topografía antes de coordinar?',
            options: ['La constructora', 'El modelador MEP', 'El cliente final', 'Nadie'],
            answer: 0,
            explain: 'Protocolo de revisión topográfica por la constructora.'
          },
          {
            type: 'tf',
            q: 'Se puede iniciar clash detection sin coordenadas compartidas configuradas.',
            answer: false,
            explain: 'Sin coordenadas compartidas los modelos no se superponen correctamente.'
          }
        ]
      },
      {
        id: 'u6l4',
        title: 'Auditoría de personas',
        items: [
          {
            type: 'card',
            title: 'Roles BIM en Colombia',
            body: 'Entrevistas de 30–60 min por persona: software que domina, nivel real, experiencia, trabajo colaborativo y entendimiento de LOD, BEP, clash detection y CDE.',
            bullets: ['Modelador BIM', 'Coordinador BIM', 'BIM Manager', 'BIM Lead / Director BIM (estratégico)']
          },
          {
            type: 'order',
            q: 'Ordena los roles de operativo a estratégico',
            items: ['Modelador BIM', 'Coordinador BIM', 'BIM Manager', 'BIM Lead / Director BIM'],
            explain: 'Cada rol amplía el alcance de decisión.'
          },
          {
            type: 'mc',
            q: 'Laura es arquitecta, Revit avanzado, nivel BIM medio. ¿Qué rol potencial le asigna el ejercicio?',
            options: ['Coordinadora BIM', 'Modeladora BIM', 'Directora financiera', 'Dibujante 2D'],
            answer: 0,
            explain: 'Carlos (dibujante, Revit intermedio, BIM bajo) → Modelador BIM.'
          },
          {
            type: 'mc',
            q: '¿Qué resultado entrega la auditoría de personas?',
            options: ['Quién va en cada rol, quién necesita capacitación y qué rol falta', 'Un render del equipo', 'El cronograma de obra', 'La lista de licencias'],
            answer: 0,
            explain: 'Asignación, capacitación y roles por crear.'
          }
        ]
      },
      {
        id: 'u6l5',
        title: 'Auditoría tecnológica',
        items: [
          {
            type: 'card',
            title: 'Software, hardware y entorno colaborativo',
            body: '¿Usan Autodesk Docs o trabajan por WhatsApp y correo? ¿Tienen CDE? ¿Revit está en nube colaborativa? ¿Se coordina en Navisworks?',
            bullets: ['Versión unificada', 'Plantillas configuradas', 'Worksets definidos', 'Niveles y ejes correctos', 'Coordenadas compartidas', 'Interoperabilidad validada']
          },
          {
            type: 'tf',
            q: 'Trabajar por WhatsApp y correo equivale a tener un CDE.',
            answer: false,
            explain: 'Un CDE da control de versiones y nomenclatura unificada.'
          },
          {
            type: 'mc',
            q: '¿Qué herramientas menciona el playbook como escalabilidad futura?',
            options: ['Autodesk Construction Cloud y Revizto', 'Paint y Word', 'Solo AutoCAD LT', 'SketchUp Free'],
            answer: 0,
            explain: 'Para coordinación colaborativa a mayor escala.'
          },
          {
            type: 'mc',
            q: '¿Cuál de estos NO está en el checklist tecnológico?',
            options: ['Fondo de pantalla corporativo', 'Versión unificada', 'Worksets definidos', 'Coordenadas compartidas'],
            answer: 0,
            explain: 'El checklist se enfoca en interoperabilidad y colaboración.'
          }
        ]
      },
      {
        id: 'u6l6',
        title: 'Sistema de coordinación',
        items: [
          {
            type: 'card',
            title: 'Iteración única por disciplina',
            body: 'Duración objetivo: 3–4 meses. Tolerancia máxima: 5 mm. Si una disciplina no entrega, se coordina parcialmente; tiempo máximo de respuesta: 72 horas.',
            bullets: ['Críticas → se resuelven obligatoriamente', 'Medias → se resuelven antes de liberar', 'Leves → documentadas']
          },
          {
            type: 'fill',
            q: 'La tolerancia máxima de interferencias en todas las disciplinas es ___.',
            options: ['5 mm', '50 mm', '5 cm'],
            answer: 0,
            explain: '5 mm en todas las disciplinas.'
          },
          {
            type: 'match',
            q: 'Empareja la clasificación con su tratamiento',
            pairs: [
              ['Críticas', 'Se resuelven obligatoriamente'],
              ['Medias', 'Se resuelven antes de liberar'],
              ['Leves', 'Se documentan']
            ]
          },
          {
            type: 'match',
            q: 'Empareja la disciplina con su estrategia de resolución',
            pairs: [
              ['Eléctrica', 'Pases estructurales de 4"'],
              ['Hidrosanitario', 'Por debajo de estructura'],
              ['HVAC', 'Cobre + Rubatex']
            ]
          },
          {
            type: 'mc',
            q: '¿Cuánto reducen estas estrategias los conflictos repetitivos?',
            options: ['70–80%', '5–10%', '100% siempre', 'Nada'],
            answer: 0,
            explain: 'Agrupar interferencias por patrones libera modelos más rápido.'
          },
          {
            type: 'mc',
            q: 'Si una disciplina no entrega a tiempo, ¿qué se hace?',
            options: ['Se coordina parcialmente (respuesta máx. 72 h)', 'Se detiene todo el proyecto', 'Se ignora la disciplina', 'Se reinicia la coordinación'],
            answer: 0,
            explain: 'El proyecto no se frena por una disciplina.'
          }
        ]
      },
      {
        id: 'u6l7',
        title: 'CDE, riesgos y KPIs',
        items: [
          {
            type: 'card',
            title: 'CDE – estructura definitiva',
            body: 'Carpetas por disciplina (ARQ, EST, ELE-FZA, ELE-COM, HID, HVAC) con subniveles 1_Modelo3D, 2_Planos, 3_Presupuesto, 4_Documentos. Nomenclatura: PROYECTO_ARQ.RVT, PROYECTO_ARQ.PDF. Modelado directamente en nube.'
          },
          {
            type: 'order',
            q: 'Ordena las subcarpetas de cada disciplina en el CDE',
            items: ['1_Modelo3D', '2_Planos', '3_Presupuesto', '4_Documentos'],
            explain: 'La numeración garantiza el mismo orden en todas las disciplinas.'
          },
          {
            type: 'mc',
            q: '¿Cuál es la nomenclatura correcta del modelo eléctrico de fuerza?',
            options: ['PROYECTO_ELE-FZA.RVT', 'electrico final v3.rvt', 'ELE_definitivo_ahora_si.rvt', 'Modelo1.rvt'],
            answer: 0,
            explain: 'PROYECTO_DISCIPLINA.RVT, sin versiones en el nombre.'
          },
          {
            type: 'mc',
            q: '¿Cuál es un KPI del playbook?',
            options: ['100% de interferencias críticas y medias resueltas en primera iteración', 'Número de renders por semana', 'Horas extra del equipo', 'Cantidad de correos enviados'],
            answer: 0,
            explain: 'También: presupuesto temprano vs. final e hitos a tiempo.'
          },
          {
            type: 'tf',
            q: 'Coordinar en etapa de licenciamiento es uno de los KPIs propuestos.',
            answer: true,
            explain: 'Coordinar temprano reduce el costo del cambio.'
          }
        ]
      }
    ]
  }
];

export function unitById(id) {
  return UNITS.find((u) => u.id === id);
}

export function lessonById(id) {
  for (const u of UNITS) {
    const l = u.lessons.find((x) => x.id === id);
    if (l) return { unit: u, lesson: l };
  }
  return null;
}

// Ruta del alumno: tronco común (Playbook 1 → Playbook 2) → su especialidad →
// Playbook 3 → resto de especialidades como extra.
export function pathForProfile(profileId) {
  const profile = PROFILES.find((p) => p.id === profileId) || PROFILES[0];
  const common = UNITS.filter((u) => u.track === 'common');
  const before = common.filter((u) => u.id !== 'u6');
  const own = UNITS.find((u) => u.id === profile.specialtyUnit);
  const closing = common.filter((u) => u.id === 'u6');
  const extras = UNITS.filter((u) => u.track === 'specialty' && u.id !== own.id).map((u) => ({ ...u, extra: true }));
  return [...before, own, ...closing, ...extras];
}
