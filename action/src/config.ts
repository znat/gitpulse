export interface RuntimeConfig {
  repoDir: string;
  repoFullName: string;
  dataDir: string;
  storiesDir: string;
  branch?: string;
  bootstrapDays: number;
  limit?: number;
  concurrency: number;
  githubToken?: string;
  siteUrl: string;
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
  const dataDir = env.GITPULSE_DATA_DIR ?? `${repoDir}/site/public/data`;

  return {
    repoDir,
    repoFullName,
    dataDir,
    storiesDir: env.GITPULSE_STORIES_DIR ?? `${dataDir}/stories`,
    branch: env.GITPULSE_BRANCH || undefined,
    bootstrapDays: Number(env.GITPULSE_BOOTSTRAP_DAYS ?? 30),
    limit: env.GITPULSE_LIMIT ? Number(env.GITPULSE_LIMIT) : undefined,
    concurrency: Math.max(1, Number(env.GITPULSE_CONCURRENCY ?? 10)),
    githubToken: env.GITHUB_TOKEN || undefined,
    siteUrl: env.GITPULSE_SITE_URL ?? autoSiteUrl(repoFullName),
    ai: {
      apiKey,
      model: env.AI_MODEL ?? 'gpt-4o-mini',
      protocol: (env.AI_PROTOCOL as 'openai' | 'anthropic') ?? 'openai',
      baseURL: env.AI_BASE_URL || undefined,
      temperature: Number(env.AI_TEMPERATURE ?? 0),
    },
  };
}

function autoSiteUrl(repoFullName: string): string {
  const [owner, repo] = repoFullName.split('/');
  return `https://${owner}.github.io/${repo}/`;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
