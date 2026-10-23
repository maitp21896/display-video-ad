const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/submissions');
const pages = { '/': 'index.html', '/index.html': 'index.html', '/trainer': 'trainer.html', '/trainer.html': 'trainer.html' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/submissions') { handler(req, res); return; }
  const file = pages[pathname];
  if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(__dirname, '..', file), (error, body) => {
    if (error) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Could not load page'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
});
if (require.main === module) server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('TM Case Lab server listening on port '+(process.env.PORT || 3000)));
module.exports = server;
