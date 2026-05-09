import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const ThemeSchema = z.strictObject({
  accentColor: z
    .string()
    .regex(HEX_COLOR, 'must be a hex color like #b8860b or #abc')
    .optional(),
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
