// Pure helpers over CategoryEntry[]. Kept separate from categories.ts
// because categories.ts is the authoritative key/displayName table and
// has no runtime dependencies — these helpers operate on the schema's
// inferred shape.

import type { CategoryEntry } from './schemas.ts';

export function primaryCategoryKey(categories: CategoryEntry[]): string {
  if (categories.length === 0) return 'misc';
  const sorted = [...categories].sort((a, b) => b.score - a.score);
  return sorted[0]!.key;
}
