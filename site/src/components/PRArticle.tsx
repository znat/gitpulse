import Image from 'next/image';
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
  const date =
    story.kind === 'pr' ? story.mergedAt ?? story.committedAt : story.committedAt;

  return (
    <article className={articleClass}>
      <PRMetaRow
        sizeAssessment={story.sizeAssessment}
        categories={story.categories}
        kind={story.kind}
      />
      <PRMobileReference
        prNumber={story.prNumber}
        prTitle={story.prTitle}
        prUrl={story.prUrl}
        commitSha={story.kind === 'direct-push' ? story.sha : undefined}
        commitUrl={story.kind === 'direct-push' ? story.commitUrl : undefined}
      />
      <h1 className="headline mb-4">{story.headline}</h1>
      <PRSubtitle
        author={story.author}
        authorUrl={story.authorUrl}
        date={date}
        prNumber={story.prNumber}
        prTitle={story.prTitle}
        prUrl={story.prUrl}
        commitSha={story.kind === 'direct-push' ? story.sha : undefined}
        commitUrl={story.kind === 'direct-push' ? story.commitUrl : undefined}
      />
      <p className="standfirst font-feed-body mb-10">{story.standfirst}</p>
      {story.imageUrl && (
        <div
          className="relative w-full overflow-hidden rounded-md mb-10"
          style={{ aspectRatio: '3/2' }}
        >
          <Image
            src={story.imageUrl}
            alt={story.headline}
            fill
            className="object-cover"
            sizes={variant === 'panel' ? '(max-width: 768px) 100vw, 480px' : '(max-width: 768px) 100vw, 720px'}
            // The full-page illustration is above the fold (likely LCP) — eager-load
            // + preload it. The panel can open below the fold, so leave it lazy.
            priority={variant === 'page'}
            unoptimized
          />
        </div>
      )}
      <PRStoryBody
        story={story.story}
        technicalDescription={story.technicalDescription || undefined}
      />
    </article>
  );
}
