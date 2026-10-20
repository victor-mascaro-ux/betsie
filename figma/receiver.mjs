// Tiny localhost receiver: the Figma page POSTs JSON / binary dumps here.
//
//   node figma/receiver.mjs figma/raw
//
// Then, in the console of the Betsie file on figma.com:
//   (0, eval)(await (await fetch('http://127.0.0.1:47821/extract.js')).text())
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'figma/raw';
const PORT = Number(process.argv[3] || 47821);
fs.mkdirSync(OUT, { recursive: true });

const cors = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
};

http.createServer((req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/extract.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    return res.end(fs.readFileSync(new URL('./extract.js', import.meta.url)));
  }
  if (req.method === 'GET') { res.writeHead(200); return res.end('ok'); }
  const rel = (url.searchParams.get('p') || 'dump.bin').replace(/\.\.+/g, '_');
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const buf = Buffer.concat(chunks);
    fs.writeFileSync(file, buf);
    res.writeHead(200); res.end(String(buf.length));
  });
}).listen(PORT, '127.0.0.1', () => console.log('listening', PORT, '->', path.resolve(OUT)));
