import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer(async (request, response) => {
  const requested = request.url?.split('?')[0] || '/';
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\\/+/, '');
  const file = normalize(join(root, relative));
  if (!file.startsWith(root)) { response.writeHead(403); response.end('Forbidden'); return; }
  try { const fileContent = await readFile(file); response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); response.end(fileContent); }
  catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); }
});
const port = Number(process.env.FRONTEND_PORT || 5500);
server.listen(port, '127.0.0.1', () => console.log(`TripNest frontend: http://127.0.0.1:${port}`));

