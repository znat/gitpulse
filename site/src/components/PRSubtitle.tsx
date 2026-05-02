import { ExternalLink } from 'lucide-react';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function PRSubtitle({
  author,
  authorUrl,
  mergedAt,
  prNumber,
  prTitle,
  prUrl,
}: {
  author: string;
  authorUrl?: string;
  mergedAt: string;
  prNumber?: number;
  prTitle?: string;
  prUrl?: string;
}) {
  const initials = author.slice(0, 2).toUpperCase();
  const dateLabel = dateFmt.format(new Date(mergedAt));

  return (
    <div className="flex items-center gap-3 text-muted mb-8 min-w-0">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="avatar-sm">{initials}</span>
        {authorUrl ? (
          <a
            href={authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground-secondary hover:text-accent transition-colors"
          >
            {author}
          </a>
        ) : (
          <span className="text-sm font-medium text-foreground-secondary">
            {author}
          </span>
        )}
      </div>
      <span className="text-border-medium flex-shrink-0">·</span>
      <span className="text-sm flex-shrink-0">{dateLabel}</span>
      {prUrl && prNumber !== undefined && (
        <>
          <span className="hidden sm:inline text-border-medium flex-shrink-0">
            ·
          </span>
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex text-sm text-muted hover:text-accent transition-colors truncate min-w-0 items-center gap-1.5"
          >
            <span className="font-mono flex-shrink-0">#{prNumber}</span>
            {prTitle && <span className="truncate">{prTitle}</span>}
            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
          </a>
        </>
      )}
    </div>
  );
}

export function PRMobileReference({
  prNumber,
  prTitle,
  prUrl,
}: {
  prNumber?: number;
  prTitle?: string;
  prUrl?: string;
}) {
  if (!prUrl || prNumber === undefined) return null;
  return (
    <a
      href={prUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="sm:hidden flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mb-3 min-w-0"
    >
      <span className="font-mono flex-shrink-0">#{prNumber}</span>
      {prTitle && <span className="truncate">{prTitle}</span>}
      <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
    </a>
  );
}
