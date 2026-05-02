// Verbatim duplicate of site/src/lib/utils/slugify.ts — kept in lockstep so
// the action and the site agree on URL slugs without a shared package.

export function slugify(text: string, maxLen = 80): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug.length <= maxLen) return slug;

  const truncated = slug.slice(0, maxLen);
  const lastHyphen = truncated.lastIndexOf('-');
  return lastHyphen > 0 ? truncated.slice(0, lastHyphen) : truncated;
}
