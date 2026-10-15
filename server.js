const http = require('http');
const fs = require('fs');
const path = require('path');
const { teach } = require('./api/teach');

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, 'public');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

function send(res, status, type, body) { res.writeHead(status, { 'Content-Type': type }); res.end(body); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 100000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/teach' && req.method === 'POST') {
    try {
      const result = await teach(await readBody(req));
      send(res, result.statusCode, result.headers['Content-Type'], result.body);
    } catch (error) { send(res, 502, 'application/json', JSON.stringify({ error: 'The curious student is unavailable right now. Try again in a moment.' })); }
    return;
  }
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.join(publicDir, requested);
  if (!file.startsWith(publicDir)) return send(res, 403, 'text/plain', 'Forbidden');
  fs.readFile(file, (error, data) => error ? send(res, 404, 'text/plain', 'Not found') : send(res, 200, types[path.extname(file)] || 'application/octet-stream', data));
});
server.listen(port, () => console.log(`TeachMe Back running at http://localhost:${port}`));
