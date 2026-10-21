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
  // 2) Artista conocido de OTRO género del mismo grupo (ej. Karol G en "Pop en español") → no
  if (genre.exclusive && GENRES.some((o) => o !== genre && o.exclusive && knownArtist(o, artist))) return false;
  if (!apple) return false;
  // 3) Artista desconocido: subgénero → palabra clave en el nombre + familia de Apple; familia → género de Apple
  if (genre.family) return !!genre.keyword && genre.keyword.test(artist) && genre.family.test(apple);
  return !!genre.match && genre.match.test(apple);
};
const YT_KEY = env('YOUTUBE_API_KEY');
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

const requireRoom = (req, res, next) => (roomOk(req.get('x-sala'))
  ? next()
  : res.status(401).json({ error: 'Código de sala incorrecto. Míralo en la pantalla 📺', sala: true }));

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

app.get('/api/search', requireRoom, async (req, res) => {
  const raw = String(req.query.q ?? '').trim();
  const q = clean(raw, 100);
  if (!q) return res.json([]);
  const genre = djGenre || genreById(String(req.query.genero || ''));

  // ¿Pegaron un link? Se resuelve sin gastar cuota (oEmbed). En ronda no se vale: no hay cómo validar el género.
  const linkId = youtubeId(raw);
  if (linkId) {
    if (djGenre) return res.status(403).json({ error: `Durante la ronda de ${djGenre.label} no se pueden pegar links. Busca por nombre 🔎` });
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + linkId)}`);
      if (!r.ok) return res.status(404).json({ error: 'Ese video no existe o no se puede embeber' });
      const d = await r.json();
      if (KARAOKE_ONLY && !isKaraoke(d.title, d.author_name)) {
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
      if (djGenre) return res.status(503).json({ error: 'No pude revisar el género ahorita. Intenta otra vez en unos segundos ⏳' });
      tracks = null; // filtro voluntario: si iTunes falla, se busca normal
    }
    if (tracks) {
      const seen = new Set();
      const list = [];
      for (const t of tracks) {
        if (!t.trackName || !fitsGenre(genre, t)) continue;
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
  const r = await youtubeSearch(req, `${t.track} ${t.artist} ${SEARCH_SUFFIX}`);
  if (r.error) return res.status(r.status).json({ error: r.error });
  for (const it of r.items) remember(approvedVideos, it.videoId, { genreId: t.genreId });
  res.json(r.items);
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
