// Lifted from gitsky/src/services/pr-analysis/size-assessment.ts.
// Rule-based, no LLM. Thresholds are configurable via env / workflow input.

export type SizeAssessment = 'xs' | 'small' | 'medium' | 'large' | 'xl';

export interface SizeThresholds {
  xs: { maxLines: number; maxFiles: number };
  small: { maxLines: number; maxFiles: number };
  medium: { maxLines: number; maxFiles: number };
  large: { maxLines: number; maxFiles: number };
}

export const DEFAULT_SIZE_THRESHOLDS: SizeThresholds = {
  xs: { maxLines: 10, maxFiles: 1 },
  small: { maxLines: 100, maxFiles: 5 },
  medium: { maxLines: 500, maxFiles: 15 },
  large: { maxLines: 1000, maxFiles: 30 },
};

export interface SizeMetrics {
  additions: number;
  deletions: number;
  filesChanged: number;
}

export interface SizeAssessmentOutput {
  assessment: SizeAssessment;
  reasoning: string;
}

export function assessPRSize(
  metrics: SizeMetrics,
  thresholds: SizeThresholds = DEFAULT_SIZE_THRESHOLDS,
): SizeAssessmentOutput {
  const totalLines = metrics.additions + metrics.deletions;
  const { filesChanged } = metrics;

  let assessment: SizeAssessment;
  let reasoning: string;

  if (totalLines <= thresholds.xs.maxLines) {
    assessment = 'xs';
    reasoning = `Tiny change: ${totalLines} lines in ${filesChanged} file(s). Quick to review.`;
  } else if (totalLines <= thresholds.small.maxLines) {
    assessment = 'small';
    reasoning = `Small change: ${totalLines} lines across ${filesChanged} file(s). Manageable scope.`;
  } else if (totalLines <= thresholds.medium.maxLines) {
    assessment = 'medium';
    reasoning = `Medium change: ${totalLines} lines across ${filesChanged} file(s). Moderate complexity.`;
  } else if (totalLines <= thresholds.large.maxLines) {
    assessment = 'large';
    reasoning = `Large change: ${totalLines} lines across ${filesChanged} file(s). May benefit from splitting.`;
  } else {
    assessment = 'xl';
    reasoning = `Extra large change: ${totalLines} lines across ${filesChanged} file(s). Consider breaking into smaller PRs.`;
  }

  if (assessment === 'xl' || assessment === 'large') {
    if (filesChanged > 50) reasoning += ' High file count may indicate scope creep.';
    if (totalLines > 2000) reasoning += ' Line count significantly exceeds review best practices.';
  }

  return { assessment, reasoning };
}

export function parseThresholds(json: string | undefined): SizeThresholds {
  if (!json || !json.trim()) return DEFAULT_SIZE_THRESHOLDS;
  try {
    const parsed = JSON.parse(json) as Partial<SizeThresholds>;
    return {
      xs: { ...DEFAULT_SIZE_THRESHOLDS.xs, ...(parsed.xs ?? {}) },
      small: { ...DEFAULT_SIZE_THRESHOLDS.small, ...(parsed.small ?? {}) },
      medium: { ...DEFAULT_SIZE_THRESHOLDS.medium, ...(parsed.medium ?? {}) },
      large: { ...DEFAULT_SIZE_THRESHOLDS.large, ...(parsed.large ?? {}) },
    };
  } catch (err) {
    console.warn(
      `[gitpulse] failed to parse size-thresholds JSON, falling back to defaults: ${err instanceof Error ? err.message : err}`,
    );
    return DEFAULT_SIZE_THRESHOLDS;
  }
}

export const SIZE_DISPLAY: Record<SizeAssessment, string> = {
  xs: 'Extra Small',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xl: 'Extra Large',
};
