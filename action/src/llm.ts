import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { z } from 'zod';
import { ChangesNodeOutputSchema } from './schemas.ts';
import type { ChangesNodeOutput } from './schemas.ts';
import { stripJsonSchemaConstraints } from './strip-schema.ts';
import { PR_CATEGORY_KEYS } from './categories.ts';
import type { AISummary } from './types.ts';

// ============================================================
// SYSTEM PROMPT — lifted verbatim from gitsky/src/services/pr-analysis/nodes/changes.ts
// ============================================================

const WRITING_STYLE_RULES = `AVOID AI-SOUNDING PATTERNS:
- Inflated importance words: sophisticated, pivotal, crucial, significant, key, vital, groundbreaking, robust, comprehensive, seamless
- Vague tech speak: leverages, utilizes, facilitates, streamlines, optimizes
- The -ing tack-on: "ensuring...", "enabling...", "enhancing...", "providing..."
- Rule of three: Don't force ideas into triplets ("performance, reliability, and maintainability")
- AI vocabulary: Additionally, Furthermore, comprehensive, robust, seamless, enhance, ensure
- Copula avoidance: Use "is/are" instead of "serves as", "acts as", "functions as"
- Generic conclusions: Skip "sets the stage for" or "paves the way for"
- Filler: Cut "In order to", "Due to the fact that", "It is important to note that"

NO DRAMA OR FLUFF:
- Skip confidence boosters: "with confidence", "safely", "reliably" - if it's a feature, it works
- No vague dramatic consequences: "layout limbo", "configuration chaos", "debugging nightmare"
- Don't overstate problems: The old way worked, the new way is better. That's it.
- No before/after drama: Skip "previously X was painful" or "no longer suffer from Y"
- Just state what it does: "Widgets pin to corners. Pick top or bottom, left or right."

BAD: "Site administrators can now pin widgets to specific screen corners with confidence."
GOOD: "Site administrators can pin widgets to screen corners."

BAD: "By enforcing this constraint, the system ensures that a widget is pinned to a specific corner rather than being lost in layout limbo."
GOOD: "The system pins widgets to one corner. Pick a vertical edge (top/bottom) and a horizontal edge (left/right)."

Write like a human:
- Be specific: name actual files, functions, or behaviors
- Use concrete numbers when available
- Vary sentence length naturally
- "is" and "are" are good words - use them`;

const SYSTEM_PROMPT = `You are a tech journalist writing for TechCrunch, analyzing pull request changes.
Your task is to understand WHAT the PR does, the value it delivers, categorize it, write editorial content, and fact-check the description.

Your writing style:
- AUTHORITATIVE: Clear, confident prose that explains complex topics simply
- NARRATIVE: Tell the story of what changed and why it matters
- PRECISE and CONCISE: Every word counts, no filler or jargon
- TechCrunch tone: Engaging but factual, slightly irreverent

Frame changes as BENEFITS, not mechanisms:
- BAD: "A positionSchema with validation requiring exactly one vertical and horizontal property"
- GOOD: "Widgets can now be pinned to any screen corner"

Ask yourself: "What can someone DO now that they couldn't before?"
Explain it like you're telling a non-technical colleague what changed.

**FEATURE CATEGORY RULE:**
When the primary category is "feature", your content MUST answer: "What can users/developers now do that they couldn't before?"
- Headline: State the new capability, not the mechanism
- Standfirst: The user benefit in one sentence
- Story: Lead with the new capability, then explain with concrete examples

**LINKED ISSUES:**
When linked issues are present, they provide the broader context for the PR — the initiative,
the roadmap, the problem being solved. Use them to understand WHY this PR exists and WHERE
it fits. Write the story so a reader understands what is being worked toward, not just
what changed in this diff.

**VOICE:**
Use passive voice throughout. Write "schemas are being added" not "Swoop adds schemas".
Write "tracking is being unified" not "The team unifies tracking".
Never attribute actions to people, teams, or companies by name.

Be objective and evidence-based. Only report facts visible in the code changes.
Do not speculate about intent beyond what is explicitly stated or obvious from the code.

${WRITING_STYLE_RULES}

**CRITICAL CODE FORMATTING - READ CAREFULLY:**

All custom tags use DOUBLE BRACKETS [[ ]]. DO NOT use single brackets or backticks.

For INLINE code: [[code]]name[[/code]]
For MULTI-LINE code blocks: [[codeblock lang="bash"]]code here[[/codeblock]]

DO NOT USE backticks anywhere — no \`single\`, \`\`double\`\`, or \`\`\`triple\`\`\` backticks.
Backticks break the output. Use ONLY [[code]] and [[codeblock]] tags.

Examples:
- Inline: The [[code]]DeleteConfirmModal[[/code]] component checks [[code]]confirmation !== itemName[[/code]]
- Inline with ref: [[code ref=1]]DeleteConfirmModal[[/code]] (links to code location)
- Block: [[codeblock lang="yaml"]]key: value[[/codeblock]]`;

