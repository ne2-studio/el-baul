import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const COMPOSE_FILE = 'docker-compose.lite.yml';

async function waitForOk(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = new Error(`${url} responded ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

// Deliberately a separate global-setup from e2e/'s — this suite verifies el-baul-api-lite +
// the already-built frontend image, not the full docker-compose.yaml stack, and the two must
// never be able to affect each other's config.
export default async function globalSetup() {
  const running = execSync('docker ps --format "{{.Names}}"').toString();
  if (running.split('\n').some((name) => name.startsWith('el-baul-lite-'))) {
    execSync(`docker compose -f ${COMPOSE_FILE} down`, { cwd: REPO_ROOT, stdio: 'inherit' });
  }

  // No --build: api-lite/app are images supplied from outside (APP_IMAGE/API_LITE_IMAGE env
  // vars, see docker-compose.lite.yml) — this suite verifies the artifact, not a rebuild of it.
  execSync(`docker compose -f ${COMPOSE_FILE} up -d`, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    timeout: 5 * 60 * 1000,
  });

  await waitForOk('http://localhost:5051/health', 120_000);
  await waitForOk('http://localhost:3000', 120_000);
  await waitForOk('http://localhost:5000/.well-known/jwks.json', 120_000);
}
