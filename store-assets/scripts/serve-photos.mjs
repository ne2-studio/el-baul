// Tiny static file server for store-assets/fixtures/photos/, so the real running app (in a
// real browser) can load fixture photo URLs like any other image — no build tooling, just
// Node's http module. Used only while generating Play Store screenshots; never referenced by
// any deployed app.
//
// Usage: node store-assets/scripts/serve-photos.mjs [port]
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../fixtures/photos');
const PORT = Number(process.argv[2]) || 4545;

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const fileName = path.basename(urlPath);
    const filePath = path.join(ROOT, fileName);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(400).end('Bad path');
      return;
    }
    await stat(filePath);
    const buf = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fileName).toLowerCase()] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(buf);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Photo fixture server listening on http://localhost:${PORT}`);
});
