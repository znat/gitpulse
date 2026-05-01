#!/usr/bin/env node
/**
 * Rename Next.js opengraph-image output files to add a .png extension so
 * GitHub Pages serves them with `Content-Type: image/png`. Required because
 * the OG route writes to `out/.../opengraph-image` with no extension and GH
 * Pages defaults to `application/octet-stream` for unknown types.
 */

import { readdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'out';

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

let renamed = 0;
for (const path of walk(OUT)) {
  if (path.endsWith('/opengraph-image') && statSync(path).isFile()) {
    renameSync(path, `${path}.png`);
    renamed++;
  }
}
console.log(`[rename-og] renamed ${renamed} opengraph-image → .png`);
