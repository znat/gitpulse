import { dirname, isAbsolute, join } from 'node:path';
import { loadProjectConfig, type ProjectConfig } from './project-config.ts';
import { findUp } from './find-up.ts';
import { DEFAULT_LABELS } from './labels.ts';
import type { ImageAIConfig } from './image/generator.ts';

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
    linkColor?: string;
  };
  ai: {
    apiKey: string;
    model: string;
    protocol: 'openai' | 'anthropic';
    baseURL?: string;
    temperature: number;
  };
  // Set only when .gitpulse.json declares images.ai AND the matching
  // provider API key env var is present. The analyzer treats absence as
  // "image generation disabled" and logs why.
  imageAi?: ImageAIConfig;
  images?: ProjectConfig['images'];
  labels: {
    ignore: string;
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
  const repoDir = resolveRepoDir(env);
  const projectConfig = loadProjectConfig(repoDir);
  const analysis = projectConfig.analysis;

  // Locations are deploy-environment-specific, so env override wins over
  // the committed file. Match build.ts defaults so the zero-config flow
  // (analyze → build) wires together; self-deploy.yml overrides DATA_DIR.
  const dataDir = resolvePath(
    env.GITPULSE_DATA_DIR ?? projectConfig.paths?.dataDir,
    repoDir,
    `${repoDir}/.gitpulse/data`,
  );

  return {
    repoDir,
    repoFullName,
    dataDir,
    storiesDir: resolvePath(
      env.GITPULSE_STORIES_DIR ?? projectConfig.paths?.storiesDir,
      repoDir,
      `${dataDir}/stories`,
    ),
    releasesDir: resolvePath(
      env.GITPULSE_RELEASES_DIR ?? projectConfig.paths?.releasesDir,
      repoDir,
      `${dataDir}/releases`,
    ),
    branch: analysis?.branch || undefined,
    bootstrapDays: analysis?.bootstrapDays ?? 30,
    limit: analysis?.limit,
    concurrency: Math.max(1, analysis?.concurrency ?? 10),
    githubToken: env.GITHUB_TOKEN || undefined,
    siteUrl: resolveSiteUrl(env, projectConfig, repoFullName),
    releasesCap: Math.max(0, analysis?.releasesCap ?? 20),
    includePrereleases: analysis?.includePrereleases ?? true,
    publicationTitle: projectConfig.publicationTitle,
    publicationSubtitle: projectConfig.publicationSubtitle,
    daysPerPage: projectConfig.daysPerPage,
    releasesPerPage: projectConfig.releasesPerPage,
    theme: projectConfig.theme,
    ai: resolveTextAi(projectConfig, env),
    imageAi: resolveImageAi(projectConfig, env),
    images: projectConfig.images,
    labels: {
      ignore: projectConfig.labels?.ignore ?? DEFAULT_LABELS.ignore,
    },
  };
}

// Resolve an optional configured path against the repo root. Absolute paths
// pass through; relative paths (from .gitpulse.json) are joined to repoDir so
// the same config works regardless of the CLI's cwd. Falls back to `def`.
function resolvePath(
  value: string | undefined,
  repoDir: string,
  def: string,
): string {
  if (!value) return def;
  return isAbsolute(value) ? value : join(repoDir, value);
}

// Derive the text-LLM runtime config from .gitpulse.json `text`. The wire
// protocol follows the provider (anthropic → Anthropic SDK, everything else →
// OpenAI SDK); baseURL is only set for the 'openai-compatible' provider. When
// `text` is omitted we default to OpenAI gpt-4o-mini. API keys are env-only.
function resolveTextAi(
  projectConfig: ProjectConfig,
  env: NodeJS.ProcessEnv,
): RuntimeConfig['ai'] {
  const text = projectConfig.text;
  const protocol: 'openai' | 'anthropic' =
    text?.provider === 'anthropic' ? 'anthropic' : 'openai';
  const apiKey = resolveTextApiKey(env, protocol);
  return {
    apiKey,
    model: text?.model ?? 'gpt-4o-mini',
    protocol,
    baseURL: text?.provider === 'openai-compatible' ? text.baseURL : undefined,
    temperature: text?.temperature ?? 0,
  };
}

