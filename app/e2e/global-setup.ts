import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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

export default async function globalSetup() {
  // Stale el-baul-* containers from a previous session are the single most expensive
  // failure mode in this repo (serving an old build on the port we're about to test) —
  // see the `run`/`verify` skills. Always start from a clean slate.
  const running = execSync('docker ps --format "{{.Names}}"').toString();
  if (running.split('\n').some((name) => name.startsWith('el-baul-'))) {
    execSync('docker compose down', { cwd: REPO_ROOT, stdio: 'inherit' });
  }

  execSync('docker compose up --build -d', {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    timeout: 10 * 60 * 1000,
  });

  await waitForOk('http://localhost:5050/health', 120_000);
  await waitForOk('http://localhost:3000', 120_000);
}
