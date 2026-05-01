export interface RuntimeConfig {
  repoDir: string;
  repoFullName: string;
  outDir: string;
  branch?: string;
  bootstrapDays: number;
  limit?: number;
  ai: {
    apiKey: string;
    model: string;
    baseURL?: string;
    temperature: number;
  };
}

export function loadConfig(env = process.env): RuntimeConfig {
  const repoFullName = required(env, 'GITHUB_REPOSITORY');
  const apiKey = required(env, 'OPENAI_API_KEY');
  // Resolve repoDir: explicit env, then GITHUB_WORKSPACE (set in Actions),
  // then cwd. Yarn workspace scripts run with cwd set to the workspace
  // dir, so we can't trust cwd in CI.
  const repoDir = env.GITPULSE_REPO_DIR ?? env.GITHUB_WORKSPACE ?? process.cwd();

  return {
    repoDir,
    repoFullName,
    outDir: env.GITPULSE_OUT_DIR ?? `${repoDir}/site/src/content/stories`,
    branch: env.GITPULSE_BRANCH || undefined,
    bootstrapDays: Number(env.GITPULSE_BOOTSTRAP_DAYS ?? 30),
    limit: env.GITPULSE_LIMIT ? Number(env.GITPULSE_LIMIT) : undefined,
    ai: {
      apiKey,
      model: env.AI_MODEL ?? 'gpt-4o-mini',
      baseURL: env.AI_BASE_URL || undefined,
      temperature: Number(env.AI_TEMPERATURE ?? 0.7),
    },
  };
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
