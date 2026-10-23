const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('./api/submissions');
const pages = { '/': 'index.html', '/index.html': 'index.html', '/trainer': 'trainer.html', '/trainer.html': 'trainer.html' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/submissions') { handler(req, res); return; }
  const file = pages[pathname];
  if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(path.join(__dirname, file)).pipe(res);
});
if (require.main === module) server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('TM Case Lab server listening on port '+(process.env.PORT || 3000)));
module.exports = server;
