import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']],
  ['/release.mjs', ['release.mjs', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);
const port = Number(process.env.PORT || 8144);

const server = createServer(async (request, response) => {
  const path = request.url.split('?')[0];
  const asset = assets.get(path);
  const isRead = request.method === 'GET' || request.method === 'HEAD';
  if (!asset || !isRead) {
    response.writeHead(isRead ? 404 : 405, { 'Content-Type': 'text/plain' });
    response.end(isRead ? 'Not found' : 'Method not allowed');
    return;
  }
  try {
    const content = await readFile(new URL(asset[0], import.meta.url));
    response.writeHead(200, {
      'Content-Type': asset[1],
      'Content-Length': content.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain' });
    response.end('Could not load the app');
  }
});

server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  console.log(`Release Evidence Check is running at http://127.0.0.1:${address.port}`);
});
