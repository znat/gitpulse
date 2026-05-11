// Loads .env.local from the repo root before tests run, so the integration
// suite picks up local credentials without the developer having to `export`
// them manually. CI does not have a .env.local file — env vars come from
// GitHub Actions secrets, and loadEnvFile won't override those even if a
// file did exist.
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(here, '../.env.local');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
