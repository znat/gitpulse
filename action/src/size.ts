// Lifted verbatim from gitsky/src/services/pr-analysis/size-assessment.ts.
// Rule-based, no LLM. Thresholds match gitsky's defaults; configurability
// (with custom formulas) is a future phase.

import type { SizeAssessment, SizeAssessmentOutput } from './schemas.ts';

interface PRSizeMetrics {
  additions: number;
  deletions: number;
  filesChanged: number;
  weightedLines?: number | null;
}

const SIZE_THRESHOLDS = {
  xs: { maxLines: 10, maxFiles: 1 },
  small: { maxLines: 100, maxFiles: 5 },
  medium: { maxLines: 500, maxFiles: 15 },
  large: { maxLines: 1000, maxFiles: 30 },
};

export function assessPRSize(metrics: PRSizeMetrics): SizeAssessmentOutput {
  const totalLines = metrics.weightedLines ?? metrics.additions + metrics.deletions;
  const { filesChanged } = metrics;
  const usingWeighted =
    metrics.weightedLines !== null && metrics.weightedLines !== undefined;
  const lineType = usingWeighted ? 'weighted lines' : 'lines';

  let assessment: SizeAssessment;
  let reasoning: string;

  if (totalLines <= SIZE_THRESHOLDS.xs.maxLines) {
    assessment = 'xs';
    reasoning = `Tiny change: ${totalLines} ${lineType} in ${filesChanged} file(s). Quick to review.`;
  } else if (totalLines <= SIZE_THRESHOLDS.small.maxLines) {
    assessment = 'small';
    reasoning = `Small change: ${totalLines} ${lineType} across ${filesChanged} file(s). Manageable scope.`;
  } else if (totalLines <= SIZE_THRESHOLDS.medium.maxLines) {
    assessment = 'medium';
    reasoning = `Medium change: ${totalLines} ${lineType} across ${filesChanged} file(s). Moderate complexity.`;
  } else if (totalLines <= SIZE_THRESHOLDS.large.maxLines) {
    assessment = 'large';
    reasoning = `Large change: ${totalLines} ${lineType} across ${filesChanged} file(s). May benefit from splitting.`;
  } else {
    assessment = 'xl';
    reasoning = `Extra large change: ${totalLines} ${lineType} across ${filesChanged} file(s). Consider breaking into smaller PRs.`;
  }

  if (assessment === 'xl' || assessment === 'large') {
    if (filesChanged > 50) reasoning += ' High file count may indicate scope creep.';
    if (totalLines > 2000) reasoning += ' Line count significantly exceeds review best practices.';
  }

  return { assessment, reasoning };
}

export const SIZE_DISPLAY: Record<SizeAssessment, string> = {
  xs: 'Extra Small',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xl: 'Extra Large',
};
