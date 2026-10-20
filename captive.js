// Portal cautivo casero: DNS que contesta "todo es esta PC" + redirección en el puerto 80.
// Con esto, en el WiFi del karaoke cualquier página que abran los lleva a la app,
// y los celulares muestran solos el aviso "Iniciar sesión en la red".
// La PC misma sí resuelve nombres reales (se reenvían a 1.1.1.1) para que YouTube funcione.
import dgram from 'dgram';
import http from 'http';

const UPSTREAM = { host: '1.1.1.1', port: 53 };

function parseQuestion(msg) {
  let off = 12;
  while (off < msg.length && msg[off] !== 0) off += msg[off] + 1;
  const end = off + 5; // 0 final + tipo(2) + clase(2)
  if (end > msg.length) return null;
  return { qtype: msg.readUInt16BE(off + 1), question: msg.subarray(12, end) };
}

function answer(msg, ip) {
  const q = parseQuestion(msg);
  if (!q) return null;
  const isA = q.qtype === 1;
  const header = Buffer.alloc(12);
  msg.copy(header, 0, 0, 2);                 // mismo id
  header.writeUInt16BE(0x8180 | (msg.readUInt16BE(2) & 0x0100), 2); // respuesta, RA, copia RD
  header.writeUInt16BE(1, 4);                // 1 pregunta
  header.writeUInt16BE(isA ? 1 : 0, 6);      // 1 respuesta solo para tipo A (IPv4)
  if (!isA) return Buffer.concat([header, q.question]);
  const rr = Buffer.alloc(16);
  rr.writeUInt16BE(0xc00c, 0);               // apunta al nombre de la pregunta
  rr.writeUInt16BE(1, 2);                    // tipo A
  rr.writeUInt16BE(1, 4);                    // clase IN
  rr.writeUInt32BE(10, 6);                   // TTL corto
  rr.writeUInt16BE(4, 10);
  ip.split('.').forEach((n, i) => rr.writeUInt8(Number(n), 12 + i));
  return Buffer.concat([header, q.question, rr]);
}

function forward(server, msg, rinfo) {
  const up = dgram.createSocket('udp4');
  const t = setTimeout(() => up.close(), 3000);
  up.on('message', (resp) => { clearTimeout(t); server.send(resp, rinfo.port, rinfo.address); up.close(); });
  up.on('error', () => { clearTimeout(t); up.close(); });
  up.send(msg, UPSTREAM.port, UPSTREAM.host);
}

export function startCaptive({ ip, appPort, targetUrl }) {
  const self = new Set([ip, '127.0.0.1']);

  const dns = dgram.createSocket('udp4');
  dns.on('message', (msg, rinfo) => {
    if (msg.length < 17) return;
    if (self.has(rinfo.address)) return forward(dns, msg, rinfo); // la PC: internet real
    const resp = answer(msg, ip);
    if (resp) dns.send(resp, rinfo.port, rinfo.address);
  });
  dns.on('error', (e) => console.log(`   ⚠️  Portal cautivo: no pude abrir el DNS (puerto 53): ${e.code}. ¿Otro programa lo usa?`));
  dns.bind(53, '0.0.0.0', () => console.log(`   🪤 Portal cautivo: DNS activo en ${ip}:53`));

  const web = http.createServer((_req, res) => {
    res.writeHead(302, { Location: targetUrl(), 'Cache-Control': 'no-store' });
    res.end();
  });
  web.on('error', (e) => console.log(`   ⚠️  Portal cautivo: puerto 80 ocupado (${e.code}). Cierra IIS/Skype u otro servidor web.`));
  if (appPort !== 80) web.listen(80, '0.0.0.0', () => console.log('   🪤 Portal cautivo: redirección en el puerto 80'));
}

export { answer as _answer };
