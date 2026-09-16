const http = require('node:http');
const { createReadStream, existsSync, statSync } = require('node:fs');
const { extname, join, normalize, resolve, sep } = require('node:path');

const host = '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const publicRoot = resolve(__dirname, 'public');
const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL || '';
const formSecret = process.env.FORM_SECRET || '';
const submissionLog = new Map();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request, limit = 20_000) {
  return new Promise((resolveBody, rejectBody) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        rejectBody(new Error('PAYLOAD_TOO_LARGE'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try { resolveBody(JSON.parse(body || '{}')); }
      catch { rejectBody(new Error('INVALID_JSON')); }
    });
    request.on('error', rejectBody);
  });
}

function isRateLimited(address) {
  const now = Date.now();
  const recent = (submissionLog.get(address) || []).filter((timestamp) => now - timestamp < 10 * 60 * 1000);
  if (recent.length >= 5) return true;
  recent.push(now);
  submissionLog.set(address, recent);
  return false;
}

function sanitizeLine(value, maxLength) {
  return String(value || '').replace(/[\r\n\0]/g, ' ').trim().slice(0, maxLength);
}

async function sendContactEmail({ name, email, phone }) {
  if (!googleScriptUrl || !formSecret) throw new Error('MAIL_GATEWAY_NOT_CONFIGURED');

  const gatewayResponse = await fetch(googleScriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: formSecret, name, email, phone, consent: true }),
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000)
  });
  if (!gatewayResponse.ok) throw new Error(`MAIL_GATEWAY_HTTP_${gatewayResponse.status}`);

  const result = await gatewayResponse.json().catch(() => null);
  if (!result?.ok) throw new Error(`MAIL_GATEWAY_${result?.error || 'INVALID_RESPONSE'}`);
}

async function handleContactRequest(request, response) {
  const address = request.socket.remoteAddress || 'unknown';
  if (isRateLimited(address)) {
    sendJson(response, 429, { message: 'Слишком много попыток. Попробуйте немного позже.' });
    return;
  }

  let data;
  try { data = await readJsonBody(request); }
  catch (error) {
    sendJson(response, error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400, { message: 'Не удалось прочитать данные формы.' });
    return;
  }

  if (sanitizeLine(data.website, 120)) {
    sendJson(response, 200, { ok: true });
    return;
  }

  const name = sanitizeLine(data.name, 80);
  const email = sanitizeLine(data.email, 160).toLowerCase();
  const phone = sanitizeLine(data.phone, 30);
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneIsValid = /^[+0-9 ()-]{7,30}$/.test(phone);
  if (!name || !emailIsValid || !phoneIsValid || data.consent !== true) {
    sendJson(response, 400, { message: 'Проверьте поля формы и подтвердите согласие.' });
    return;
  }

  try {
    await sendContactEmail({ name, email, phone });
    sendJson(response, 200, { ok: true });
  } catch (error) {
    const notConfigured = error.message === 'MAIL_GATEWAY_NOT_CONFIGURED';
    if (!notConfigured) console.error('Contact form delivery failed:', error.message);
    sendJson(response, 503, { message: notConfigured ? 'Отправка заявок ещё не настроена.' : 'Почтовый сервис временно недоступен.' });
  }
}

function resolvePublicPath(pathname) {
  let decodedPath;
  try { decodedPath = decodeURIComponent(pathname); }
  catch { return null; }
  const relativePath = normalize(decodedPath).replace(/^([/\\])+/, '');
  let filePath = resolve(publicRoot, relativePath || 'index.html');
  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${sep}`)) return null;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html');
  return filePath;
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (request.method === 'GET' && requestUrl.pathname === '/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/contact') {
    await handleContactRequest(request, response);
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { message: 'Метод не поддерживается.' });
    return;
  }

  const filePath = resolvePublicPath(requestUrl.pathname);
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Страница не найдена');
    return;
  }
  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=86400'
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => console.log(`Portfolio is available on port ${port}`));
