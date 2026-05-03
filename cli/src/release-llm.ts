// Release-edition LLM. Generates the deadpan quip + 2-3 paragraph release
// story. System prompt and Zod schema are lifted verbatim from
// gitsky/apps/web/lib/release-edition-generator.ts — well-tuned editorial
// tone we don't want to re-discover.

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ReleaseEditionOutputSchema } from './schemas.ts';
import type { ReleaseEditionOutput } from './schemas.ts';
import { stripJsonSchemaConstraints } from './strip-schema.ts';
import { z } from 'zod';
import type { LLMConfig } from './llm.ts';

const SYSTEM_PROMPT = `You are the editor-in-chief of a dry, deadpan engineering newspaper.

QUIP RULES:
- Max 120 characters
- No exclamation marks
- No congratulatory tone
- Deadpan > clever > funny
- Reference what actually changed, not generic platitudes

GOOD quips:
- "We broke the auth layer on purpose this time."
- "The database now has trust issues, and we love it."
- "We parallelized everything except the coffee machine."

BAD quips:
- "Great work team!" (congratulatory)
- "Another amazing release!" (generic)
- "Let's ship it!!!" (exclamation marks)

STORY RULES:
- 2-3 paragraphs, flowing newspaper editorial prose
- 400-800 characters total
- Focus on VALUE and FEATURES, not implementation details
- Describe what users/developers can NOW DO, not how the code was restructured
- Avoid technical jargon like "factory function", "transport layer", "SDK unified"
- Instead of "the SDK has been unified under a new factory function", write "setting up analytics now takes one line instead of five"
- Instead of "a centralized ContextManager ensures metadata consistency", write "device context is now tracked automatically across all apps"
- Every sentence should answer "so what?" from a user's perspective
- No bullet points or lists
- Passive voice is acceptable but prefer active when describing user-facing changes
- CRITICAL: Each paragraph MUST be a separate line, separated by \\n. Do NOT write one continuous block.
- Each paragraph should focus on a distinct theme or capability from the release`;

export interface ReleaseEditionContext {
  repoName: string;
  repoDescription: string | null;
  releaseTag: string;
  releaseName: string | null;
  releaseNotes: string | null;
  topStories: Array<{
    headline: string;
    standfirst: string;
    digestSentence: string;
    primaryCategoryKey: string;
  }>;
  prCount: number;
  contributorCount: number;
  totalAdditions: number;
  totalDeletions: number;
  contributorLogins: string[];
}

function assembleUserPrompt(ctx: ReleaseEditionContext): string {
  const parts: string[] = [];
  parts.push(`Repository: ${ctx.repoName}`);
  if (ctx.repoDescription) parts.push(`Description: ${ctx.repoDescription}`);
  parts.push(`Release: ${ctx.releaseTag}`);
  if (ctx.releaseName) parts.push(`Name: ${ctx.releaseName}`);
  parts.push(
    `Stats: ${ctx.prCount} PRs, ${ctx.contributorCount} contributors, +${ctx.totalAdditions}/-${ctx.totalDeletions} lines`,
  );
  if (ctx.contributorLogins.length > 0) {
    parts.push(`Contributors: ${ctx.contributorLogins.join(', ')}`);
  }

  if (ctx.topStories.length > 0) {
    parts.push('\nTop Stories:');
    for (const s of ctx.topStories) {
      const line = [
        s.headline && `Headline: ${s.headline}`,
        s.standfirst && `Summary: ${s.standfirst}`,
        s.digestSentence && `Digest: ${s.digestSentence}`,
        s.primaryCategoryKey && `Category: ${s.primaryCategoryKey}`,
      ]
        .filter(Boolean)
        .join(' | ');
      parts.push(`- ${line}`);
    }
  }

  if (ctx.releaseNotes) {
    const truncated = ctx.releaseNotes.slice(0, 2000);
    parts.push(`\nRelease Notes:\n${truncated}`);
  }

  return parts.join('\n');
}

export function createReleaseEditor(config: LLMConfig) {
  const isMiniMax = config.model.toLowerCase().startsWith('minimax');

  const client =
    config.protocol === 'anthropic'
      ? new ChatAnthropic({
          model: config.model,
          apiKey: config.apiKey,
          temperature: config.temperature ?? 0,
          maxTokens: 2048,
          ...(config.baseURL ? { anthropicApiUrl: config.baseURL } : {}),
        })
      : new ChatOpenAI({
          model: config.model,
          apiKey: config.apiKey,
          temperature: config.temperature ?? 0,
          ...(config.baseURL
            ? { configuration: { baseURL: config.baseURL } }
            : {}),
        });

  const effectiveSchema = isMiniMax
    ? stripJsonSchemaConstraints(
        z.toJSONSchema(ReleaseEditionOutputSchema) as Record<string, unknown>,
      )
    : ReleaseEditionOutputSchema;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structured = (client as any).withStructuredOutput(effectiveSchema, {
    name: 'gitpulse_release_edition',
    includeRaw: true,
    ...(isMiniMax && { method: 'functionCalling' }),
  });

  return async function generateEdition(
    ctx: ReleaseEditionContext,
  ): Promise<ReleaseEditionOutput> {
    const userPrompt = assembleUserPrompt(ctx);
    const response = await structured.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);
    if (response.parsed === null || response.parsed === undefined) {
      throw new Error(
        `LLM returned null for release edition. Raw: ${
          typeof response.raw?.content === 'string'
            ? response.raw.content.slice(0, 500)
            : JSON.stringify(response.raw?.content ?? '').slice(0, 500)
        }`,
      );
    }
    const parsed = response.parsed as ReleaseEditionOutput;
    return {
      quip: parsed.quip.replace(/\\n/g, '\n').trim(),
      releaseStory: parsed.releaseStory.replace(/\\n/g, '\n').trim(),
    };
  };
}

export function getFallbackEdition(): ReleaseEditionOutput {
  return { quip: 'Another one shipped.', releaseStory: '' };
}
