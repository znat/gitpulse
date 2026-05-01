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
