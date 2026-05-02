// Changes-node schemas (review/synthesis/highlights omitted from v0).

import { z } from 'zod';
import { PR_CATEGORY_KEYS } from './categories.ts';

const CategoryKeySchema = z.enum(PR_CATEGORY_KEYS as [string, ...string[]]);

const CategoryEntrySchema = z.object({
  key: CategoryKeySchema,
  score: z.number().min(0).max(100),
  reason: z.string().min(1),
});

export type CategoryEntry = z.infer<typeof CategoryEntrySchema>;

export const CodeReferenceSchema = z.object({
  id: z.number(),
  term: z.string(),
  file: z.string(),
  description: z.string(),
  matchContext: z.string(),
});

export type CodeReference = z.infer<typeof CodeReferenceSchema>;

export const ChangesNodeOutputSchema = z.object({
  categories: z.array(CategoryEntrySchema).min(1),
  headline: z.string().max(100),
  standfirst: z.string().max(300),
  story: z.string().max(2000),
  digestSentence: z.string().max(300),
  codeReferences: z.array(CodeReferenceSchema),
  hasFactCheckIssues: z.boolean(),
  factCheckIssues: z.string().nullable(),
  technicalDescription: z.string().max(3000),
  imageDirection: z.string().max(300).nullable(),
});

export type ChangesNodeOutput = z.infer<typeof ChangesNodeOutputSchema>;

export const SizeAssessmentSchema = z.enum([
  'xs',
  'small',
  'medium',
  'large',
  'xl',
]);

export const SizeAssessmentOutputSchema = z.object({
  assessment: SizeAssessmentSchema,
  reasoning: z.string(),
});

export type SizeAssessment = z.infer<typeof SizeAssessmentSchema>;
export type SizeAssessmentOutput = z.infer<typeof SizeAssessmentOutputSchema>;

// Canonical shape of the JSON files written to site/public/data/stories/<id>.json.
// The site reads these at build time — a producer/consumer schema mismatch silently
// breaks the deploy, so we validate at write-time.
const StoryBaseSchema = z.object({
  id: z.string().min(1),
  sha: z.string().min(1),
  author: z.string().min(1),
  authorUrl: z.string().optional(),
  committedAt: z.string().min(1),
  categories: z.array(CategoryEntrySchema).min(1),
  headline: z.string().min(1),
  standfirst: z.string(),
  story: z.string(),
  digestSentence: z.string(),
  technicalDescription: z.string(),
  imageDirection: z.string().nullable(),
  hasFactCheckIssues: z.boolean(),
  factCheckIssues: z.string().nullable(),
  sizeAssessment: SizeAssessmentSchema,
  sizeReasoning: z.string(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  filesChanged: z.number().int().nonnegative(),
  commitUrl: z.string().optional(),
});

export const StorySchema = z.discriminatedUnion('kind', [
  StoryBaseSchema.extend({
    kind: z.literal('pr'),
    prNumber: z.number().int().positive(),
    prUrl: z.string(),
    mergedAt: z.string().optional(),
  }),
  StoryBaseSchema.extend({
    kind: z.literal('direct-push'),
  }),
]);

export type StorySchemaType = z.infer<typeof StorySchema>;
