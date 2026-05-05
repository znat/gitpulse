import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const ProjectConfigSchema = z.strictObject({
  publicationTitle: z.string().trim().min(1).optional(),
  publicationSubtitle: z.string().trim().min(1).optional(),
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
      `[gitpulse] ${configPath} is invalid: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
    );
  }

  return result.data;
}
