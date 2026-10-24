import 'dotenv/config';
import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import QRCode from 'qrcode';
import { startCaptive } from './captive.js';
import { GENRES } from './generos.js';
import { fetchArtistProfile, profileFits } from './lastfm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = (k, d = '') => String(process.env[k] ?? d).trim();

const PORT = Number(env('PORT', 3000)) || 3000;
const ADMIN_PIN = env('ADMIN_PIN', '1234');
// Canciones por persona en cola (incluida la que está sonando). 1 = cantas y luego puedes agregar otra.
const MAX_PER_PERSON = Number(env('MAX_PER_PERSON', 1));
const SEARCH_SUFFIX = env('SEARCH_SUFFIX', 'karaoke');

// Géneros: la lista vive en generos.js (ahí se agregan artistas a los subgéneros)
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Nombres de varias palabras: se buscan dentro del artista ("La Arrolladora" ⊂ "La Arrolladora Banda El Limón").
// Nombres de una palabra: deben ser exactos en alguna parte del artista ("Mora" no atrapa a "Lalo Mora").
const artistParts = (a) => a.split(/\s*(?:,|&|\+|\/|\bx\b|\by\b|\band\b|\bcon\b|\bfeat\.?|\bft\.?|\bvs\.?)\s*/).map((x) => x.trim()).filter(Boolean);
function compileArtists(list) {
  const names = [...new Set(list.map(norm))];
  const multi = names.filter((n) => n.includes(' '));
  return {
    re: multi.length ? new RegExp(`(^|[^a-z0-9])(${multi.map(escRe).join('|')})([^a-z0-9]|$)`) : null,
    single: new Set(names.filter((n) => !n.includes(' '))),
  };
}
const knownArtist = (g, artist) => !!g.matcher && (g.matcher.re?.test(artist) || artistParts(artist).some((p) => g.matcher.single.has(p)));
for (const g of GENRES) {
  // Los géneros "toda la tropical / toda la mexicana" incluyen a todos los artistas de sus subgéneros
  if (!g.artists && g.match && (g.id === 'tropical' || g.id === 'mexicana')) {
    g.artists = GENRES.filter((x) => x.group === g.group && x.artists).flatMap((x) => x.artists);
  }
  if (g.artists) {
    g.matcher = compileArtists(g.artists);
    g.hint ??= 'como ' + g.artists.slice(0, 3).join(', ');
  }
}
const genreById = (id) => GENRES.find((g) => g.id === id) || null;
let djGenre = null; // ronda del DJ: si está puesta, manda sobre lo que elija cada invitado
const fitsGenre = (genre, t) => {
  if (genre.years) { const y = Number(String(t.releaseDate || '').slice(0, 4)); return y >= genre.years[0] && y <= genre.years[1]; }
  const artist = norm(t.artistName);
  const apple = norm(t.primaryGenreName); // vacío si la canción vino de Deezer (respaldo)
  // 1) Artista de la lista de este género
  if (knownArtist(genre, artist)) return true;
  // 2) Artista conocido de CUALQUIER otro género (ej. Karol G en "Pop en español", Rosalía en "Pop en inglés") → no
  if (genre.exclusive && GENRES.some((o) => o !== genre && knownArtist(o, artist))) return false;
  // 3) Artista desconocido con datos de Last.fm: manda el género dominante de sus etiquetas
  if (t.lastfm) {
    const fit = profileFits(genre.id, t.lastfm);
    if (fit !== null) return fit;
  }
  if (!apple || genre.strict) return false; // strict: solo cuentan las listas (Apple no es confiable ahí)
  // 4) Sin Last.fm (Apple: reggaetón = "Urbano latino", rock en español = "Alternativa y rock en español",
  //    niños = "Música para niños"; ojo: Apple pone "Pop" a mucho pop latino y "Pop en español" a baladas clásicas): subgénero → palabra clave en el nombre + familia de Apple; familia → género de Apple
  if (genre.family) return !!genre.keyword && genre.keyword.test(artist) && genre.family.test(apple);
  return !!genre.match && genre.match.test(apple);
};
const YT_KEY = env('YOUTUBE_API_KEY');
const LASTFM_KEY = env('LASTFM_API_KEY'); // gratis: https://www.last.fm/api/account/create
const REPORTS_TO_REMOVE = Math.max(1, Number(env('REPORTS_TO_REMOVE', 2)) || 2);
// Tope de búsquedas por día para no acabarse la cuota gratis (10,000 unidades = 100 búsquedas)
const SEARCH_DAILY_LIMIT = Number(env('SEARCH_DAILY_LIMIT', 95));
// En internet (Render) pon PUBLIC_URL=https://tu-app.onrender.com
const PUBLIC_URL = env('PUBLIC_URL').replace(/\/+$/, '');
const ONLINE = !!PUBLIC_URL;