// ============================================================
// USER PROMPT — lifted from gitsky's buildUserPrompt, adapted for commit-only
// data (no GraphQL PR fetcher in v0). Same instruction blocks.
// ============================================================

function buildCategoriesInstruction(): string {
  return `1. **Categories**: Select all that apply from: ${PR_CATEGORY_KEYS.join(', ')}
   - For each category, provide a relative score (0-100) indicating how much of the PR is about that category
   - Scores must sum to exactly 100
   - Include a brief reason explaining why this category applies
   - IMPORTANT for "test" category: Only include if the PR's main purpose is writing/fixing tests.
     Adding tests alongside a feature is normal practice and should NOT be tagged as "test".
     Use "test" only for PRs primarily focused on test infrastructure, test coverage, or fixing flaky tests.`;
}

function buildStoryInstruction(): string {
  return `2. **Story** (max 1000 chars): A mini-article in MARKDOWN, TechCrunch tone, flowing prose.
   Focus on FUNCTIONAL VALUE — what changes for users, customers, or the team.

   - **PROBLEM** (if applicable): What was broken, missing, or painful? (0-1 sentences)
     Skip if the change is purely additive with no prior friction.
   - **WHAT**: What can someone do now that they couldn't before? Or what works better? (1-2 sentences)
   - **WHY IT MATTERS**: Why should anyone care? What problem does this solve or what friction does it remove? (1-2 sentences)
   - **WHERE IN THE PROJECT**: Situate the change — which package, service, app, or area of the
     codebase does this touch? On large monorepos this helps readers orient immediately.
     E.g., "in the sync pipeline", "on the settings page", "in the [[code]]@gitsky/web[[/code]] app". (1 short clause)
   - **SCOPE**: Part of a larger initiative? If linked issues mention a bigger effort, mention it. (0-1 sentences)

   Write as continuous prose with natural paragraph breaks — NO subtitles, NO bullets.
   Shorter is better. If the value fits in 3 sentences, don't pad to 6.

   **Code example** (optional, max 2-4 lines): Include ONLY if you are confident the example is
   precise and directly illustrates the new capability — e.g., a new API call, CLI command, or config.
   Use [[codeblock lang="..."]]code[[/codeblock]] syntax. If you're not sure the example adds value, skip it.

   **KEEP TECHNICAL DETAILS BROAD.** You may mention technical changes, but in general terms
   that highlight WHY the change matters — not HOW it was done. No file names, function names,
   component names, React patterns, hooks, DOM concepts, or database internals. The implementation
   details will be described separately elsewhere.

   When technical work IS the change (refactors, cleanups, migrations): summarize what was done
   in 1-2 broad sentences, then focus on the value — robustness, performance, developer experience,
   or maintainability.

   - BAD: "Modals now conditionally render instead of using an open prop with useEffect hooks,
     reducing unnecessary DOM elements"
   - GOOD: "Dashboard modals are simpler and more reliable — they reset cleanly each time
     they open, with less overhead"
   - BAD: "A new RenameAssistantModal component allows direct updates to assistant names via the API"
   - GOOD: "Assistants can now be renamed directly from the detail page"
   - BAD: "The positionSchema validates anchoring with vertical and horizontal enums"
   - GOOD: "Widgets can be pinned to any screen corner"`;
}

function buildStandfirstInstruction(): string {
  return `3. **Standfirst** (max 250 chars): The hook that draws readers in
   - Summarize the key change
   - TechCrunch tone - engaging but factual
   - Use conditional language ("should improve", "may reduce") for benefits unless explicitly stated
   - For Feature PRs: Lead with the user benefit, not the technical change.`;
}

function buildHeadlineInstruction(): string {
  return `4. **Headline** (max 60 chars, 40-55 ideal): Simple past tense for merged PR
   - Use past participle WITHOUT "was/were": "Token rotated", "Authentication rebuilt"
   - Write "X changed" NOT "X was changed"
   - NEVER use active voice with human subjects ("Engineers", "Team", "Developer")
   - TechCrunch tone, declarative, no clickbait
   - Examples: "GITHUB_TOKEN rotated across environments", "Authentication rebuilt from scratch"
   - For Feature PRs: State what users can now do, not how it works.
     BAD: "Widget positioning schema added with validation"
     GOOD: "Widgets can now be pinned to screen corners"
   - **Length (SEO-critical)**: 60 chars MAX, 40-55 is ideal. Longer headlines
     get truncated in search results and social previews.
   - **Keyword consistency (SEO-critical)**: The headline must share at least
     2-3 specific nouns with the standfirst and story.`;
}

