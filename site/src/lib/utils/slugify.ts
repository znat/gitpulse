/**
 * Convert text to a URL-friendly slug.
 *
 * Lowercase, replace non-alphanumeric with hyphens,
 * collapse runs, trim, truncate at word boundary.
 */
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
