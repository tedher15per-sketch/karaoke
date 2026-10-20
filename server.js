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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = (k, d = '') => String(process.env[k] ?? d).trim();

const PORT = Number(env('PORT', 3000)) || 3000;
const ADMIN_PIN = env('ADMIN_PIN', '1234');
// Canciones por persona en cola (incluida la que está sonando). 1 = cantas y luego puedes agregar otra.
const MAX_PER_PERSON = Number(env('MAX_PER_PERSON', 1));
const SEARCH_SUFFIX = env('SEARCH_SUFFIX', 'karaoke');

// Géneros para acotar la búsqueda (term = lo que se agrega a la búsqueda de YouTube)
const GENRES = [
  { id: 'salsa', label: 'Salsa', emoji: '💃', term: 'salsa' },
  { id: 'cumbia', label: 'Cumbia', emoji: '🪇', term: 'cumbia' },
  { id: 'bachata', label: 'Bachata', emoji: '🌹', term: 'bachata' },
  { id: 'merengue', label: 'Merengue', emoji: '🥁', term: 'merengue' },
  { id: 'reggaeton', label: 'Reggaetón', emoji: '🔥', term: 'reggaeton' },
  { id: 'banda', label: 'Banda', emoji: '🎺', term: 'banda sinaloense' },
  { id: 'norteno', label: 'Norteño', emoji: '🪗', term: 'norteño' },
  { id: 'ranchera', label: 'Ranchera / Mariachi', emoji: '🤠', term: 'ranchera mariachi' },
  { id: 'grupera', label: 'Grupera', emoji: '💔', term: 'grupera' },
  { id: 'corridos', label: 'Corridos', emoji: '🐎', term: 'corridos' },
  { id: 'baladas', label: 'Baladas', emoji: '🥹', term: 'balada romántica' },
  { id: 'boleros', label: 'Boleros', emoji: '🌙', term: 'bolero' },
  { id: 'pop-es', label: 'Pop en español', emoji: '🎤', term: 'pop en español' },
  { id: 'rock-es', label: 'Rock en español', emoji: '🤘', term: 'rock en español' },
  { id: 'pop-en', label: 'Pop en inglés', emoji: '🇺🇸', term: 'english pop' },
  { id: 'rock-en', label: 'Rock en inglés', emoji: '🎸', term: 'classic rock' },
  { id: 'ochentas', label: 'Ochenteras', emoji: '🕺', term: '80s' },
  { id: 'infantil', label: 'Infantiles', emoji: '🧸', term: 'infantil' },
];
const genreById = (id) => GENRES.find((g) => g.id === id) || null;
let djGenre = null; // ronda del DJ: si está puesta, manda sobre lo que elija cada invitado
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
app.get('/api/genres', (_req, res) => res.json({ genres: GENRES.map(({ term, ...g }) => g), round: djGenre?.id || null }));

app.get('/api/search', requireRoom, async (req, res) => {
  const raw = String(req.query.q ?? '').trim();
  const q = clean(raw, 100);
  if (!q) return res.json([]);

  // ¿Pegaron un link? Se resuelve sin gastar cuota (oEmbed)
  const linkId = youtubeId(raw);
  if (linkId) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + linkId)}`);
      if (!r.ok) return res.status(404).json({ error: 'Ese video no existe o no se puede embeber' });
      const d = await r.json();
      return res.json([{ videoId: linkId, title: clean(d.title, 120), channel: clean(d.author_name, 60) }]);
    } catch {
      return res.status(502).json({ error: 'No se pudo conectar con YouTube' });
    }
  }
  if (!YT_KEY) return res.status(500).json({ error: 'Sin API key: pega el link del video de YouTube 🔗' });

  const genre = djGenre || genreById(String(req.query.genero || ''));
  const key = `${genre?.id || ''}|${q.toLowerCase()}`;
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < 6 * 3600e3) return res.json(hit.items);

  const limited = deviceAllowed(clean(req.get('x-cliente'), 40) || req.ip);
  if (limited) return res.status(429).json({ error: limited });
  if (!dailyAllowed()) return res.status(429).json({ error: 'Se acabaron las búsquedas de hoy. Pega el link de YouTube 🔗' });

  const params = new URLSearchParams({
    part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '12',
    q: `${q} ${genre?.term || ''} ${SEARCH_SUFFIX}`.replace(/\s+/g, ' ').trim(), key: YT_KEY,
  });
  try {
    daily.count++;
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'Error de YouTube' });
    const items = data.items.map((it) => ({
      videoId: it.id.videoId,
      title: decodeHtml(it.snippet.title),
      channel: decodeHtml(it.snippet.channelTitle),
    }));
    searchCache.set(key, { at: Date.now(), items });
    if (searchCache.size > 500) searchCache.delete(searchCache.keys().next().value);
    res.json(items);
  } catch {
    res.status(502).json({ error: 'No se pudo conectar con YouTube' });
  }
});

// Anotarse
app.post('/api/queue', requireRoom, (req, res) => {
  const name = clean(req.body.name, 30);
  const videoId = clean(req.body.videoId, 20);
  const title = clean(req.body.title, 120);
  if (!name || !VIDEO_ID.test(videoId)) return res.status(400).json({ error: 'Falta tu nombre o la canción' });

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
function contestPublic() {
  if (!contest) return null;
  const out = { phase: contest.phase, candidates: contest.candidates, total: contest.votes.size };
  if (contest.phase === 'results') {
    const counts = Object.fromEntries(contest.candidates.map((c) => [c.id, 0]));
    for (const id of contest.votes.values()) counts[id]++;
    out.counts = counts;
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
  socket.on('contest:close', djContest(() => { if (contest) contest.phase = 'results'; }));
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
