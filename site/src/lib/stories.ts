// Pure types + helpers. Safe to import from client components.
// Filesystem-based loaders live in stories-loader.ts (server-only).

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
  prTitle?: string;
  prUrl?: string;
  mergedAt?: string;
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

const SIZE_LABEL: Record<SizeAssessment, string> = {
  xs: 'XS',
  small: 'S',
  medium: 'M',
  large: 'L',
  xl: 'XL',
};

export function sizeLabel(s: SizeAssessment): string {
  return SIZE_LABEL[s];
}

export interface StoryDay {
  date: string;
  dateLabel: string;
  features: Story[];
  bugfixes: Story[];
  housekeeping: Story[];
}

const dayLabelFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function groupByDay(stories: Story[]): StoryDay[] {
  const byDate = new Map<string, Story[]>();
  for (const story of stories) {
    const date = story.committedAt.slice(0, 10);
    const arr = byDate.get(date) ?? [];
    arr.push(story);
    byDate.set(date, arr);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayStories]) => {
      const features: Story[] = [];
      const bugfixes: Story[] = [];
      const housekeeping: Story[] = [];
      for (const story of dayStories) {
        const cat = primaryCategory(story);
        if (cat?.key === 'feature') features.push(story);
        else if (cat?.key === 'bugfix') bugfixes.push(story);
        else housekeeping.push(story);
      }
      return {
        date,
        dateLabel: dayLabelFmt.format(new Date(date + 'T12:00:00Z')),
        features,
        bugfixes,
        housekeeping,
      };
    });
}
