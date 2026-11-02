import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
const directory = await mkdtemp(path.join(tmpdir(), 'wise-discovery-test-'));
const port = '3117'; const origin = `http://127.0.0.1:${port}`;
const key = randomBytes(24).toString('hex');
const child = spawn(process.execPath, ['.next/standalone/server.js'], { env: {
  ...process.env, PORT: port, HOSTNAME: '127.0.0.1', DISCOVERY_LOCAL_STORAGE: 'true',
  DISCOVERY_STORAGE_URL: '', DISCOVERY_COSMOS_ENDPOINT: '', DISCOVERY_SECURE_COOKIE: 'false', DISCOVERY_PORTAL: 'true',
  DISCOVERY_ORIGIN: origin, DISCOVERY_ADDITIONAL_ORIGIN: '', DISCOVERY_ADMIN_KEY: key, DISCOVERY_SESSION_SECRET: randomBytes(32).toString('hex'),
  DISCOVERY_DATA_DIR: directory,
}, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
child.stdout.on('data', chunk => { logs += chunk; });
child.stderr.on('data', chunk => { logs += chunk; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error('Servidor de teste encerrou: ' + logs);
    try { const response = await fetch(origin + '/api/discovery/health'); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('Servidor não ficou pronto.');
  for (const suite of ['tests/discovery/portal.test.mjs','tests/discovery/beach.test.mjs']) {
  const result = await new Promise(resolve => {
    const test = spawn(process.execPath, [suite], { stdio: 'inherit', env: { ...process.env, TEST_DISCOVERY_ORIGIN: origin, DISCOVERY_ADDITIONAL_ORIGIN: '', TEST_DISCOVERY_ADMIN_KEY: key, TEST_DISCOVERY_DATA_DIR: directory } });
    test.on('exit', code => resolve(code));
  });
  if (result !== 0) throw new Error('Teste de integração falhou: '+suite);
  }
} finally {
  if (child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM');
    await exited;
  }
  await rm(directory, { recursive: true, force: true });
}
