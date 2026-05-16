// Walk up from `startDir` looking for a file or directory named `name`.
// Returns the absolute path when found, or null if we hit the filesystem
// root first. Used to locate repo-rooted files (`.gitpulse.json`,
// `.env.local`) when the CLI is invoked from a subdirectory.

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function findUp(name: string, startDir: string): string | null {
  let dir = resolve(startDir);
  while (true) {
    const candidate = resolve(dir, name);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
