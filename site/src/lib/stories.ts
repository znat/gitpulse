import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type StoryKind = 'pr' | 'direct-push';

export type CategoryKey =
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'maintenance'
  | 'docs'
  | 'test'
  | 'dependency'
  | 'config'
  | 'performance'
  | 'security'
  | 'ci'
  | 'style';

export interface CategoryEntry {
  key: CategoryKey;
  score: number;
  reason: string;
}

export type SizeAssessment = 'xs' | 'small' | 'medium' | 'large' | 'xl';

export interface Story {
  id: string;
  kind: StoryKind;
  sha: string;
  author: string;
  authorUrl?: string;
  committedAt: string;
  categories: CategoryEntry[];
  headline: string;
  standfirst: string;
  story: string;
  digestSentence: string;
  technicalDescription: string;
  imageDirection: string | null;
  hasFactCheckIssues: boolean;
  factCheckIssues: string | null;
  sizeAssessment: SizeAssessment;
  sizeReasoning: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  commitUrl?: string;
  prNumber?: number;
  prUrl?: string;
  mergedAt?: string;
}

const SIZE_DISPLAY: Record<SizeAssessment, string> = {
  xs: 'XS',
  small: 'S',
  medium: 'M',
  large: 'L',
  xl: 'XL',
};

export function sizeLabel(s: SizeAssessment): string {
  return SIZE_DISPLAY[s];
}

const CATEGORY_DISPLAY: Record<CategoryKey, string> = {
  feature: 'New Feature',
  bugfix: 'Bug Fix',
  refactor: 'Refactoring',
  maintenance: 'Maintenance',
  docs: 'Documentation',
  test: 'Tests',
  dependency: 'Dependencies',
  config: 'Configuration',
  performance: 'Performance',
  security: 'Security',
  ci: 'CI/CD',
  style: 'Code Style',
};

export function categoryDisplayName(key: CategoryKey): string {
  return CATEGORY_DISPLAY[key] ?? key;
}

export function primaryCategory(story: Story): CategoryEntry | null {
  const sorted = [...story.categories].sort((a, b) => b.score - a.score);
  return sorted[0] ?? null;
}

const CONTENT_DIR = join(process.cwd(), 'src/content/stories');

export function loadStories(): Story[] {
  let files: string[] = [];
  try {
    files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  return files
    .map((f) => JSON.parse(readFileSync(join(CONTENT_DIR, f), 'utf8')) as Story)
    .sort((a, b) => b.committedAt.localeCompare(a.committedAt));
}

export function loadStory(id: string): Story | null {
  return loadStories().find((s) => s.id === id) ?? null;
}
