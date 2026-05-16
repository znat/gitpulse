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
    storeId: z.string().min(1),
  }),
  z.strictObject({
    provider: z.literal('r2'),
    accountId: z.string().min(1),
    bucket: z.string().min(1),
    publicBaseUrl: z.string().url(),
  }),
  z.strictObject({
    provider: z.literal('s3'),
    region: z.string().min(1),
    bucket: z.string().min(1),
    publicBaseUrl: z.string().url().optional(),
  }),
  z.strictObject({
    provider: z.literal('supabase'),
    projectUrl: z.string().url(),
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

const ProjectConfigSchema = z.strictObject({
  publicationTitle: z.string().trim().min(1).optional(),
  publicationSubtitle: z.string().trim().min(1).optional(),
  bootstrapDays: z.number().int().positive().optional(),
  concurrency: z.number().int().min(1).optional(),
  releasesCap: z.number().int().min(0).optional(),
  includePrereleases: z.boolean().optional(),
  daysPerPage: z.number().int().positive().optional(),
  releasesPerPage: z.number().int().positive().optional(),
  theme: ThemeSchema.optional(),
  images: ImagesSchema.optional(),
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
