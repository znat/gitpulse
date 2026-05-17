// Auto-load `.env.local` for local-dev CLI runs. Walks up from cwd so the
// command works from any subdirectory of the repo. Skipped in CI (where
// secrets come from the workflow env, not a local file) and when env vars
// are already set — Node's `process.loadEnvFile` does not override
// existing values, but the CI check makes the intent explicit.

import { findUp } from './find-up.ts';

export function loadEnvLocal(): void {
  if (process.env.CI === 'true') return;
  const path = findUp('.env.local', process.cwd());
  if (!path) return;
  try {
    process.loadEnvFile(path);
  } catch {
    // loadEnvFile throws on malformed files — ignore so a broken .env.local
    // never prevents the CLI from running. The user will see a missing
    // env-var error downstream with a clearer message.
  }
}
