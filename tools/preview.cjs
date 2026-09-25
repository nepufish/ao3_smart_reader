const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let file = ['/', '/works', '/works/search'].includes(url.pathname) ? '/demo/browse.html' : /^\/works\/\d+(\/chapters\/\d+)?\/?$/.test(url.pathname) ? '/demo/index.html' : url.pathname;
  file = path.resolve(root, '.' + file);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/plain');
    res.end(data);
  });
}).listen(4173, '127.0.0.1', () => console.log('Chapterlight preview: http://127.0.0.1:4173/works/101/chapters/201'));
