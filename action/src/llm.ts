import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import type { CommitRecord, AISummary } from './types.ts';

export const StorySchema = z.object({
  headline: z.string().min(8).max(120),
  standfirst: z.string().min(20).max(280),
  body: z.string().min(80).max(1200),
});

const SCHEMA_DESCRIPTION = `You must respond with a JSON object that matches exactly this shape:

{
  "headline": "string — editorial-tone headline, max ~12 words, no trailing period, no emoji",
  "standfirst": "string — 1-2 short sentences, concrete and specific, never generic",
  "body": "string — 2-3 short paragraphs of plain prose, describing what changed and why it might matter, no bullet points or code blocks"
}

Output the JSON object and nothing else. No prose before or after. No markdown code fences.`;

const VOICE = `You write short editorial stories about software changes for a development log called gitpulse.

Voice: precise, dry, slightly literary. Like a beat reporter writing about a small newsroom. Never marketing-speak. Never breathless. No emoji. No exclamations. No second person.

You are given the metadata for a single commit on the default branch — its message, author, date, and a summary of files changed. Produce three fields: a short headline, a one-or-two-sentence standfirst, and a 2-3 paragraph body.

If the commit is trivial (typo fix, dependency bump, formatting), say so plainly. Don't dramatize small things. Don't speculate beyond what the commit message and stats reveal.`;

const SYSTEM_PROMPT = `${VOICE}\n\n${SCHEMA_DESCRIPTION}`;

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

  return async function summarize(commit: CommitRecord): Promise<AISummary> {
    const response = await llm.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: renderUserPrompt(commit) },
    ]);
    const raw = typeof response.content === 'string'
      ? response.content
      : extractText(response.content);
    const json = extractJson(raw);
    const parsed = JSON.parse(json);
    return StorySchema.parse(parsed);
  };
}

function extractText(content: unknown): string {
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return String((part as { text: unknown }).text ?? '');
        return '';
      })
      .join('');
  }
  return String(content ?? '');
}

// Strip <think>...</think> reasoning blocks (MiniMax M2.x, DeepSeek-R1, etc.)
// and markdown code fences, then return the inner JSON.
function extractJson(text: string): string {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fence = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fence?.[1]) cleaned = fence[1].trim();
  // If there's still leading/trailing prose, narrow to the outermost {...}
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) cleaned = cleaned.slice(first, last + 1);
  return cleaned;
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
