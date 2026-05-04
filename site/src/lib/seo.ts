/**
 * SEO Utilities — slim port of gitsky/lib/seo.ts adapted for static export
 * + single-repo. Centralizes URL helpers and metadata builders.
 */

import type { Metadata } from 'next';
import {
  loadRepo,
  publicationName,
  publicationSubtitle,
  type RepoInfo,
} from './repo';
import {
  type Story,
  primaryCategory,
} from './stories';
import type { Release } from './releases';
import {
  storyPath,
  storyOgImagePath,
  releasePath,
  releaseOgImagePath,
  releasesIndexPath,
} from './urls';

const SITE_NAME = 'Gitpulse';

/**
 * Resolve the absolute base URL of the deployed site.
 *
 * Priority:
 *   1. `GITPULSE_SITE_URL` (explicit override).
 *   2. Auto-detected from the build platform's env vars:
 *      Vercel  → `VERCEL_PROJECT_PRODUCTION_URL` (prod) / `VERCEL_URL`
 *      Netlify → `URL` / `DEPLOY_PRIME_URL` / `DEPLOY_URL`
 *      Cloudflare Pages → `CF_PAGES_URL`
 *   3. `https://{owner}.github.io/{repo}` derived from `GITHUB_REPOSITORY`,
 *      but ONLY when `GITPULSE_BASE_PATH` is unset / 'auto' — i.e. the
 *      project-Pages defaults align. If basePath was overridden away from
 *      the default, the GH Pages fallback is wrong; returns empty
 *      (path-only canonicals) and logs a warning at build time.
 *   4. Empty string (development / preview).
 *
 * Mirrors `next.config.js` basePath resolution.
 */
export function getBaseUrl(): string {
  const explicit = process.env.GITPULSE_SITE_URL?.replace(/\/$/, '');
  if (explicit) return explicit;

  const detected = detectDeployedUrl();
  if (detected) return detected.replace(/\/$/, '');

  const fullName = process.env.GITHUB_REPOSITORY;
  if (!fullName) return '';
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) return '';

  const basePathOverride = process.env.GITPULSE_BASE_PATH;
  const overrideUsesFallback =
    !basePathOverride || basePathOverride === 'auto';
  if (!overrideUsesFallback) {
    if (typeof console !== 'undefined') {
      console.warn(
        `[gitpulse seo] GITPULSE_BASE_PATH=${JSON.stringify(basePathOverride)} ` +
          'overrides the default; canonical URLs require GITPULSE_SITE_URL ' +
          'to be set to the actual deployed URL. Returning empty base.',
      );
    }
    return '';
  }

  return `https://${owner}.github.io/${repo}`;
}

function detectDeployedUrl(): string | undefined {
  // Vercel
  if (process.env.VERCEL) {
    const host =
      process.env.VERCEL_ENV === 'production'
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
        : process.env.VERCEL_URL;
    if (host) return `https://${host}`;
  }
  // Netlify
  if (process.env.NETLIFY === 'true') {
    return (
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      process.env.DEPLOY_URL
    );
  }
  // Cloudflare Pages
  if (process.env.CF_PAGES === '1' && process.env.CF_PAGES_URL) {
    return process.env.CF_PAGES_URL;
  }
  return undefined;
}

export function canonicalUrl(path: string): string {
  const base = getBaseUrl();
  if (!path.startsWith('/')) path = `/${path}`;
  return `${base}${path}`;
}

export function truncateDescription(
  text: string | null | undefined,
  maxLen = 160,
): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '…';
}

// ── Home (publication front page) ────────────────────────

export function buildHomeMetadata(repo: RepoInfo = loadRepo()): Metadata {
  const title = `${publicationName(repo)} — ${SITE_NAME}`;
  const description = truncateDescription(
    repo.description
      ? `${publicationSubtitle(repo)}. ${repo.description}`
      : publicationSubtitle(repo),
  );
  const url = canonicalUrl('/');
  const ogImage = canonicalUrl('/opengraph-image.png');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

// ── Story page ───────────────────────────────────────────

const STORY_TITLE_MAX = 70;

function buildStoryTitle(story: Story): string {
  const ref = story.kind === 'pr' ? ` #${story.prNumber}` : '';
  const suffix = `${ref} · ${SITE_NAME}`;
  const budget = STORY_TITLE_MAX - suffix.length;
  if (story.headline.length <= budget) return `${story.headline}${suffix}`;
  const truncated = story.headline.slice(0, budget - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  const base = lastSpace > 10 ? truncated.slice(0, lastSpace) : truncated;
  return `${base}…${suffix}`;
}

export function buildStoryMetadata(story: Story): Metadata {
  const title = buildStoryTitle(story);
  const description = truncateDescription(story.standfirst);
  const url = canonicalUrl(storyPath(story));
  const ogImage = canonicalUrl(storyOgImagePath(story));
  const publishedTime = story.mergedAt ?? story.committedAt;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630, alt: story.headline }],
      publishedTime,
      authors: [story.author],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

export function storyPrimaryCategory(story: Story): string | null {
  return primaryCategory(story)?.key ?? null;
}

// ── Releases ─────────────────────────────────────────────

export function buildReleaseMetadata(
  release: Release,
  repo: RepoInfo = loadRepo(),
): Metadata {
  const titleBase = release.name
    ? `${release.name} (${release.tag})`
    : release.tag;
  const title = `${titleBase} — ${publicationName(repo)} · ${SITE_NAME}`;
  const description = truncateDescription(
    release.quip || `Release ${release.tag} of ${publicationName(repo)}.`,
  );
  const url = canonicalUrl(releasePath(release));
  const ogImage = canonicalUrl(releaseOgImagePath(release));

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630, alt: titleBase }],
      publishedTime: release.publishedAt,
      authors: [release.authorLogin],
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  };
}

export function buildReleasesListMetadata(
  repo: RepoInfo = loadRepo(),
): Metadata {
  const title = `Releases — ${publicationName(repo)} · ${SITE_NAME}`;
  const description = truncateDescription(
    `Special editions for every release of ${publicationName(repo)}.`,
  );
  const url = canonicalUrl(releasesIndexPath());

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: SITE_NAME,
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  };
}
