// Curation labels users can apply to PRs. Each action key maps to a
// GitHub label name. Defaults below are used when `.gitpulse.json` does
// not override them. Adding a new action is a one-line addition here +
// matching field in ProjectConfigSchema's LabelsSchema.

export const DEFAULT_LABELS = {
  ignore: 'gitpulse:ignore',
} as const;

export type LabelKey = keyof typeof DEFAULT_LABELS;