// Determine which directory to treat as the repo root. Explicit env vars
// win unchanged. When neither is set, walk up from cwd to find
// `.gitpulse.json` so the CLI does the right thing when invoked from
// `cli/` or any other subdirectory of the project.
function resolveRepoDir(env: NodeJS.ProcessEnv): string {
  const explicit = env.GITPULSE_REPO_DIR ?? env.GITHUB_WORKSPACE;
  if (explicit) return explicit;
  const configPath = findUp('.gitpulse.json', process.cwd());
  return configPath ? dirname(configPath) : process.cwd();
}

function resolveImageAi(
  projectConfig: ProjectConfig,
  env: NodeJS.ProcessEnv,
): ImageAIConfig | undefined {
  const ai = projectConfig.images?.ai;
  if (!ai) return undefined;
  if (ai.provider === 'gemini') {
    // Accept either name. GEMINI_API_KEY wins when both are set (more
    // specific intent); GOOGLE_API_KEY is the canonical name the official
    // @google/genai SDK and many existing setups already use.
    const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
    if (!apiKey) return undefined;
    return { provider: 'gemini', model: ai.model, apiKey };
  }
  return undefined;
}

// Resolve the site URL with priority (locations are deploy-specific, so the
// env override outranks the committed file):
// 1. Explicit GITPULSE_SITE_URL (normalized)
// 2. .gitpulse.json `site.url` (normalized)
// 3. Auto-detected deployed URL (normalized)
// 4. GitHub Pages fallback (only if basePath is default or 'auto')
// Throws if basePath is non-default and no explicit site URL is provided.
function resolveSiteUrl(
  env: NodeJS.ProcessEnv,
  projectConfig: ProjectConfig,
  repoFullName: string,
): string {
  const basePath = resolveBasePath(env, projectConfig);

  // 1./2. Explicit site URL — env override, then the committed file.
  const explicitUrl =
    normalizeSiteUrl(env.GITPULSE_SITE_URL) ??
    normalizeSiteUrl(projectConfig.site?.url);
  if (explicitUrl) {
    return explicitUrl;
  }

  // 3. Then try auto-detected deployed URL
  const detected = detectDeployedUrl(env);
  if (detected) {
    return detected.endsWith('/') ? detected : `${detected}/`;
  }

  // 4. If basePath is set and not 'auto', require an explicit site URL
  if (basePath && basePath !== 'auto') {
    throw new Error(
      'A non-default basePath is set (site.basePath / GITPULSE_BASE_PATH), but no ' +
        'site URL is configured. When using a custom base path, set site.url in ' +
        '.gitpulse.json (or GITPULSE_SITE_URL).',
    );
  }

  // 5. Fallback to GitHub Pages
  const [owner, repo] = repoFullName.split('/');
  return `https://${owner}.github.io/${repo}/`;
}

// basePath with env override winning over the committed file. Used both for
// the site-url consistency check here and (independently) by build.ts.
export function resolveBasePath(
  env: NodeJS.ProcessEnv,
  projectConfig: ProjectConfig,
): string | undefined {
  return env.GITPULSE_BASE_PATH ?? projectConfig.site?.basePath;
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

// Pick the text-gen API key based on the derived protocol. The env var name
// must match the provider: ANTHROPIC_API_KEY for anthropic, OPENAI_API_KEY
// for openai (also covers OpenAI-compatible providers — MiniMax, OpenRouter,
// etc. — configured via text.provider="openai-compatible").
function resolveTextApiKey(
  env: NodeJS.ProcessEnv,
  protocol: 'openai' | 'anthropic',
): string {
  const name = protocol === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
  const v = env[name];
  if (!v) {
    throw new Error(
      `Missing required env var: ${name} (text provider resolves to protocol=${protocol})`,
    );
  }
  return v;
}
