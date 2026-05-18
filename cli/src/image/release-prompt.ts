// Release "Special Edition" illustration prompt. Adapted from
// gitsky/src/services/release-image-prompt.ts (generic template). Flux is
// not ported. Theme color is passed in as a hex by the caller — see PR 2
// rationale in cli/src/image/prompt.ts.

const STYLE_SECTION = `Editorial illustration for a tech publication.

- Human Hand & Medium: Hand-drawn ink on paper, slight ink bleed, natural pen pressure variation, charcoal smudging.
- Linework: Imperfect organic lines, hatching and cross-hatching for depth, varied line weights, stipple shading.
- Composition: High-contrast, minimalist negative space, conceptual metaphor, sophisticated editorial aesthetic.
- Analog Texture: Subtle paper tooth texture, raw sketchbook quality, no gradients, no digital smoothing, non-symmetrical imperfections.
- Avoid overused tech imagery (cloud servers, flow charts, databases, gears, cogs, wrenches, icons).
- ABSOLUTELY NO TEXT, LETTERS, NUMBERS, WORDS, LABELS, CAPTIONS, OR TYPOGRAPHY OF ANY KIND. Not even partial, blurred, or decorative text. No signs, banners, screens with text, or any surface containing written characters. The illustration must convey 100% of the concept through visual imagery alone.
- Accent color {themeColor}: use with extreme parsimony — most of the image should be ink/charcoal. The accent is a rare, deliberate pop.`;

// Cap on raw release-notes prose included in the prompt. Releases sometimes
// ship with thousand-line changelogs that would otherwise drown the
// editorial direction.
const RELEASE_NOTES_MAX = 1500;

export interface ReleaseTopStoryEntry {
  headline: string;
  standfirst?: string;
  story?: string;
  technicalDescription?: string;
}

export interface ReleaseImagePromptInput {
  quip: string;
  releaseStory: string | null;
  topStories: ReleaseTopStoryEntry[];
  releaseNotes: string | null;
  themeColor: string;
}

export function buildReleaseImagePrompt(input: ReleaseImagePromptInput): string {
  const stories = input.topStories
    .map((s, i) => {
      const parts = [`${i + 1}. ${s.headline}`];
      if (s.standfirst) parts.push(`   ${s.standfirst}`);
      if (s.story) parts.push(`   Story: ${s.story}`);
      if (s.technicalDescription) parts.push(`   Technical: ${s.technicalDescription}`);
      return parts.join('\n');
    })
    .join('\n\n');
  const notes = input.releaseNotes
    ? input.releaseNotes.slice(0, RELEASE_NOTES_MAX)
    : '(not available)';
  const style = STYLE_SECTION.replace('{themeColor}', input.themeColor);

  return `${style}

## Editorial Context
This is a "Special Edition" newspaper illustration for a software release.
The image should feel like the front page of a prestigious tech newspaper's
weekend edition — contemplative, ambitious, slightly sardonic.

## The Quip (the release's tone)
${input.quip}

## The Story (what this release means)
${input.releaseStory || '(not available)'}

## Top Stories in This Release
${stories || '(none)'}

## Raw Release Notes (for grounding)
${notes}

-----

Find a visual editorial metaphor that captures the overall spirit of this release.
The illustration should feel like it belongs on the cover of a special newspaper edition —
grander in scope than a single feature, conveying transformation or evolution.
Think: a panoramic scene, an allegory, a before/after moment.
`;
}
