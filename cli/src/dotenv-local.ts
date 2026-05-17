// Auto-load `.env.local` for local-dev CLI runs. Scopes the lookup to the
// gitpulse repo root (the directory containing `.gitpulse.json`) so an
// unrelated parent `.env.local` — e.g. one in $HOME or a containing
// monorepo — can't leak secrets into the analyzer. Skipped in CI: secrets
// come from the workflow env, not a local file. Node's `loadEnvFile`
// doesn't override already-set values, but the CI check makes the intent
// explicit.

import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { findUp } from './find-up.ts';

export function loadEnvLocal(): void {
  if (process.env.CI === 'true') return;
  const configPath = findUp('.gitpulse.json', process.cwd());
  if (!configPath) return; // Not running inside a gitpulse repo — bail.
  const envPath = join(dirname(configPath), '.env.local');
  if (!existsSync(envPath)) return;
  try {
    process.loadEnvFile(envPath);
  } catch {
    // loadEnvFile throws on malformed files — ignore so a broken .env.local
    // never prevents the CLI from running. The user will see a missing
    // env-var error downstream with a clearer message.
  }
}
