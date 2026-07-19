import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default async function globalTeardown() {
  if (process.env.CI) {
    // Once `docker compose down` runs, these logs are gone — a failed e2e run in CI
    // would otherwise be a black box (the Playwright report shows what the browser saw,
    // not why the API returned it). Always dumped, not just on failure: globalTeardown
    // has no simple way to know the run's pass/fail here, and the cost is just extra CI
    // log output.
    execSync('docker compose logs --no-color', { cwd: REPO_ROOT, stdio: 'inherit' });
  }

  // No -v: keeps pgdata/miniodata volumes, same convention as the `run` skill's
  // teardown — a local session's seeded baúles/photos survive between runs.
  execSync('docker compose down', { cwd: REPO_ROOT, stdio: 'inherit' });
}
