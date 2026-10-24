const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

// Locate public directory: either ./Frontend, ../Frontend, or ./
const candidates = [
  path.join(__dirname, 'Frontend'),
  path.join(__dirname, '..', 'Frontend'),
  path.join(process.cwd(), 'Frontend'),
  __dirname
];

const PUBLIC_DIR = candidates.find(dir => {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, 'index.html'));
  } catch (e) {
    return false;
  }
}) || (fs.existsSync(path.join(__dirname, 'Frontend')) ? path.join(__dirname, 'Frontend') : __dirname);

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

function startServer(port) {
  const server = http.createServer((req, res) => {
    // Enable CORS for local dev
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Handle basic API endpoints
    if (pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');
      if (pathname === '/api/health' || pathname === '/api/status') {
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'ok',
          service: 'LifeOS API',
          version: '1.0.0',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }));
        return;
      }
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Endpoint not found', path: pathname }));
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    // Normalize and prevent directory traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(PUBLIC_DIR, safePath);

    // Verify it stays within PUBLIC_DIR
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err) {
        // If file not found, fallback to index.html if route doesn't have an extension
        if (path.extname(filePath) === '') {
          const indexHtml = path.join(PUBLIC_DIR, 'index.html');
          if (fs.existsSync(indexHtml)) {
            filePath = indexHtml;
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
      } else if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': Buffer.byteLength(content),
          'Cache-Control': 'no-cache',
        });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end(content);
        }
      });
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[LifeOS] Port ${port} is already in use. Retrying on port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[LifeOS] Server error:', err);
    }
  });

  server.listen(port, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log('\n==================================================');
    console.log('  🚀 LifeOS is running successfully!');
    console.log(`  ➜ Local:   http://${displayHost}:${port}`);
    console.log(`  ➜ Serving: ${PUBLIC_DIR}`);
    console.log('==================================================\n');
  });

  return server;
}

startServer(DEFAULT_PORT);
