import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default async function globalTeardown() {
  // No -v: keeps pgdata/miniodata volumes, same convention as the `run` skill's
  // teardown — a local session's seeded baúles/photos survive between runs.
  execSync('docker compose down', { cwd: REPO_ROOT, stdio: 'inherit' });
}
