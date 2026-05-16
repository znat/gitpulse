// Editorial illustration prompt builder. Adapted from
// gitsky/src/services/pr-analysis/image-prompt.ts (the generic template used
// for Gemini/OpenAI). The Flux variant is intentionally not ported — gitpulse
// only wires up Gemini in this PR. The accent color is passed in by the
// caller (`cli/src/image/generate-feature-image.ts`) — typically the hex
// from `.gitpulse.json` → `theme.accentColor`. Gemini interprets hex strings
// directly, so no name translation is needed here.

const STYLE_TEMPLATE = `Editorial illustration for a tech publication.

- Human Hand & Medium: Hand-drawn ink on paper, slight ink bleed, natural pen pressure variation, charcoal smudging.
- Linework: Imperfect organic lines, hatching and cross-hatching for depth, varied line weights, stipple shading.
- Composition: High-contrast, minimalist negative space, conceptual metaphor, sophisticated editorial aesthetic.
- Analog Texture: Subtle paper tooth texture, raw sketchbook quality, no gradients, no digital smoothing, non-symmetrical imperfections.
- Avoid overused tech imagery (cloud servers, flow charts, databases, gears, cogs, wrenches, icons).
- ABSOLUTELY NO TEXT, LETTERS, NUMBERS, WORDS, LABELS, CAPTIONS, OR TYPOGRAPHY OF ANY KIND. Not even partial, blurred, or decorative text. No signs, banners, screens with text, or any surface containing written characters. The illustration must convey 100% of the concept through visual imagery alone.
- Accent color {themeColor}: use with extreme parsimony — most of the image should be ink/charcoal. The accent is a rare, deliberate pop.


## Story
{story}

## Scope Summary
{scopeSummary}

## Technical Changes
{technicalDescription}

-----

Find a visual editorial metaphor to illustrate the what the feature brings.

`;

export interface ImagePromptInput {
  story: string;
  scopeSummary: string;
  technicalDescription?: string;
  themeColor: string;
}

export function buildImagePrompt(input: ImagePromptInput): string {
  return STYLE_TEMPLATE
    .replace('{themeColor}', input.themeColor)
    .replace('{story}', input.story)
    .replace('{scopeSummary}', input.scopeSummary)
    .replace('{technicalDescription}', input.technicalDescription || '(not available)');
}
