import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import type { CommitRecord, AISummary } from './types.ts';

export const StorySchema = z.object({
  headline: z
    .string()
    .min(8)
    .max(120)
    .describe('Editorial-tone headline. Max ~12 words. No trailing period. No emoji.'),
  standfirst: z
    .string()
    .min(20)
    .max(280)
    .describe(
      'A subheading that hooks the reader in 1-2 short sentences. Concrete, specific, never generic.',
    ),
  body: z
    .string()
    .min(80)
    .max(1200)
    .describe(
      'Two or three short paragraphs. Plain prose. Describe what changed and why it might matter. Avoid bullet points and code blocks.',
    ),
});

const SYSTEM_PROMPT = `You write short editorial stories about software changes for a development log called gitpulse.

Voice: precise, dry, slightly literary. Like a beat reporter writing about a small newsroom. Never marketing-speak. Never breathless. No emoji. No exclamations. No second person.

You are given the metadata for a single commit on the default branch — its message, author, date, and a summary of files changed. Produce three fields: a short headline, a one-or-two-sentence standfirst, and a 2-3 paragraph body.

If the commit is trivial (typo fix, dependency bump, formatting), say so plainly. Don't dramatize small things. Don't speculate beyond what the commit message and stats reveal.`;

export interface LLMConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  temperature?: number;
}

export function createSummarizer(config: LLMConfig) {
  const llm = new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    temperature: config.temperature ?? 0.7,
    configuration: config.baseURL ? { baseURL: config.baseURL } : undefined,
  });

  const structured = llm.withStructuredOutput(StorySchema, { name: 'gitpulse_story' });

  return async function summarize(commit: CommitRecord): Promise<AISummary> {
    const result = await structured.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: renderUserPrompt(commit) },
    ]);
    return result;
  };
}

function renderUserPrompt(c: CommitRecord): string {
  return [
    `Repository commit on the default branch.`,
    ``,
    `Author: ${c.authorName} <${c.authorEmail}>`,
    `Date: ${c.committedAt}`,
    `SHA: ${c.shortSha}`,
    `Files changed: ${c.filesChanged} (+${c.insertions} / -${c.deletions})`,
    ``,
    `Commit subject:`,
    c.subject,
    ``,
    c.body ? `Commit body:\n${c.body}` : `(no commit body)`,
  ].join('\n');
}
