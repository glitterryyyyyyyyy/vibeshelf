const http = require('http');
const { URL } = require('url');

const PROXY_PORT = 8000;
const TARGET_HOST = 'localhost';
const TARGET_PORT = 32000;
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3000'];

function setCorsHeaders(res, origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
}

const server = http.createServer((req, res) => {
  const origin = req.headers['origin'];
  if (req.method === 'OPTIONS') {
    // preflight
    setCorsHeaders(res, origin);
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy the request to the target
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: Object.assign({}, req.headers, { host: TARGET_HOST })
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // copy status and headers
    setCorsHeaders(proxyRes, origin); // set on proxyRes? we'll set on outgoing res below

    // copy headers from backend except hop-by-hop
    Object.keys(proxyRes.headers).forEach((h) => {
      if (!['transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade'].includes(h.toLowerCase())) {
        res.setHeader(h, proxyRes.headers[h]);
      }
    });

    // ensure CORS headers on response
    setCorsHeaders(res, origin);

    res.writeHead(proxyRes.statusCode);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    setCorsHeaders(res, req.headers['origin']);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad gateway', message: err.message }));
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PROXY_PORT, () => {
  console.log(`Proxy listening on http://localhost:${PROXY_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`);
});
