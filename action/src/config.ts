import { parseThresholds, type SizeThresholds } from './size.ts';

export interface RuntimeConfig {
  repoDir: string;
  repoFullName: string;
  outDir: string;
  branch?: string;
  bootstrapDays: number;
  limit?: number;
  githubToken?: string;
  sizeThresholds: SizeThresholds;
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

  return {
    repoDir,
    repoFullName,
    outDir: env.GITPULSE_OUT_DIR ?? `${repoDir}/site/src/content/stories`,
    branch: env.GITPULSE_BRANCH || undefined,
    bootstrapDays: Number(env.GITPULSE_BOOTSTRAP_DAYS ?? 30),
    limit: env.GITPULSE_LIMIT ? Number(env.GITPULSE_LIMIT) : undefined,
    githubToken: env.GITHUB_TOKEN || undefined,
    sizeThresholds: parseThresholds(env.GITPULSE_SIZE_THRESHOLDS),
    ai: {
      apiKey,
      model: env.AI_MODEL ?? 'gpt-4o-mini',
      protocol: (env.AI_PROTOCOL as 'openai' | 'anthropic') ?? 'openai',
      baseURL: env.AI_BASE_URL || undefined,
      temperature: Number(env.AI_TEMPERATURE ?? 0),
    },
  };
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
