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

  // In CI, ci-cd.yml already `docker load`s the exact images that passed backend-tests/
  // frontend-checks as an explicit prior step — rebuilding here would silently test a
  // different (fresh) build than the one deploy-* jobs will push later in the same run.
  // Locally, always rebuild fresh — see the clean-slate comment above.
  const buildFlag = process.env.CI ? '' : '--build';
  execSync(`docker compose up ${buildFlag} -d`.trim(), {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    timeout: 10 * 60 * 1000,
  });

  await waitForOk('http://localhost:5050/health', 120_000);
  await waitForOk('http://localhost:3000', 120_000);
  // fake-oidc has no docker-compose healthcheck, so `api`'s `depends_on: service_started`
  // only guarantees its container process started, not that its HTTP server is actually
  // accepting connections yet. Best hypothesis for a 500 seen on the first authenticated
  // request in CI (never reproduced locally): either the JWT bearer handler's own JWKS
  // fetch or UserSyncMiddleware's userinfo call (api/ElBaul.Infra/OidcUserInfoClient.cs)
  // races that gap. Not confirmed via a stack trace — that run predates
  // global-teardown.ts dumping `docker compose logs` on CI failure. If this still 500s
  // with this wait in place, check those logs before assuming this fixed it.
  await waitForOk('http://localhost:5000/.well-known/jwks.json', 120_000);
}
