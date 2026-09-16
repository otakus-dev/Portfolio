const http = require('node:http');
const tls = require('node:tls');
const { createReadStream, existsSync, statSync } = require('node:fs');
const { extname, join, normalize, resolve, sep } = require('node:path');

const host = '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const publicRoot = resolve(__dirname, 'public');
const recipient = process.env.CONTACT_TO || 'ermohinandrei@bk.ru';
const smtpHost = process.env.SMTP_HOST || 'smtp.mail.ru';
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpUser = process.env.SMTP_USER || 'ermohinandrei@bk.ru';
const smtpPassword = process.env.SMTP_PASS || '';
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

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function createSmtpSession(socket) {
  const completed = [];
  const waiters = [];
  let activeResponse = null;
  let buffer = '';

  function deliver(response) {
    const waiter = waiters.shift();
    if (waiter) waiter.resolve(response);
    else completed.push(response);
  }

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    while (buffer.includes('\n')) {
      const breakIndex = buffer.indexOf('\n');
      const line = buffer.slice(0, breakIndex).replace(/\r$/, '');
      buffer = buffer.slice(breakIndex + 1);
      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;
      if (!activeResponse) activeResponse = { code: Number(match[1]), lines: [] };
      activeResponse.lines.push(match[3]);
      if (match[2] === ' ') {
        deliver(activeResponse);
        activeResponse = null;
      }
    }
  });

  socket.on('error', (error) => {
    while (waiters.length) waiters.shift().reject(error);
  });

  function nextResponse() {
    if (completed.length) return Promise.resolve(completed.shift());
    return new Promise((resolveResponse, rejectResponse) => waiters.push({ resolve: resolveResponse, reject: rejectResponse }));
  }

  async function command(text, expectedCodes) {
    socket.write(`${text}\r\n`);
    const response = await nextResponse();
    if (!expectedCodes.includes(response.code)) throw new Error(`SMTP_${response.code}`);
    return response;
  }

  return { command, nextResponse };
}

async function sendContactEmail({ name, email, phone }) {
  if (!smtpPassword) throw new Error('SMTP_NOT_CONFIGURED');
  const socket = tls.connect({ host: smtpHost, port: smtpPort, servername: smtpHost, rejectUnauthorized: true });
  socket.setTimeout(15_000, () => socket.destroy(new Error('SMTP_TIMEOUT')));
  await new Promise((resolveConnection, rejectConnection) => {
    socket.once('secureConnect', resolveConnection);
    socket.once('error', rejectConnection);
  });

  const session = createSmtpSession(socket);
  const greeting = await session.nextResponse();
  if (greeting.code !== 220) throw new Error(`SMTP_${greeting.code}`);
  await session.command('EHLO portfolio-site', [250]);
  await session.command('AUTH LOGIN', [334]);
  await session.command(Buffer.from(smtpUser).toString('base64'), [334]);
  await session.command(Buffer.from(smtpPassword).toString('base64'), [235]);
  await session.command(`MAIL FROM:<${smtpUser}>`, [250]);
  await session.command(`RCPT TO:<${recipient}>`, [250, 251]);
  await session.command('DATA', [354]);

  const submittedAt = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Yekaterinburg'
  }).format(new Date());
  const body = [
    'Новая заявка с сайта-портфолио', '', `Имя: ${name}`, `Почта: ${email}`,
    `Телефон: ${phone}`, `Отправлено: ${submittedAt}`, '',
    'Посетитель подтвердил согласие на обработку указанных персональных данных для ответа на обращение.'
  ].join('\r\n').replace(/^\./gm, '..');
  const message = [
    `From: ${encodeHeader('Сайт-портфолио')} <${smtpUser}>`, `To: <${recipient}>`,
    `Reply-To: <${email}>`, `Subject: ${encodeHeader(`Новая заявка с сайта — ${name}`)}`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit', '', body
  ].join('\r\n');

  socket.write(`${message}\r\n.\r\n`);
  const accepted = await session.nextResponse();
  if (accepted.code !== 250) throw new Error(`SMTP_${accepted.code}`);
  await session.command('QUIT', [221]);
  socket.end();
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
    const notConfigured = error.message === 'SMTP_NOT_CONFIGURED';
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