// ---------- Código de sala ----------
// 4 letras sin las que se confunden (I, L, O, 0, 1). Fijo con ROOM_CODE o nuevo en cada arranque.
const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const newRoomCode = () => Array.from({ length: 4 }, () => ROOM_ALPHABET[crypto.randomInt(ROOM_ALPHABET.length)]).join('');
let ROOM = (env('ROOM_CODE') || newRoomCode()).toUpperCase();
const roomOk = (s) => String(s ?? '').trim().toUpperCase() === ROOM;

// ---------- Estado en memoria ----------
const state = { current: null, queue: [], history: [] };
let nextId = 1;
const strip = (e) => e && { id: e.id, name: e.name, videoId: e.videoId, title: e.title, addedAt: e.addedAt };
const publicState = () => ({ current: strip(state.current), queue: state.queue.map(strip), history: state.history.slice(-10).map(strip) });

// ---------- Red local ----------
const VIRTUAL = /vethernet|virtualbox|vmware|wsl|hyper-v|loopback|bluetooth|docker|tailscale|zerotier|vpn/i;
function lanCandidates() {
  const out = [];
  for (const [name, ifaces] of Object.entries(os.networkInterfaces())) {
    for (const i of ifaces || []) {
      if (i.family !== 'IPv4' || i.internal || i.address.startsWith('169.254.')) continue;
      out.push({ name, address: i.address, virtual: VIRTUAL.test(name) });
    }
  }
  return out.sort((a, b) => (a.virtual - b.virtual)
    || (!b.address.startsWith('192.168.') - !a.address.startsWith('192.168.')));
}
const lanIP = () => lanCandidates()[0]?.address || 'localhost';
const BASE_URL = PUBLIC_URL || `http://${env('PUBLIC_HOST') || lanIP()}:${PORT}`;
const guestUrl = () => `${BASE_URL}/?sala=${ROOM}`;

