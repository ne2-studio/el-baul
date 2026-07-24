import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const COMPOSE_FILE = 'docker-compose.lite.yml';

export default async function globalTeardown() {
  if (process.env.CI) {
    execSync(`docker compose -f ${COMPOSE_FILE} logs --no-color`, { cwd: REPO_ROOT, stdio: 'inherit' });
  }

  // -v: unlike docker-compose.yaml's stack, el-baul-api-lite has no volumes to preserve —
  // everything it has is in memory and gone on container stop anyway.
  execSync(`docker compose -f ${COMPOSE_FILE} down -v`, { cwd: REPO_ROOT, stdio: 'inherit' });
}
