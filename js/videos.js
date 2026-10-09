// Videos de apoyo (YouTube; sirven los "no listados").
//  • VIDEOS: un link por lección (video o lista de reproducción). Vacío = sin botón.
//  • PLAYLISTS: listas del canal. Con "lesson" se muestran en esa lección; sin "lesson",
//    aparecen en la Videoteca. Acepta youtu.be/ID, watch?v=ID, /shorts/ID, /embed/ID,
//    y playlist?list=ID.

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

// Listas del canal de Juan David Barona (no listadas). Pon "title" y "lesson" cuando se
// confirme el tema de cada una; mientras tanto se muestran numeradas en la Videoteca.
export const PLAYLISTS = [
  'PLiMOLHfp2jQ-R3gqCjENs2nQVCKGnwUiZ',
  'PLiMOLHfp2jQ_sihQgfW-u0sEJXoxVNp7B',
  'PLiMOLHfp2jQ9_2LCzDUlRaz3GunaTepTf',
  'PLiMOLHfp2jQ9TSLcnykFnqISSiJjXRXFO',
  'PLiMOLHfp2jQ9uFR8_dm_j4XZauxhfTGQG',
  'PLiMOLHfp2jQ_lrcoPq44G5lxuhekcAolk',
  'PLiMOLHfp2jQ8s6E983vBcP4Zxfaw5k2Zx',
  'PLiMOLHfp2jQ9jwv6xMg95YWWcQ91nbJCt',
  'PLiMOLHfp2jQ_2cIZMrv1qWObga0pkFWmO',
  'PLiMOLHfp2jQ_3CNgmKvvmm_5lkm58pCfu',
  'PLiMOLHfp2jQ8RaBkiUqIyioT-3myHGUEO',
  'PLiMOLHfp2jQ9zoz7th3rjqmPuJX96PCVX',
  'PLiMOLHfp2jQ-gAJrhof5ApNGEtMHg3m3f',
  'PLiMOLHfp2jQ-qd4qORrTddD-BJmFDXYiw',
  'PLiMOLHfp2jQ-EEeCv9Pvf8ICZAeGomGel',
  'PLiMOLHfp2jQ87j9Bdzh9LXF0JYTBPdZpf',
  'PLiMOLHfp2jQ8Z8H1xTrc1q_wcu2nr4XD4',
  'PLiMOLHfp2jQ-RnFMLznkl9KBEsxjEx4kL',
  'PLiMOLHfp2jQ8XhFJQl3tpNyf8B3Iw-8ib',
  'PLiMOLHfp2jQ_QSv73QtvkXAsazdSZNeib',
  'PLiMOLHfp2jQ8Gfj1Be7duf3avPiwyMD8I'
].map((id, i) => ({ id, title: '', lesson: null, n: i + 1 }));

// Devuelve { type: 'video', id } | { type: 'playlist', id } | null
export function parseYouTube(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (!['youtu.be', 'youtube.com', 'youtube-nocookie.com'].includes(host)) return null;
    const v = host === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1];
    if (v && /^[\w-]{11}$/.test(v)) return { type: 'video', id: v };
    const list = u.searchParams.get('list');
    if (list && /^[\w-]{10,64}$/.test(list)) return { type: 'playlist', id: list };
    return null;
  } catch {
    return null;
  }
}

export function youtubeId(url) {
  const p = parseYouTube(url);
  return p?.type === 'video' ? p.id : null;
}

function media(parsed, title) {
  if (!parsed) return null;
  const isList = parsed.type === 'playlist';
  return {
    title,
    type: parsed.type,
    embed: isList
      ? `https://www.youtube-nocookie.com/embed/videoseries?list=${parsed.id}&rel=0`
      : `https://www.youtube-nocookie.com/embed/${parsed.id}?rel=0&modestbranding=1&autoplay=1`,
    open: isList ? `https://www.youtube.com/playlist?list=${parsed.id}` : `https://youtu.be/${parsed.id}`,
    thumb: isList ? null : `https://i.ytimg.com/vi/${parsed.id}/mqdefault.jpg`
  };
}

export function videoFor(lessonId) {
  const v = VIDEOS[lessonId];
  const direct = media(parseYouTube(v?.url), v?.title);
  if (direct) return direct;
  const pl = PLAYLISTS.find((p) => p.lesson === lessonId);
  return pl ? media({ type: 'playlist', id: pl.id }, pl.title || v?.title) : null;
}

export function playlistMedia(n) {
  const pl = PLAYLISTS.find((p) => p.n === Number(n));
  return pl ? media({ type: 'playlist', id: pl.id }, pl.title || `Lista de reproducción ${pl.n}`) : null;
}

export function unassignedPlaylists() {
  return PLAYLISTS.filter((p) => !p.lesson);
}