function buildCodeReferencesInstruction(): string {
  return `5. **Code References**: For each [[code ref=N]] marker in the technical description, provide:
   - id: The number N used in the marker
   - term: The exact text between [[code ref=N]] and [[/code]]
   - file: The full file path from the changes above
   - description: Brief description of what this code does
   - matchContext: A short code snippet or identifier that uniquely identifies the referenced code`;
}

function buildFactCheckInstruction(): string {
  return `6. **Fact Check**: Compare the PR description to the actual changes.
   - Are there claims in the description not supported by the code?
   - Are there significant changes not mentioned in the description?
   - Only flag real discrepancies, not minor omissions.`;
}

function buildDigestSentenceInstruction(): string {
  return `7. **Digest Sentence** (max 250 chars): One enthusiastic sentence for an email digest.
   - Tone: teasing, positive, super enthusiastic — like an excited coworker
   - Focus on what this PR ENABLES — the benefit, the unlock — not the mechanics
   - Reference the PR author by their @handle (from the PR metadata above)
   - Paraphrase the headline — don't repeat it verbatim
   - Slip in PR wordplay where it fits naturally — don't force it
   - For merged PRs: past tense ("@handle shipped...")`;
}

function buildTechnicalDescriptionInstruction(): string {
  return `8. **Technical Description** (max 3000 chars): A PR walkthrough for engineers, EMs, and technical PMs.
   Walk the reader through the changes as if presenting in a PR review meeting.

   **Formatting**: Every component name, function name, variable name, type name, and file path
   MUST be wrapped in [[code]]name[[/code]] tags. Map them to code locations using
   [[code ref=N]]name[[/code]] syntax when they correspond to actual code in the diff.

   **Start with an intro** (1-2 sentences): The single most important technical decision or change.

   **Then tell the story in chapters.** Group changes by their role in the narrative, not by directory.
   Order by importance: core changes first, cleanup last.

   **Mermaid diagrams**: Include a Mermaid flowchart when the change touches multiple layers or
   components. Use [[codeblock lang="mermaid"]]graph LR; ...[[/codeblock]], 5-8 nodes max.

   **Code snippets**: Include code blocks showing key changes in unified diff format with
   [[codeblock lang="..." file="path/to/file.ts"]]...[[/codeblock]] using +/- prefixes.

   **End with "Files at a Glance"**: A bullet list of changed files with one-line descriptions.
   Wrap paths in [[code]]path/to/file.ts[[/code]].

   Do NOT use marketing language or describe old behavior unnecessarily.`;
}

function buildImageDirectionInstruction(): string {
  return `9. **Image Direction** (max 250 chars, or null if primary category is not "feature"):
   For feature PRs only: describe ONE concrete visual metaphor for an editorial ink illustration.
   Describe physical forms/objects/scenes — NOT tech concepts.
   Name ONE element that should carry an accent color highlight.
   Prefer NO text in the image. If a word is essential, spell it out exactly.
   Return null for non-feature PRs.`;
}

function buildUserPrompt(changesPrompt: string): string {
  const instructions = [
    buildCategoriesInstruction(),
    buildStoryInstruction(),
    buildStandfirstInstruction(),
    buildHeadlineInstruction(),
    buildCodeReferencesInstruction(),
    buildFactCheckInstruction(),
    buildDigestSentenceInstruction(),
    buildTechnicalDescriptionInstruction(),
    buildImageDirectionInstruction(),
  ].join('\n\n');

  return `Analyze this change:

${changesPrompt}

---

Based on the actual code changes (not just the description), provide:

${instructions}`;
}

// ============================================================
// LLM client + invocation — supports both OpenAI-compatible and
// Anthropic-compatible endpoints. Uses gitsky's invokeStructured pattern
// (functionCalling + stripped schema) for MiniMax compatibility.
// ============================================================

export type AIProtocol = 'openai' | 'anthropic';

export interface LLMConfig {
  apiKey: string;
  model: string;
  protocol: AIProtocol;
  baseURL?: string;
  temperature?: number;
}

