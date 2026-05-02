import type { Story } from '@/lib/stories';
import { PRMetaRow } from './PRMetaRow';
import { PRSubtitle, PRMobileReference } from './PRSubtitle';
import { PRStoryBody } from './PRStoryBody';

export type PRArticleVariant = 'page' | 'panel';

export function PRArticle({
  story,
  variant = 'page',
}: {
  story: Story;
  variant?: PRArticleVariant;
}) {
  const articleClass = variant === 'panel' ? 'mb-2' : 'mt-xl mb-6';
  return (
    <article className={articleClass}>
      <PRMetaRow
        sizeAssessment={story.sizeAssessment}
        categories={story.categories}
      />
      <PRMobileReference
        prNumber={story.prNumber}
        prTitle={story.prTitle}
        prUrl={story.prUrl}
      />
      <h1 className="headline mb-4">{story.headline}</h1>
      <PRSubtitle
        author={story.author}
        authorUrl={story.authorUrl}
        mergedAt={story.mergedAt ?? story.committedAt}
        prNumber={story.prNumber}
        prTitle={story.prTitle}
        prUrl={story.prUrl}
      />
      <p className="standfirst font-feed-body mb-10">{story.standfirst}</p>
      <PRStoryBody
        story={story.story}
        technicalDescription={story.technicalDescription || undefined}
      />
    </article>
  );
}
