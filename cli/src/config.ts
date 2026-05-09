import { loadProjectConfig } from './project-config.ts';

export interface RuntimeConfig {
  repoDir: string;
  repoFullName: string;
  dataDir: string;
  storiesDir: string;
  releasesDir: string;
  branch?: string;
  bootstrapDays: number;
  limit?: number;
  concurrency: number;
  githubToken?: string;
  siteUrl: string;
  releasesCap: number;
  includePrereleases: boolean;
  publicationTitle?: string;
  publicationSubtitle?: string;
  daysPerPage?: number;
  releasesPerPage?: number;
  theme?: {
    accentColor?: string;
  };
  ai: {
    apiKey: string;
    model: string;
    protocol: 'openai' | 'anthropic';
    baseURL?: string;
    temperature: number;
  };
}

export function loadConfig(env = process.env): RuntimeConfig {
  const repoFullName =
    env.GITHUB_REPOSITORY || detectRepoFullName(env);
  if (!repoFullName) {
    throw new Error(
      'Missing GITHUB_REPOSITORY: not set and not auto-detectable. ' +
        'Set it to <owner>/<repo>, or run on a platform that exposes ' +
        'repo info via env (Vercel: VERCEL_GIT_REPO_OWNER + VERCEL_GIT_REPO_SLUG; ' +
        'Netlify: REPOSITORY_URL).',
    );
  }
  // Validate that repoFullName matches the "<owner>/<repo>" pattern
  const parts = repoFullName.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      'Missing GITHUB_REPOSITORY: not set and not auto-detectable. ' +
        'Set it to <owner>/<repo>, or run on a platform that exposes ' +
        'repo info via env (Vercel: VERCEL_GIT_REPO_OWNER + VERCEL_GIT_REPO_SLUG; ' +
        'Netlify: REPOSITORY_URL).',
    );
  }
  const apiKey = required(env, 'OPENAI_API_KEY');
  const repoDir = env.GITPULSE_REPO_DIR ?? env.GITHUB_WORKSPACE ?? process.cwd();
  // Match build.ts default so the zero-config consumer flow
  // (analyze → build) wires together without GITPULSE_DATA_DIR.
  // self-deploy.yml overrides this explicitly to site/public/data.
  const dataDir = env.GITPULSE_DATA_DIR ?? `${repoDir}/.gitpulse/data`;
  const projectConfig = loadProjectConfig(repoDir);

  return {
    repoDir,
    repoFullName,
    dataDir,
    storiesDir: env.GITPULSE_STORIES_DIR ?? `${dataDir}/stories`,
    releasesDir: env.GITPULSE_RELEASES_DIR ?? `${dataDir}/releases`,
    branch: env.GITPULSE_BRANCH || undefined,
    bootstrapDays: projectConfig.bootstrapDays ?? 30,
    limit: env.GITPULSE_LIMIT ? Number(env.GITPULSE_LIMIT) : undefined,
    concurrency: Math.max(1, projectConfig.concurrency ?? 10),
    githubToken: env.GITHUB_TOKEN || undefined,
    siteUrl: resolveSiteUrl(env, repoFullName),
    releasesCap: Math.max(0, projectConfig.releasesCap ?? 20),
    includePrereleases: projectConfig.includePrereleases ?? true,
    publicationTitle: projectConfig.publicationTitle,
    publicationSubtitle: projectConfig.publicationSubtitle,
    daysPerPage: projectConfig.daysPerPage,
    releasesPerPage: projectConfig.releasesPerPage,
    theme: projectConfig.theme,
    ai: {
      apiKey,
      model: env.AI_MODEL ?? 'gpt-4o-mini',
      protocol: (env.AI_PROTOCOL as 'openai' | 'anthropic') ?? 'openai',
      baseURL: env.AI_BASE_URL || undefined,
      temperature: Number(env.AI_TEMPERATURE ?? 0),
    },
  };
}

// Resolve the site URL with priority:
// 1. Explicit GITPULSE_SITE_URL (normalized)
// 2. Auto-detected deployed URL (normalized)
// 3. GitHub Pages fallback (only if GITPULSE_BASE_PATH is default or 'auto')
// Throws if GITPULSE_BASE_PATH is set to non-default and no explicit GITPULSE_SITE_URL.
function resolveSiteUrl(env: NodeJS.ProcessEnv, repoFullName: string): string {
  const basePath = env.GITPULSE_BASE_PATH;

  // 1. First, check for explicit GITPULSE_SITE_URL
  const explicitUrl = normalizeSiteUrl(env.GITPULSE_SITE_URL);
  if (explicitUrl) {
    return explicitUrl;
  }

  // 2. Then try auto-detected deployed URL
  const detected = detectDeployedUrl(env);
  if (detected) {
    return detected.endsWith('/') ? detected : `${detected}/`;
  }

  // 3. If GITPULSE_BASE_PATH is set and not 'auto', require explicit GITPULSE_SITE_URL
  if (basePath && basePath !== 'auto') {
    throw new Error(
      'GITPULSE_BASE_PATH is set to a non-default value, but GITPULSE_SITE_URL is not set. ' +
        'When using a custom base path, you must explicitly set GITPULSE_SITE_URL.',
    );
  }

  // 4. Fallback to GitHub Pages
  const [owner, repo] = repoFullName.split('/');
  return `https://${owner}.github.io/${repo}/`;
}

// Auto-detect the deployed site URL from common platform env vars.
// Priority: Vercel → Netlify → Cloudflare Pages → GH Pages fallback.
// Always returns a URL ending in '/' so the analyzer can append paths
// directly (data/manifest.json, etc.).
function autoSiteUrl(env: NodeJS.ProcessEnv, repoFullName: string): string {
  const detected = detectDeployedUrl(env);
  if (detected) return detected.endsWith('/') ? detected : `${detected}/`;
  const [owner, repo] = repoFullName.split('/');
  return `https://${owner}.github.io/${repo}/`;
}

function normalizeSiteUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.endsWith('/') ? raw : `${raw}/`;
}

// Derive `<owner>/<repo>` from build-platform env vars when GITHUB_REPOSITORY
// isn't set (Vercel and Netlify expose this; Cloudflare Pages doesn't).
function detectRepoFullName(env: NodeJS.ProcessEnv): string | undefined {
  // Vercel
  if (env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG) {
    return `${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}`;
  }
  // Netlify exposes a full git URL: parse owner/repo out of it.
  if (env.REPOSITORY_URL) {
    const match = env.REPOSITORY_URL.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (match) return `${match[1]}/${match[2]}`;
  }
  return undefined;
}

function detectDeployedUrl(env: NodeJS.ProcessEnv): string | undefined {
  // Vercel: production prefers the stable URL, previews use VERCEL_URL.
  if (env.VERCEL) {
    const host =
      env.VERCEL_ENV === 'production'
        ? env.VERCEL_PROJECT_PRODUCTION_URL ?? env.VERCEL_URL
        : env.VERCEL_URL;
    if (host) return `https://${host}`;
  }
  // Netlify: URL is the canonical, DEPLOY_PRIME_URL is branch-specific.
  if (env.NETLIFY === 'true') {
    return env.URL || env.DEPLOY_PRIME_URL || env.DEPLOY_URL;
  }
  // Cloudflare Pages.
  if (env.CF_PAGES === '1' && env.CF_PAGES_URL) {
    return env.CF_PAGES_URL;
  }
  return undefined;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
