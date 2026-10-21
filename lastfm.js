// =====================================================================
//  Last.fm: género de artistas que NO están en las listas de generos.js
//  Gratis con clave (LASTFM_API_KEY). Usa artist.getTopTags: etiquetas con
//  peso 0–100 puestas por la gente. Como hay ruido (ej. a Peso Pluma le ponen
//  "reggaeton"), se suman TODAS las etiquetas de cada género y gana el dominante.
// =====================================================================

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Etiquetas que delatan que el artista es latino / hispanohablante (para decidir pop/rock en español o inglés)
const LATIN_CONTEXT = /latin|latino|spanish|espanol|mexic|colombia|argentin|chile|puerto rico|venezuel|peru|dominican|cuba|espana|spain|reggaeton|ranchera|cumbia/;

// [etiqueta (regex sobre la etiqueta normalizada), género]
// 'pop?' y 'rock?' se resuelven según el contexto latino.
const RULES = [
  [/^salsa( romantica| dura| brava)?$/, 'salsa'],
  [/^cumbia|cumbia$/, 'cumbia'],
  [/^bachata/, 'bachata'],
  [/^merengue/, 'merengue'],
  [/^(tropical|musica tropical|vallenato|latin tropical)$/, 'tropical'],
  [/^(banda|banda music|banda sinaloense|tecnobanda|musica de banda)$/, 'banda'],
  [/^(norteno|nortena|norteno music|musica nortena|conjunto|tejano)$/, 'norteno'],
  [/^(ranchera|rancheras|mariachi|musica ranchera|mariacheno|charro)$/, 'mariachi'],
  [/corrido|sierreno|sierreño|belico/, 'corridos'],
  [/^(grupero|grupera|onda grupera|latin romantic|romantica grupera)$/, 'grupera'],
  [/^(regional mexican|regional mexicano|regional|musica mexicana|mexican regional)$/, 'mexicana'],
  [/reggaeton|reggaetón|trap latino|latin trap|dembow|neoperreo|perreo|malianteo|urbano|latin urban|^rkt$|^trap$|^latin hip.?hop$|^(hip.?hop|rap)$/, 'urbano?'],
  [/^(latin pop|pop latino|pop en espanol|spanish pop|pop espanol|latin pop girls)$/, 'pop-es'],
  [/^(rock en espanol|rock latino|latin rock|spanish rock|rock nacional|rock mexicano|rock argentino|rock en castellano)$/, 'rock-es'],
  [/^(balada|baladas|latin ballad|bolero|boleros|romantica|romantico|baladas romanticas)$/, 'baladas'],
  [/^(pop|dance-pop|dance pop|synthpop|electropop|teen pop|pop rock|power pop|r&b|rnb|soul|disco|dance)$/, 'pop?'],
  [/^(rock|classic rock|hard rock|alternative|alternative rock|grunge|metal|heavy metal|punk|punk rock|indie rock|glam rock|britpop|post-punk|new wave)$/, 'rock?'],
  [/^(children'?s music|kids|infantil|musica infantil|nursery rhymes|children|canciones infantiles)$/, 'infantil'],
];

const GROUP = {
  salsa: 'tropical', cumbia: 'tropical', bachata: 'tropical', merengue: 'tropical', tropical: 'tropical',
  banda: 'mexicana', norteno: 'mexicana', mariachi: 'mexicana', corridos: 'mexicana', grupera: 'mexicana', mexicana: 'mexicana',
};

// Convierte las etiquetas [{name, count}] en un perfil { scores: {genero: puntos}, top }
export function profileFromTags(tags) {
  const top = (tags || []).filter((t) => Number(t.count) >= 5).slice(0, 15).map((t) => ({ name: norm(t.name), count: Number(t.count) }));
  const latin = top.some((t) => LATIN_CONTEXT.test(t.name));
  const scores = {};
  for (const t of top) {
    for (const [re, g] of RULES) {
      if (!re.test(t.name)) continue;
      let id = g;
      if (g === 'pop?') id = latin ? 'pop-es' : 'pop-en';
      if (g === 'rock?') id = latin ? 'rock-es' : 'rock-en';
      if (g === 'urbano?') {
        if (/^(hip.?hop|rap|trap)$/.test(t.name) && !latin) continue; // rap en inglés no es reggaetón
        id = 'urbano';
      }
      scores[id] = (scores[id] || 0) + t.count;
      break;
    }
  }
  // Paraguas: tropical/mexicana suman a sus subgéneros
  for (const [id, grp] of Object.entries(GROUP)) {
    if (id !== grp && scores[id]) scores[grp] = (scores[grp] || 0) + scores[id];
  }
  return { scores, tags: top.slice(0, 6).map((t) => t.name) };
}

// ¿El perfil del artista corresponde al género pedido? Debe ser (casi) el dominante.
export function profileFits(genreId, profile) {
  const { scores } = profile || {};
  if (!scores) return null; // sin datos: que decida otra capa
  const leaves = Object.entries(scores).filter(([id]) => !(GROUP[id] === id)); // sin paraguas
  if (!leaves.length) return null;
  const best = Math.max(...leaves.map(([, v]) => v));
  if (genreId === 'tropical' || genreId === 'mexicana') {
    const s = scores[genreId] || 0;
    return s >= 20 && s >= best * 0.75;
  }
  const s = scores[genreId] || 0;
  if (!(s >= 20 && s >= best * 0.75)) return false;
  // "Pop" es genérico: si el artista tiene un género más específico con peso (reggaetón, bachata, corridos,
  // baladas…), es de ese otro y NO cuenta como pop (así Karol G o Romeo Santos no salen en Pop en español)
  if (genreId === 'pop-es' || genreId === 'pop-en') {
    const specific = leaves.filter(([id]) => !['pop-es', 'pop-en', 'rock-es', 'rock-en'].includes(id));
    if (specific.some(([, v]) => v >= s * 0.5)) return false;
  }
  return true;
}

// Consulta a Last.fm con tiempo límite corto (si tarda o falla, se sigue sin esta capa)
export async function fetchArtistProfile(artist, apiKey, timeoutMs = 2500) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&autocorrect=1&format=json&api_key=${encodeURIComponent(apiKey)}&artist=${encodeURIComponent(artist)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error('lastfm ' + r.status);
  const d = await r.json();
  if (d.error) throw new Error('lastfm ' + d.error); // 29 = límite, 6 = artista no existe
  return profileFromTags(d.toptags?.tag);
}
