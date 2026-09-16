const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

async function availablePort() {
  const server = http.createServer();
  const port = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Portfolio server did not start');
}

test('contact form sends validated data to the Google mail gateway', async (t) => {
  let capturedRequest;
  const gateway = http.createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      capturedRequest = JSON.parse(body);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
    });
  });
  const gatewayPort = await listen(gateway);
  t.after(() => new Promise((resolve) => gateway.close(resolve)));

  const appPort = await availablePort();
  const app = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(appPort),
      GOOGLE_SCRIPT_URL: `http://127.0.0.1:${gatewayPort}/exec`,
      FORM_SECRET: 'integration-test-secret'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => app.kill());
  await waitForServer(`http://127.0.0.1:${appPort}/health`);

  const response = await fetch(`http://127.0.0.1:${appPort}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Тестовый клиент', email: 'client@example.com',
      phone: '+7 999 000-00-00', website: '', consent: true
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(capturedRequest.secret, 'integration-test-secret');
  assert.equal(capturedRequest.email, 'client@example.com');
  assert.equal(capturedRequest.phone, '+7 999 000-00-00');
  assert.equal(capturedRequest.consent, true);
});