const WIFI_SSID = env('WIFI_SSID');
const WIFI_PASS = env('WIFI_PASS');
const wifiEsc = (v) => v.replace(/([\\;,:"])/g, '\\$1');

// ---------- Utilidades ----------
const clean = (s, max = 60) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const decodeHtml = (s) => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const VIDEO_ID = /^[\w-]{11}$/;
function youtubeId(text) {
  const m = String(text).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

// ---------- Seguridad: PIN con bloqueo y límites de búsqueda ----------
const pinFails = new Map(); // ip -> { n, until }
function checkPin(ip, pin) {
  const now = Date.now();
  let f = pinFails.get(ip);
  if (f?.until && f.until <= now) { pinFails.delete(ip); f = null; }
  if (f?.until > now) return 'locked';
  if (String(pin ?? '') === ADMIN_PIN) { pinFails.delete(ip); return 'ok'; }
  const n = (f?.n || 0) + 1;
  pinFails.set(ip, { n, until: n >= 5 ? now + 10 * 60e3 : 0 });
  return 'bad';
}

const perDevice = new Map(); // id -> [timestamps]
function deviceAllowed(id) {
  const now = Date.now();
  const arr = (perDevice.get(id) || []).filter((t) => now - t < 10 * 60e3);
  if (arr.length && now - arr[arr.length - 1] < 2500) return 'Espera tantito entre búsquedas ⏳';
  if (arr.length >= 15) return 'Muchas búsquedas, espera unos minutos ⏳';
  arr.push(now); perDevice.set(id, arr);
  return null;
}
let daily = { day: '', count: 0 };
function dailyAllowed() {
  const day = new Date().toISOString().slice(0, 10);
  if (daily.day !== day) daily = { day, count: 0 };
  return daily.count < SEARCH_DAILY_LIMIT;
}
const searchCache = new Map(); // query -> { at, items }

// ---------- App ----------
const app = express();
if (ONLINE) app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/screen', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'screen.html')));
app.get('/healthz', (_req, res) => res.send('ok'));

// La pantalla del DJ manda su PIN en x-pin: cuenta como DJ (sin límites de ronda, de karaoke ni de una canción)
const isDJReq = (req) => !!req.get('x-pin') && checkPin(req.ip, req.get('x-pin')) === 'ok';
const requireRoom = (req, res, next) => {
  req.isDJ = isDJReq(req);
  if (req.isDJ || roomOk(req.get('x-sala'))) return next();
  res.status(401).json({ error: 'Código de sala incorrecto. Míralo en la pantalla 📺', sala: true });
};

// Validar código de sala
app.post('/api/join', (req, res) => (roomOk(req.body?.sala)
  ? res.json({ ok: true })
  : res.status(401).json({ error: 'Ese código no es. Míralo en la pantalla 📺' })));

// Info para la pantalla del DJ (requiere PIN)
app.post('/api/info', async (req, res) => {
  const r = checkPin(req.ip, req.body?.pin);
  if (r !== 'ok') return res.status(401).json({ error: r === 'locked' ? 'Demasiados intentos, espera 10 min' : 'PIN incorrecto' });
  const url = guestUrl();
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 400 });
  let wifiQr = null;
  if (WIFI_SSID) {
    const auth = WIFI_PASS ? `T:WPA;P:${wifiEsc(WIFI_PASS)};` : 'T:nopass;';
    wifiQr = await QRCode.toDataURL(`WIFI:S:${wifiEsc(WIFI_SSID)};${auth};`, { margin: 1, width: 400 });
  }
  res.json({ url: BASE_URL, sala: ROOM, qr, wifiQr, ssid: WIFI_SSID });
});

// Miniaturas servidas desde aquí: así el WiFi cerrado solo necesita permitir este dominio
app.get('/thumb/:id', async (req, res) => {
  const id = req.params.id;
  if (!VIDEO_ID.test(id)) return res.sendStatus(400);
  try {
    const r = await fetch(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
    if (!r.ok) return res.sendStatus(404);
    res.set('Content-Type', 'image/jpeg').set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch { res.sendStatus(502); }
});

// Búsqueda en YouTube (solo videos embebibles)
app.get('/api/genres', (_req, res) => res.json({
  genres: GENRES.map(({ id, label, emoji, hint, group }) => ({ id, label, emoji, hint, group })),
  round: djGenre?.id || null,
}));

// ---------- Catálogo de iTunes (para validar géneros) ----------
const itunesCache = new Map(); // término → { at, tracks }
// Apple limita a ~20 consultas por minuto; si se satura, se usa Deezer (sin género, solo cuenta la lista de artistas)
async function catalogSearch(q) {
  const key = norm(q);
  const hit = itunesCache.get(key);
  if (hit && Date.now() - hit.at < 12 * 3600e3) return hit.tracks;
  let tracks = null;
  let source = 'apple';
  try {
    const r = await fetch(`https://itunes.apple.com/search?country=mx&media=music&entity=song&limit=50&term=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error('itunes ' + r.status);
    tracks = (await r.json()).results || [];
  } catch {
    source = 'deezer';
    const r = await fetch(`https://api.deezer.com/search?limit=50&q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error('deezer ' + r.status);
    const d = await r.json();
    if (d.error) throw new Error('deezer');
    tracks = (d.data || []).map((x) => ({
      trackName: x.title, artistName: x.artist?.name, primaryGenreName: '', releaseDate: '',
      artworkUrl100: null,
    }));
  }
  // Apple se guarda 12 h; Deezer solo 10 min (para volver a intentar con Apple, que sí trae género)
  itunesCache.set(key, { at: source === 'apple' ? Date.now() : Date.now() - 12 * 3600e3 + 10 * 60e3, tracks });
  if (itunesCache.size > 800) itunesCache.delete(itunesCache.keys().next().value);
  return tracks;
}
// Canciones ya validadas (id corto → datos) y videos aprobados para la ronda (videoId → género)
const trackTokens = new Map();
const approvedVideos = new Map();
const remember = (map, k, v, max = 3000) => { map.set(k, { ...v, at: Date.now() }); if (map.size > max) map.delete(map.keys().next().value); };

// ---------- Solo karaoke ----------
// Un video cuenta como karaoke si el título lo dice (karaoke, pista, versión karaoke…)
// o si es de un canal de karaoke conocido. Lo demás (videos oficiales, lyric videos, en vivo) se descarta.
const KARAOKE_ONLY = env('KARAOKE_ONLY', '1') !== '0';
const KARAOKE_TITLE = /karaok|\bpista\b|\bpistas\b|sing ?along|instrumental (con|with) (letra|lyrics)|backing track (con|with) (letra|lyrics)|\bkaraok[eé]\b/;
const KARAOKE_CHANNEL = /karaok|sing king|karafun|stingray|sing2|zzang|lucky voice|party tyme|ameritz|cantoyo|singstar|musisi|pistas/;
const NOT_KARAOKE = /\b(reaccion|reaction|tutorial|como cantar|how to sing|cover acustico|cover by|en vivo desde|unboxing)\b/;
const isKaraoke = (title, channel) => {
  const t = norm(title), c = norm(channel);
  if (NOT_KARAOKE.test(t)) return false;
  return KARAOKE_TITLE.test(t) || KARAOKE_CHANNEL.test(c);
};
const karaokeVideos = new Map(); // videoId → visto como karaoke (para validar al anotarse)

// Búsqueda de karaoke en YouTube (con caché, límites por cel y tope diario)
async function youtubeSearch(req, query) {
  const key = norm(query);
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < 6 * 3600e3) {
    hit.items.forEach((it) => remember(karaokeVideos, it.videoId, {}));
    return { items: hit.items };
  }
  const limited = deviceAllowed(clean(req.get('x-cliente'), 40) || req.ip);
  if (limited) return { status: 429, error: limited };
  if (!dailyAllowed()) return { status: 429, error: 'Se acabaron las búsquedas de hoy. Pega el link de YouTube 🔗' };
  const params = new URLSearchParams({
    part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '25', q: query, key: YT_KEY,
  });
  try {
    daily.count++;
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await r.json();
    if (!r.ok) return { status: 502, error: data?.error?.message || 'Error de YouTube' };
    const items = data.items.map((it) => ({
      videoId: it.id.videoId,
      title: decodeHtml(it.snippet.title),
      channel: decodeHtml(it.snippet.channelTitle),
    })).filter((it) => !KARAOKE_ONLY || isKaraoke(it.title, it.channel)).slice(0, 12);
    items.forEach((it) => remember(karaokeVideos, it.videoId, {}));
    searchCache.set(key, { at: Date.now(), items });
    if (searchCache.size > 500) searchCache.delete(searchCache.keys().next().value);
    return { items };
  } catch {
    return { status: 502, error: 'No se pudo conectar con YouTube' };
  }
}

// ---------- Last.fm (artistas que no están en las listas) ----------
const lastfmCache = new Map(); // artista → { at, profile|null }
async function artistProfile(name) {
  const key = norm(name);
  const hit = lastfmCache.get(key);
  if (hit && Date.now() - hit.at < 7 * 24 * 3600e3) return hit.profile;
  try {
    const profile = await fetchArtistProfile(name, LASTFM_KEY);
    lastfmCache.set(key, { at: Date.now(), profile });
    if (lastfmCache.size > 5000) lastfmCache.delete(lastfmCache.keys().next().value);
    return profile;
  } catch (e) {
    if (/lastfm 6$/.test(e.message)) lastfmCache.set(key, { at: Date.now(), profile: null }); // no existe
    return null; // límite, tardó o falló: se sigue sin Last.fm
  }
}
const isKnownAnywhere = (artist) => GENRES.some((g) => knownArtist(g, norm(artist)));
const mainArtist = (name) => String(name || '').split(/\s*(?:,|&|\bx\b|\by\b|\bfeat\.?|\bft\.?)\s*/i)[0].trim();

// ---------- Anti-rarezas ----------
// Versiones que no sirven para karaoke ni para la lista de canciones
// Se revisa solo lo "decorativo" del título: lo que va entre paréntesis/corchetes o después de " - "
// (así "Live and Let Die" no cae por "live", pero "Hips Don't Lie (Live)" sí)
const WEIRD_DECOR = /\b(remix|rmx|en vivo|live|sped ?up|slowed|reverb|8d|medley|mashup|megamix|mix|cover|tributo|tribute|karaoke|instrumental|acustic[oa]|acoustic|demo|version (acustica|banda|cumbia|salsa|rock|piano))\b/;
const WEIRD_ANYWHERE = /\b(remix|karaoke|sped ?up|slowed (\+|and) reverb|8d audio)\b/;
const decor = (title) => [...title.matchAll(/[([](.*?)[)\]]/g)].map((m) => m[1]).join(' ') + ' ' + (title.split(/\s[-–]\s/).slice(1).join(' '));
const weirdTrack = (name) => { const t = norm(name); return WEIRD_ANYWHERE.test(t) || WEIRD_DECOR.test(decor(t)); };
const WEIRD_ARTIST = /\b(karaoke|tribute|tributo|cover|covers|string quartet|lullaby|lullabies|cuna|instrumental|workout|music box|cajita musical|8d|sped up|slowed|tabata|hits band|party band|orchestra plays)\b/;
// El video de karaoke debe ser de ESA canción: la mayoría de las palabras del título deben aparecer
function sameSong(videoTitle, track) {
  const words = norm(track.replace(/\s*[([].*?[)\]]/g, '')).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3 || /^\d+$/.test(w));
  if (!words.length) return true;
  const title = norm(videoTitle);
  const hits = words.filter((w) => title.includes(w)).length;
  return hits / words.length >= 0.6;
}

app.get('/api/search', requireRoom, async (req, res) => {
  const raw = String(req.query.q ?? '').trim();
  const q = clean(raw, 100);
  if (!q) return res.json([]);
  // El DJ no está atado a la ronda: solo usa el género si él lo elige
  const round = req.isDJ ? null : djGenre;
  const genre = round || genreById(String(req.query.genero || ''));

  // ¿Pegaron un link? Se resuelve sin gastar cuota (oEmbed). En ronda no se vale: no hay cómo validar el género.
  const linkId = youtubeId(raw);
  if (linkId) {
    if (round) return res.status(403).json({ error: `Durante la ronda de ${round.label} no se pueden pegar links. Busca por nombre 🔎` });
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + linkId)}`);
      if (!r.ok) return res.status(404).json({ error: 'Ese video no existe o no se puede embeber' });
      const d = await r.json();
      if (KARAOKE_ONLY && !req.isDJ && !isKaraoke(d.title, d.author_name)) {
        return res.status(422).json({ error: 'Ese video no es karaoke 🙅 Busca la versión karaoke (con letra y sin voz).' });
      }
      remember(karaokeVideos, linkId, {});
      return res.json([{ videoId: linkId, title: clean(d.title, 120), channel: clean(d.author_name, 60) }]);
    } catch {
      return res.status(502).json({ error: 'No se pudo conectar con YouTube' });
    }
  }
  if (!YT_KEY) return res.status(500).json({ error: 'Sin API key: pega el link del video de YouTube 🔗' });

  // Con género: primero se buscan canciones reales en iTunes y solo se dejan las de ese género
  if (genre) {
    let tracks;
    try {
      tracks = await catalogSearch(q);
    } catch {
      if (round) return res.status(503).json({ error: 'No pude revisar el género ahorita. Intenta otra vez en unos segundos ⏳' });
      tracks = null; // filtro voluntario: si iTunes falla, se busca normal
    }
    if (tracks) {
      tracks = tracks.filter((t) => t.trackName && !weirdTrack(t.trackName) && !WEIRD_ARTIST.test(norm(t.artistName)));
      // Artistas que no están en ninguna lista → se consultan en Last.fm (en paralelo, máx. 8, con tiempo límite)
      if (LASTFM_KEY && !genre.years) {
        const unknown = [...new Set(tracks.map((t) => mainArtist(t.artistName)).filter((a) => a && !isKnownAnywhere(a)))].slice(0, 8);
        const profiles = new Map(await Promise.all(unknown.map(async (a) => [a, await artistProfile(a)])));
        for (const t of tracks) { const p = profiles.get(mainArtist(t.artistName)); if (p) t.lastfm = p; }
      }
      const seen = new Set();
      const list = [];
      for (const t of tracks) {
        if (!fitsGenre(genre, t)) continue;
        const k = norm(t.trackName.replace(/\s*[([].*?[)\]]/g, '')) + '|' + norm(t.artistName);
        if (seen.has(k)) continue;
        seen.add(k);
        const id = crypto.randomBytes(6).toString('hex');
        remember(trackTokens, id, { track: t.trackName, artist: t.artistName, genreId: genre.id });
        list.push({
          id, track: clean(t.trackName, 100), artist: clean(t.artistName, 80),
          year: String(t.releaseDate || '').slice(0, 4), genre: clean(t.primaryGenreName, 40),
          art: /^https:\/\/[\w.-]+\.mzstatic\.com\//.test(t.artworkUrl100 || '') ? t.artworkUrl100 : null,
        });
        if (list.length >= 10) break;
      }
      if (!list.length) {
        return res.status(404).json({ error: `No encontré "${q}" en ${genre.label} ${genre.emoji}. Prueba con otra canción o artista.` });
      }
      return res.json({ tracks: list, genre: genre.id });
    }
  }

  const r = await youtubeSearch(req, `${q} ${SEARCH_SUFFIX}`);
  if (r.error) return res.status(r.status).json({ error: r.error });
  res.json(r.items);
});

// Paso 2 con género: de la canción validada a sus videos de karaoke
app.get('/api/search/track', requireRoom, async (req, res) => {
  const t = trackTokens.get(String(req.query.id || ''));
  if (!t) return res.status(404).json({ error: 'Vuelve a buscar la canción 🔎' });
  if (!YT_KEY) return res.status(500).json({ error: 'Falta la API key de YouTube' });
  const r = await youtubeSearch(req, `${t.track} ${mainArtist(t.artist)} ${SEARCH_SUFFIX}`);
  if (r.error) return res.status(r.status).json({ error: r.error });
  const items = r.items.filter((it) => sameSong(it.title, t.track)); // solo karaokes de ESA canción
  for (const it of items) remember(approvedVideos, it.videoId, { genreId: t.genreId });
  if (!items.length) return res.status(404).json({ error: `No encontré karaoke de "${t.track}" 😕 Elige otra canción.` });
  res.json(items);
});

// Anotarse
app.post('/api/queue', requireRoom, (req, res) => {
  const name = clean(req.body.name, 30);
  const videoId = clean(req.body.videoId, 20);
  const title = clean(req.body.title, 120);
  if (!name || !VIDEO_ID.test(videoId)) return res.status(400).json({ error: 'Falta tu nombre o la canción' });
  if (KARAOKE_ONLY && !karaokeVideos.has(videoId)) {
    return res.status(422).json({ error: 'Solo se pueden anotar videos de karaoke. Búscala otra vez 🔎' });
  }
  if (djGenre && approvedVideos.get(videoId)?.genreId !== djGenre.id) {
    return res.status(403).json({ error: `En la ronda de ${djGenre.label} solo se vale ${djGenre.label.toLowerCase()} ${djGenre.emoji}. Búscala otra vez.` });
  }

  // Se cuenta por nombre y por dispositivo, para que cambiarse el nombre no sirva de truco
  const owner = clean(req.get('x-cliente'), 40) || req.ip;
  const mine = [state.current, ...state.queue]
    .filter((s) => s && (s.owner === owner || s.name.toLowerCase() === name.toLowerCase())).length;
  if (MAX_PER_PERSON > 0 && mine >= MAX_PER_PERSON) {
    return res.status(429).json({ error: MAX_PER_PERSON === 1
      ? 'Ya tienes una canción en la cola. Cuando cantes podrás agregar la siguiente 🎤'
      : `Ya tienes ${mine} canciones en cola. Espera tu turno 🎤` });
  }
  const entry = { id: nextId++, name, videoId, title, owner, addedAt: Date.now() };
  state.queue.push(entry);
  if (!state.current) advance(); // si no hay nada sonando, arranca solo
  broadcast();
  res.json({ ok: true, entry: strip(entry), position: state.queue.findIndex((s) => s.id === entry.id) + 1 });
});

// El DJ agrega una canción a nombre de alguien (sin cel, sin señal, o porque él quiere)
app.post('/api/dj/queue', (req, res) => {
  if (!isDJReq(req)) return res.status(401).json({ error: 'PIN del DJ incorrecto' });
  const name = clean(req.body.name, 30) || 'DJ';
  const videoId = clean(req.body.videoId, 20);
  const title = clean(req.body.title, 120);
  if (!VIDEO_ID.test(videoId)) return res.status(400).json({ error: 'Falta la canción' });
  const entry = { id: nextId++, name, videoId, title, owner: 'dj', byDJ: true, addedAt: Date.now() };
  if (req.body.next && state.current) state.queue.unshift(entry); // "poner como siguiente"
  else state.queue.push(entry);
  if (!state.current) advance();
  broadcast();
  res.json({ ok: true, position: state.queue.findIndex((s) => s.id === entry.id) + 1 });
});

function advance() {
  if (state.current) state.history.push(state.current);
  state.current = state.queue.shift() || null;
}
function broadcast() { io.emit('state', publicState()); }

// ---------- Concurso de disfraces ----------
// phase: 'ready' (participantes listos) → 'voting' (se puede votar) → 'results' (ganador)
let contest = null; // { phase, candidates: [{ id, name }], votes: Map(votante → id) }
const MAX_CANDIDATES = 50;
// Podio: hasta 3 lugares (empates comparten lugar), solo candidatos con votos
function buildPodium() {
  const counts = new Map(contest.candidates.map((c) => [c.id, 0]));
  for (const id of contest.votes.values()) counts.set(id, counts.get(id) + 1);
  const distinct = [...new Set([...counts.values()].filter((n) => n > 0))].sort((a, b) => b - a).slice(0, 3);
  return distinct.map((votes, i) => ({
    place: i + 1,
    votes,
    candidates: contest.candidates.filter((c) => counts.get(c.id) === votes),
  }));
}
function contestPublic() {
  if (!contest) return null;
  const out = { phase: contest.phase, candidates: contest.candidates, total: contest.votes.size };
  if (contest.phase === 'results') {
    const steps = contest.podium.length;
    out.steps = steps;
    out.revealed = contest.revealed;
    // Se revela de abajo hacia arriba: 3º, luego 2º, al final 1º
    out.places = contest.podium.filter((p) => p.place > steps - contest.revealed);
  }
  return out;
}
const broadcastContest = () => io.emit('contest', contestPublic());

// ---------- Tiempo real ----------
const socketIp = (socket) => (ONLINE
  ? String(socket.handshake.headers['x-forwarded-for'] || '').split(',')[0].trim()
  : '') || socket.handshake.address;

// Nadie entra sin código de sala (invitados) o PIN (pantalla del DJ)
io.use((socket, next) => {
  const { sala, pin } = socket.handshake.auth || {};
  if (pin != null && pin !== '') {
    const r = checkPin(socketIp(socket), pin);
    if (r === 'ok') { socket.data.dj = true; return next(); }
    return next(new Error(r === 'locked' ? 'locked' : 'pin'));
  }
  if (roomOk(sala)) {
    socket.data.voter = clean(socket.handshake.auth?.cliente, 40) || socket.id;
    return next();
  }
  next(new Error('sala'));
});

const reports = new Map(); // id de canción → Set(cels que la reportaron)
const REACTIONS = ['👏', '🔥', '❤️', '😂', '🎉', '🤘', '😍', '🙌'];
const lastReaction = new Map();

io.on('connection', (socket) => {
  socket.emit('state', publicState());
  socket.emit('contest', contestPublic());
  socket.emit('genre', djGenre?.id || null);
  if (contest && socket.data.voter && contest.votes.has(socket.data.voter)) {
    socket.emit('contest:myVote', contest.votes.get(socket.data.voter));
  }

  // Votar en el concurso (un voto por cel; se puede cambiar mientras siga abierta)
  socket.on('contest:vote', ({ id } = {}) => {
    if (!contest || contest.phase !== 'voting' || !socket.data.voter) return;
    if (!contest.candidates.some((c) => c.id === id)) return;
    contest.votes.set(socket.data.voter, id);
    socket.emit('contest:myVote', id);
    broadcastContest();
  });

  socket.on('reaction', (emoji) => {
    if (!REACTIONS.includes(emoji)) return;
    const now = Date.now();
    if (now - (lastReaction.get(socket.id) || 0) < 250) return;
    lastReaction.set(socket.id, now);
    io.emit('reaction', emoji);
  });

  // 🚩 Reporte: "no es del género / no es karaoke". Con REPORTS_TO_REMOVE cels distintos se quita sola.
  socket.on('report', ({ id } = {}) => {
    const voter = socket.data.voter;
    if (!voter) return;
    const entry = state.current?.id === id ? state.current : state.queue.find((s) => s.id === id);
    if (!entry || entry.owner === voter) return; // no se reporta la propia
    const set = reports.get(id) || new Set();
    set.add(voter);
    reports.set(id, set);
    socket.emit('report:ok', id);
    if (set.size < REPORTS_TO_REMOVE) return;
    reports.delete(id);
    if (state.current?.id === id) advance();
    else state.queue = state.queue.filter((s) => s.id !== id);
    io.emit('removed', { title: entry.title, name: entry.name });
    broadcast();
  });

  // ---- Solo la pantalla del DJ ----
  const dj = (fn) => (payload = {}) => {
    if (!socket.data.dj) return socket.emit('admin-error', 'Solo el DJ puede hacer eso');
    fn(payload || {});
    broadcast();
  };
  socket.on('screen:ended', dj(({ id }) => {
    if (state.current && state.current.id === id) advance();
  }));
  socket.on('admin:next', dj(() => advance()));
  socket.on('admin:remove', dj(({ id }) => { state.queue = state.queue.filter((s) => s.id !== id); }));
  socket.on('admin:move', dj(({ id, dir }) => {
    const i = state.queue.findIndex((s) => s.id === id);
    const j = i + (dir === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= state.queue.length) return;
    [state.queue[i], state.queue[j]] = [state.queue[j], state.queue[i]];
  }));
  socket.on('admin:clear', dj(() => { state.queue = []; }));
  // Cambiar el código si se filtró (los que ya están dentro siguen conectados)
  // ---- Concurso (solo DJ) ----
  const djContest = (fn) => (payload = {}) => {
    if (!socket.data.dj) return socket.emit('admin-error', 'Solo el DJ puede hacer eso');
    fn(payload || {});
    broadcastContest();
  };
  socket.on('contest:start', djContest(({ count, names = [] }) => {
    const n = Math.max(1, Math.min(MAX_CANDIDATES, Math.floor(Number(count)) || 0));
    contest = {
      phase: 'ready',
      candidates: Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        name: clean(Array.isArray(names) ? names[i] : '', 30) || `Participante ${i + 1}`,
      })),
      votes: new Map(),
    };
  }));
  socket.on('contest:open', djContest(() => {
    if (!contest) return;
    if (contest.phase === 'ready') contest.votes.clear();
    contest.phase = 'voting';
  }));
  socket.on('contest:close', djContest(() => {
    if (!contest || contest.phase !== 'voting') return;
    contest.phase = 'results';
    contest.podium = buildPodium(); // se congela al cerrar
    contest.revealed = 0;
  }));
  socket.on('contest:reveal', djContest(() => {
    if (contest?.phase === 'results') contest.revealed = Math.min(contest.podium.length, contest.revealed + 1);
  }));
  socket.on('contest:end', djContest(() => { contest = null; }));

  // Ronda de un solo género (null = todos)
  socket.on('admin:genre', ({ id } = {}) => {
    if (!socket.data.dj) return socket.emit('admin-error', 'Solo el DJ puede hacer eso');
    djGenre = genreById(id);
    io.emit('genre', djGenre?.id || null);
  });

  socket.on('admin:newRoom', dj(() => { ROOM = newRoomCode(); io.emit('room-changed'); }));

  socket.on('disconnect', () => lastReaction.delete(socket.id));
});

// Portal cautivo (solo modo local con el WiFi cerrado del karaoke)
const CAPTIVE = env('CAPTIVE') === '1' && !ONLINE;

server.listen(PORT, '0.0.0.0', () => {
  const modo = ONLINE ? 'EN INTERNET' : env('PUBLIC_HOST') ? 'RED AISLADA' : 'PRUEBAS (WiFi de casa)';
  console.log(`\n🎤  Karaoke Party listo  ·  modo ${modo}`);
  console.log(`   Código de sala: ${ROOM}`);
  console.log(`   Invitados:  ${BASE_URL}`);
  console.log(`   Pantalla:   ${ONLINE ? BASE_URL : `http://localhost:${PORT}`}/screen`);
  if (!ONLINE) {
    const cands = lanCandidates();
    if (cands.length > 1) {
      console.log('   Otras IPs detectadas (si el QR no abre, pon la correcta en PUBLIC_HOST):');
      cands.slice(1).forEach((c) => console.log(`     - ${c.address}  (${c.name})`));
    }
  }
  if (ONLINE && (ADMIN_PIN === '1234' || ADMIN_PIN.length < 6)) {
    console.log('   ⚠️  Estás en internet: usa un ADMIN_PIN de 6+ dígitos que no sea 1234');
  }
  if (!YT_KEY) console.log('   ⚠️  Sin YOUTUBE_API_KEY: los invitados pueden pegar links de YouTube');
  if (CAPTIVE) startCaptive({ ip: env('PUBLIC_HOST') || lanIP(), appPort: PORT, targetUrl: guestUrl });
  setTimeout(() => console.log(''), 300);
});