export function createSummarizer(config: LLMConfig) {
  const isMiniMax = config.model.toLowerCase().startsWith('minimax');

  const client = config.protocol === 'anthropic'
    ? new ChatAnthropic({
        model: config.model,
        apiKey: config.apiKey,
        temperature: config.temperature ?? 0,
        maxTokens: 16384,
        ...(config.baseURL ? { anthropicApiUrl: config.baseURL } : {}),
      })
    : new ChatOpenAI({
        model: config.model,
        apiKey: config.apiKey,
        temperature: config.temperature ?? 0,
        ...(config.baseURL ? { configuration: { baseURL: config.baseURL } } : {}),
      });

  // MiniMax doesn't support .min/.max constraints in tool schemas.
  // Convert to JSON Schema, strip constraints, pass that as the schema.
  const effectiveSchema = isMiniMax
    ? stripJsonSchemaConstraints(z.toJSONSchema(ChangesNodeOutputSchema) as Record<string, unknown>)
    : ChangesNodeOutputSchema;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structured = (client as any).withStructuredOutput(effectiveSchema, {
    name: 'gitpulse_changes_analysis',
    includeRaw: true,
    ...(isMiniMax && { method: 'functionCalling' }),
  });

  return async function summarize(changesContext: string): Promise<AISummary> {
    const userPrompt = buildUserPrompt(changesContext);
    const response = await structured.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);
    if (response.parsed === null || response.parsed === undefined) {
      throw new Error(
        `LLM returned null for structured output. Raw: ${
          typeof response.raw?.content === 'string'
            ? response.raw.content.slice(0, 500)
            : JSON.stringify(response.raw?.content ?? '').slice(0, 500)
        }`,
      );
    }
    // Trust LangChain's structured-output validation. We deliberately do NOT
    // re-validate against the strict schema (with min/max bounds) because for
    // MiniMax we hand the model the stripped JSON schema — re-validation
    // against the bounded schema would reject perfectly-good outputs whose
    // story/technicalDescription happens to exceed the soft limit. Matches
    // gitsky's invokeStructured pattern.
    return response.parsed as ChangesNodeOutput;
  };
}

// ============================================================
// Post-processing — lifted from gitsky/nodes/changes.ts
// ============================================================

export function postProcessOutput(data: ChangesNodeOutput): ChangesNodeOutput {
  const unescape = (s: string | undefined | null) => s?.replace(/\\n/g, '\n') ?? '';
  const unescaped: ChangesNodeOutput = {
    ...data,
    headline: unescape(data.headline),
    standfirst: unescape(data.standfirst),
    story: unescape(data.story),
    digestSentence: unescape(data.digestSentence),
    factCheckIssues: data.factCheckIssues?.replace(/\\n/g, '\n') ?? null,
    technicalDescription: unescape(data.technicalDescription),
    imageDirection: data.imageDirection?.replace(/\\n/g, '\n') ?? null,
  };
  const convertAll = (text: string) =>
    fixMalformedCodeBlocks(convertCodeblockTags(convertInlineCodeTags(text)));
  return {
    ...unescaped,
    story: convertAll(unescaped.story || ''),
    technicalDescription: convertAll(unescaped.technicalDescription || ''),
  };
}

function convertInlineCodeTags(text: string): string {
  return text
    .replace(/`([^`\n]+)`/g, '[[code]]$1[[/code]]')
    .replace(/\[code\]([^\[]+)\[\/code\]/g, '[[code]]$1[[/code]]');
}

function convertCodeblockTags(text: string): string {
  let result = text.replace(
    /\[\[codeblock(?:\s+lang="([^"]*)")?(?:\s+file="([^"]*)")?\]\]([\s\S]*?)\[\[\/codeblock\]\]/g,
    (_, lang, file, code) => {
      const langSpec = lang ? lang : '';
      const fileSpec = file ? ` file=${file}` : '';
      return '```' + langSpec + fileSpec + '\n' + code.trim() + '\n```';
    },
  );
  result = result.replace(
    /\[codeblock(?:\s+lang="([^"]*)")?(?:\s+file="([^"]*)")?\]([\s\S]*?)\[\/codeblock\]/g,
    (_, lang, file, code) => {
      const langSpec = lang ? lang : '';
      const fileSpec = file ? ` file=${file}` : '';
      return '```' + langSpec + fileSpec + '\n' + code.trim() + '\n```';
    },
  );
  return result;
}

function fixMalformedCodeBlocks(text: string): string {
  let result = text;
  result = result.replace(/`{4,}(\w*)\n([\s\S]*?)\n`{4,}/g, (_, lang, code) => {
    const langSpec = lang || '';
    return '```' + langSpec + '\n' + code + '\n```';
  });
  result = result.replace(/`\s+`\s*(\w+)?[\s\n]+([\s\S]*?)[\s\n]*`\s+`/g, (_, lang, code) => {
    const langSpec = lang ? lang : '';
    return '```' + langSpec + '\n' + code.trim() + '\n```';
  });
  result = result.replace(/``\s*(\w+)?[\s\n]+([\s\S]*?)[\s\n]*``/g, (_, lang, code) => {
    const langSpec = lang ? lang : '';
    return '```' + langSpec + '\n' + code.trim() + '\n```';
  });
  result = result.replace(/\\`\\`\\`/g, '```');
  return result;
}
