import test from 'node:test';
import assert from 'node:assert/strict';
import { UNITS, PROFILES, pathForProfile } from '../js/content.js';

test('ids de unidades y lecciones son únicos', () => {
  const ids = [...UNITS.map((u) => u.id), ...UNITS.flatMap((u) => u.lessons.map((l) => l.id))];
  assert.equal(new Set(ids).size, ids.length);
});

test('cada ejercicio tiene la forma correcta', () => {
  for (const u of UNITS) {
    for (const l of u.lessons) {
      assert.ok(l.items.length >= 2, `${l.id} tiene muy pocos ítems`);
      assert.ok(l.items.some((i) => i.type !== 'card'), `${l.id} no tiene ejercicios`);
      for (const it of l.items) {
        const where = `${l.id}: ${it.q || it.title}`;
        switch (it.type) {
          case 'card':
            assert.ok(it.title && it.body, where);
            break;
          case 'mc':
          case 'fill':
            assert.ok(Array.isArray(it.options) && it.options.length >= 2, where);
            assert.ok(Number.isInteger(it.answer) && it.answer >= 0 && it.answer < it.options.length, where);
            assert.equal(new Set(it.options).size, it.options.length, `opciones repetidas en ${where}`);
            if (it.type === 'fill') assert.ok(it.q.includes('___'), `fill sin ___ en ${where}`);
            break;
          case 'tf':
            assert.equal(typeof it.answer, 'boolean', where);
            break;
          case 'order':
            assert.ok(it.items.length >= 3, where);
            assert.equal(new Set(it.items).size, it.items.length, `pasos repetidos en ${where}`);
            break;
          case 'match':
            assert.ok(it.pairs.length >= 3, where);
            assert.equal(new Set(it.pairs.map((p) => p[0])).size, it.pairs.length, `izquierdas repetidas en ${where}`);
            break;
          default:
            assert.fail(`tipo desconocido ${it.type} en ${where}`);
        }
      }
    }
  }
});

test('cada perfil tiene su unidad de especialidad', () => {
  for (const p of PROFILES) assert.ok(UNITS.find((u) => u.id === p.specialtyUnit && u.specialty === p.id), p.id);
});

test('la ruta respeta el orden de los playbooks', () => {
  const path = pathForProfile('electrico').map((u) => u.id);
  assert.deepEqual(path.slice(0, 6), ['u1', 'u2', 'u3', 'u4', 'esp-ele', 'u6']);
  assert.ok(path.slice(6).every((id) => id.startsWith('esp-')));
  assert.equal(path.length, 6 + PROFILES.length - 1);
});

test('videos: ids de YouTube y cobertura de lecciones', async () => {
  const { VIDEOS, youtubeId } = await import('../js/videos.js');
  const lessonIds = UNITS.flatMap((u) => u.lessons.map((l) => l.id));
  assert.deepEqual(Object.keys(VIDEOS).sort(), [...lessonIds].sort());
  assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://evil.com/watch?v=dQw4w9WgXcQ'), null);
  for (const v of Object.values(VIDEOS)) if (v.url) assert.ok(youtubeId(v.url), `link inválido: ${v.url}`);
});

test('videos: listas de reproducción', async () => {
  const { parseYouTube, PLAYLISTS, playlistMedia } = await import('../js/videos.js');
  assert.deepEqual(parseYouTube('https://www.youtube.com/playlist?list=PLiMOLHfp2jQ-R3gqCjENs2nQVCKGnwUiZ'), { type: 'playlist', id: 'PLiMOLHfp2jQ-R3gqCjENs2nQVCKGnwUiZ' });
  assert.equal(PLAYLISTS.length, 21);
  assert.equal(new Set(PLAYLISTS.map((p) => p.id)).size, 21);
  assert.match(playlistMedia(1).embed, /videoseries\?list=PLiMOLHfp2jQ-R3gqCjENs2nQVCKGnwUiZ/);
});
