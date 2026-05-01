// Lifted verbatim from gitsky/src/services/pr-analysis/categories.ts

export const PR_CATEGORIES = {
  feature: { key: 'feature', displayName: 'New Feature' },
  bugfix: { key: 'bugfix', displayName: 'Bug Fix' },
  refactor: { key: 'refactor', displayName: 'Refactoring' },
  maintenance: { key: 'maintenance', displayName: 'Maintenance' },
  docs: { key: 'docs', displayName: 'Documentation' },
  test: { key: 'test', displayName: 'Tests' },
  dependency: { key: 'dependency', displayName: 'Dependencies' },
  config: { key: 'config', displayName: 'Configuration' },
  performance: { key: 'performance', displayName: 'Performance' },
  security: { key: 'security', displayName: 'Security' },
  ci: { key: 'ci', displayName: 'CI/CD' },
  style: { key: 'style', displayName: 'Code Style' },
} as const;

export type PRCategoryKey = keyof typeof PR_CATEGORIES;

export const PR_CATEGORY_KEYS = Object.keys(PR_CATEGORIES) as PRCategoryKey[];

export function getCategoryDisplayName(key: PRCategoryKey): string {
  return PR_CATEGORIES[key].displayName;
}
