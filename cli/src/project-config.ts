import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const ThemeSchema = z.strictObject({
  accentColor: z
    .string()
    .regex(HEX_COLOR, 'must be a hex color like #b8860b or #abc')
    .optional(),
  linkColor: z
    .string()
    .regex(HEX_COLOR, 'must be a hex color like #326891 or #abc')
    .optional(),
});

// Pluggable image-storage backends. Only 'vercel-blob' is wired up today
// (PR 1); r2/s3/supabase shapes are reserved so .gitpulse.json schemas can
// stage migrations without breaking parsers when those providers land.
const StorageProviderSchema = z.discriminatedUnion('provider', [
  z.strictObject({
    provider: z.literal('vercel-blob'),
    // Optional. When set, asserted against the storeId encoded in
    // BLOB_READ_WRITE_TOKEN at startup; mismatches throw with a clear
    // message. The actual upload destination is always the token's
    // store, so leaving this out is fine — and recommended.
    storeId: z.string().min(1).optional(),
  }),
  z.strictObject({
    provider: z.literal('r2'),
    accountId: z.string().min(1),
    bucket: z.string().min(1),
    publicBaseUrl: z.url(),
  }),
  z.strictObject({
    provider: z.literal('s3'),
    region: z.string().min(1),
    bucket: z.string().min(1),
    publicBaseUrl: z.url().optional(),
  }),
  z.strictObject({
    provider: z.literal('supabase'),
    projectUrl: z.url(),
    bucket: z.string().min(1),
  }),
]);

// Pluggable image AI providers. Only 'gemini' is wired up in PR 2/3;
// other providers can land later as additional discriminator branches
// without breaking existing .gitpulse.json files.
const ImageAISchema = z.discriminatedUnion('provider', [
  z.strictObject({
    provider: z.literal('gemini'),
    model: z.string().min(1),
  }),
]);

const ImagesSchema = z.strictObject({
  storage: StorageProviderSchema.optional(),
  ai: ImageAISchema.optional(),
});

// Curation labels. Keyed by action so new actions (group, regenerate)
// can land later without breaking existing config files. Unknown keys
// are rejected by strictObject so typos surface loudly.
const LabelsSchema = z.strictObject({
  ignore: z.string().min(1).optional(),
});

// Text/LLM provider for the story summarizer and release editor.
// Discriminated on provider so a new one (e.g. 'google', 'groq') lands as
// an additional branch without breaking existing .gitpulse.json files.
//
// API keys are NEVER read from here — they stay in env (OPENAI_API_KEY /
// ANTHROPIC_API_KEY), the same split as image providers. The wire protocol
// is derived from the provider: 'anthropic' uses the Anthropic SDK +
// ANTHROPIC_API_KEY; everything else uses the OpenAI SDK + OPENAI_API_KEY.
const TextAISchema = z.discriminatedUnion('provider', [
  z.strictObject({
    provider: z.literal('openai'),
    model: z.string().min(1),
    temperature: z.number().min(0).max(2).optional(),
  }),
  z.strictObject({
    provider: z.literal('anthropic'),
    model: z.string().min(1),
    temperature: z.number().min(0).max(2).optional(),
  }),
  // OpenAI-wire-compatible third parties (MiniMax, OpenRouter, DeepSeek,
  // Together…). baseURL is REQUIRED — that's what distinguishes this from
  // first-party 'openai'. Routed through the OpenAI SDK + OPENAI_API_KEY.
  z.strictObject({
    provider: z.literal('openai-compatible'),
    model: z.string().min(1),
    baseURL: z.url(),
    temperature: z.number().min(0).max(2).optional(),
  }),
]);

// Analysis scope and pacing. All optional; sensible defaults applied in
// config.ts. These are preferences (not deploy-environment-specific), so
// the file is canonical — there is no env override for them.
const AnalysisSchema = z.strictObject({
  branch: z.string().min(1).optional(),
  bootstrapDays: z.number().int().positive().optional(),
  concurrency: z.number().int().min(1).optional(),
  limit: z.number().int().positive().optional(),
  releasesCap: z.number().int().min(0).optional(),
  includePrereleases: z.boolean().optional(),
});

// Deployed-site coordinates. These ARE deploy-environment-specific, so the
// precedence in config.ts/build.ts is env override → this file → auto-detect
// → default. Hardcoding `url` is usually wrong (it breaks preview deploys);
// leave it unset and let the platform auto-detect unless you have a custom
// domain.
const SiteSchema = z.strictObject({
  url: z.url().optional(),
  basePath: z.string().optional(),
  repo: z.string().min(1).optional(),
  ref: z.string().min(1).optional(),
});

// On-disk locations. Also deploy-environment-specific (CI points these at
// the deploy tree), so env override wins over the file. Relative paths are
// resolved against the repo root.
const PathsSchema = z.strictObject({
  dataDir: z.string().min(1).optional(),
  storiesDir: z.string().min(1).optional(),
  releasesDir: z.string().min(1).optional(),
  outDir: z.string().min(1).optional(),
});

export const ProjectConfigSchema = z.strictObject({
  publicationTitle: z.string().trim().min(1).optional(),
  publicationSubtitle: z.string().trim().min(1).optional(),
  daysPerPage: z.number().int().positive().optional(),
  releasesPerPage: z.number().int().positive().optional(),
  theme: ThemeSchema.optional(),
  analysis: AnalysisSchema.optional(),
  text: TextAISchema.optional(),
  images: ImagesSchema.optional(),
  labels: LabelsSchema.optional(),
  site: SiteSchema.optional(),
  paths: PathsSchema.optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export function loadProjectConfig(repoDir: string): ProjectConfig {
  const configPath = join(repoDir, '.gitpulse.json');
  if (!existsSync(configPath)) return {};

  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (err) {
    throw new Error(
      `[gitpulse] Failed to read ${configPath}: ${err instanceof Error ? err.message : err}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[gitpulse] ${configPath} is not valid JSON`);
  }

  const result = ProjectConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `[gitpulse] ${configPath} is invalid: ${result.error.issues.map((i) => `${i.path.length > 0 ? i.path.join('.') : '<root>'}: ${i.message}`).join(', ')}`,
    );
  }

  return result.data;
}
