import { ExternalLink } from 'lucide-react';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

interface PRSubtitleProps {
  author: string;
  authorUrl?: string;
  date: string;
  prNumber?: number;
  prTitle?: string;
  prUrl?: string;
  commitSha?: string;
  commitUrl?: string;
}

export function PRSubtitle({
  author,
  authorUrl,
  date,
  prNumber,
  prTitle,
  prUrl,
  commitSha,
  commitUrl,
}: PRSubtitleProps) {
  const initials = author.slice(0, 2).toUpperCase();
  const dateLabel = dateFmt.format(new Date(date));

  const ref = renderReference({
    prNumber,
    prTitle,
    prUrl,
    commitSha,
    commitUrl,
    desktop: true,
  });

  return (
    <div className="flex items-center gap-3 text-muted mb-8 min-w-0">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="avatar-sm">{initials}</span>
        {authorUrl ? (
          <a
            href={authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground-secondary hover:text-accent transition-colors leading-none"
          >
            {author}
          </a>
        ) : (
          <span className="text-sm font-medium text-foreground-secondary leading-none">
            {author}
          </span>
        )}
      </div>
      <Separator />
      <span className="text-sm flex-shrink-0 leading-none">{dateLabel}</span>
      {ref && (
        <>
          <span className="hidden sm:flex">
            <Separator />
          </span>
          {ref}
        </>
      )}
    </div>
  );
}

function Separator() {
  return (
    <span
      aria-hidden="true"
      className="w-1 h-1 rounded-full bg-border-medium flex-shrink-0"
    />
  );
}

export function PRMobileReference(props: {
  prNumber?: number;
  prTitle?: string;
  prUrl?: string;
  commitSha?: string;
  commitUrl?: string;
}) {
  return renderReference({ ...props, desktop: false });
}

function renderReference(opts: {
  prNumber?: number;
  prTitle?: string;
  prUrl?: string;
  commitSha?: string;
  commitUrl?: string;
  desktop: boolean;
}) {
  const { prNumber, prTitle, prUrl, commitSha, commitUrl, desktop } = opts;
  const visibilityCls = desktop
    ? 'hidden sm:inline-flex text-sm'
    : 'sm:hidden flex text-xs mb-3';
  const baseCls = `${visibilityCls} items-center gap-1.5 text-muted hover:text-accent transition-colors truncate min-w-0`;

  if (prUrl && prNumber !== undefined) {
    return (
      <a href={prUrl} target="_blank" rel="noopener noreferrer" className={baseCls}>
        <span className="font-mono leading-none flex-shrink-0">#{prNumber}</span>
        {prTitle && <span className="truncate leading-none">{prTitle}</span>}
        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
      </a>
    );
  }
  if (commitUrl && commitSha) {
    return (
      <a href={commitUrl} target="_blank" rel="noopener noreferrer" className={baseCls}>
        <span className="font-mono leading-none flex-shrink-0">{commitSha.slice(0, 7)}</span>
        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
      </a>
    );
  }
  return null;
}
