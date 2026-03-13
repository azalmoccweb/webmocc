const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const port = Number(process.env.PORT || 3000);
const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.map': 'application/json; charset=utf-8'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(
        res,
        err.code === 'ENOENT' ? 404 : 500,
        err.code === 'ENOENT' ? 'Not found' : 'Internal server error',
        { 'Content-Type': 'text/plain; charset=utf-8' }
      );
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': filePath.includes(`${path.sep}assets${path.sep}`)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache'
    };

    send(res, 200, data, headers);
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  if (pathname === '/health' || pathname === '/api/health') {
    send(res, 200, JSON.stringify({ ok: true }), {
      'Content-Type': 'application/json; charset=utf-8'
    });
    return;
  }

  const cleanedPath = pathname.replace(/^\/+/, '');
  const requestedPath = pathname === '/' ? indexPath : path.join(distDir, cleanedPath);

  if (!requestedPath.startsWith(distDir)) {
    send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  fs.stat(requestedPath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, requestedPath);
      return;
    }
    sendFile(res, indexPath);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`AZAL Premium Ops Report running on ${port}`);
});
