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
  ai: {
    apiKey: string;
    model: string;
    protocol: 'openai' | 'anthropic';
    baseURL?: string;
    temperature: number;
  };
}

export function loadConfig(env = process.env): RuntimeConfig {
  const repoFullName = required(env, 'GITHUB_REPOSITORY');
  const apiKey = required(env, 'OPENAI_API_KEY');
  const repoDir = env.GITPULSE_REPO_DIR ?? env.GITHUB_WORKSPACE ?? process.cwd();
  // Match build.ts default so the zero-config consumer flow
  // (analyze → build) wires together without GITPULSE_DATA_DIR.
  // self-deploy.yml overrides this explicitly to site/public/data.
  const dataDir = env.GITPULSE_DATA_DIR ?? `${repoDir}/.gitpulse/data`;

  return {
    repoDir,
    repoFullName,
    dataDir,
    storiesDir: env.GITPULSE_STORIES_DIR ?? `${dataDir}/stories`,
    releasesDir: env.GITPULSE_RELEASES_DIR ?? `${dataDir}/releases`,
    branch: env.GITPULSE_BRANCH || undefined,
    bootstrapDays: Number(env.GITPULSE_BOOTSTRAP_DAYS ?? 30),
    limit: env.GITPULSE_LIMIT ? Number(env.GITPULSE_LIMIT) : undefined,
    concurrency: Math.max(1, Number(env.GITPULSE_CONCURRENCY ?? 10)),
    githubToken: env.GITHUB_TOKEN || undefined,
    // `||` rather than `??` so an empty-string override (common when a CI
    // workflow always sets the env) falls back to autoSiteUrl().
    siteUrl: env.GITPULSE_SITE_URL || autoSiteUrl(env, repoFullName),
    releasesCap: Math.max(0, Number(env.GITPULSE_RELEASES_CAP ?? 20)),
    includePrereleases: env.GITPULSE_INCLUDE_PRERELEASES !== 'false',
    ai: {
      apiKey,
      model: env.AI_MODEL ?? 'gpt-4o-mini',
      protocol: (env.AI_PROTOCOL as 'openai' | 'anthropic') ?? 'openai',
      baseURL: env.AI_BASE_URL || undefined,
      temperature: Number(env.AI_TEMPERATURE ?? 0),
    },
  };
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
