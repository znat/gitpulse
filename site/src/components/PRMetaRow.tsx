import { Check, GitCommitVertical, HelpCircle } from 'lucide-react';
import {
  type CategoryEntry,
  type CategoryKey,
  type SizeAssessment,
  type StoryKind,
  categoryDisplayName,
} from '@/lib/stories';

const SIZE_DISPLAY: Record<
  SizeAssessment,
  { label: string; bars: number; tooltip: string }
> = {
  xs: { label: 'XS', bars: 1, tooltip: 'Extra Small: < 10 weighted lines' },
  small: { label: 'S', bars: 2, tooltip: 'Small: 10–100 weighted lines' },
  medium: { label: 'M', bars: 3, tooltip: 'Medium: 100–500 weighted lines' },
  large: { label: 'L', bars: 4, tooltip: 'Large: 500–1000 weighted lines' },
  xl: { label: 'XL', bars: 5, tooltip: 'Extra Large: 1000+ weighted lines' },
};

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  feature: '#22c55e',
  bugfix: '#ef4444',
  refactor: '#8b5cf6',
  maintenance: '#64748b',
  docs: '#06b6d4',
  test: '#f59e0b',
  dependency: '#0ea5e9',
  config: '#0ea5e9',
  performance: '#22c55e',
  security: '#ef4444',
  ci: '#0ea5e9',
  style: '#64748b',
};

export function PRMetaRow({
  sizeAssessment,
  categories,
  kind = 'pr',
}: {
  sizeAssessment: SizeAssessment;
  categories: CategoryEntry[];
  kind?: StoryKind;
}) {
  const sizeInfo = SIZE_DISPLAY[sizeAssessment];
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b border-border-light">
      <div className="flex items-center justify-between sm:justify-start sm:gap-4">
        <StatusBadge kind={kind} />
        <div className="hidden sm:block w-px h-6 bg-border-light" />
        <SizeWidget sizeInfo={sizeInfo} />
      </div>
      <div className="hidden sm:block w-px h-6 bg-border-light" />
      <CategoryBar categories={categories} />
    </div>
  );
}

function StatusBadge({ kind }: { kind: StoryKind }) {
  if (kind === 'pr') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border-l-[3px] bg-[rgba(26,127,55,0.12)] border-l-positive">
        <Check className="w-3.5 h-3.5 text-positive" />
        <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-positive">
          Merged
        </span>
      </div>
    );
  }
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border-l-[3px] border-l-accent-tertiary"
      style={{
        background:
          'color-mix(in srgb, var(--accent-tertiary) 12%, transparent)',
      }}
    >
      <GitCommitVertical className="w-3.5 h-3.5 text-accent-tertiary" />
      <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-accent-tertiary">
        Pushed
      </span>
    </div>
  );
}

function SizeWidget({
  sizeInfo,
}: {
  sizeInfo: { label: string; bars: number; tooltip: string };
}) {
  return (
    <div className="flex items-center gap-3 relative">
      <span className="meta-label">Size</span>
      <div className="flex items-center gap-1">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`size-bar ${
                i <= sizeInfo.bars ? 'size-bar-filled' : 'size-bar-empty'
              }`}
            />
          ))}
        </div>
        <span className="ml-2 font-mono text-xs text-foreground-secondary">
          {sizeInfo.label}
        </span>
      </div>
      <span
        title={sizeInfo.tooltip}
        aria-label={sizeInfo.tooltip}
        className="inline-flex items-center justify-center cursor-help text-muted hover:text-accent transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
      </span>
    </div>
  );
}

interface LegendItem {
  key: CategoryKey;
  score: number;
  label: string;
  color: string;
}

function CategoryBar({ categories }: { categories: CategoryEntry[] }) {
  const items: LegendItem[] = categories.map((c) => ({
    key: c.key,
    score: c.score,
    label: categoryDisplayName(c.key),
    color: CATEGORY_COLORS[c.key] ?? '#64748b',
  }));

  return (
    <div className="bg-background-secondary sm:bg-transparent rounded-md sm:rounded-none border border-border-light sm:border-0 p-3 sm:p-0 flex-1 min-w-0">
      <div className="font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted mb-2 sm:hidden">
        Change Breakdown
      </div>
      <CategorySegmentedBar items={items} />
      <CategoryLegend items={items} />
    </div>
  );
}

function CategorySegmentedBar({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 mb-2.5 bg-background-tertiary sm:max-w-[300px]">
      {items.map((item, i) => (
        <div
          key={i}
          className="h-full rounded-full min-w-[3px]"
          style={{ width: `${item.score}%`, backgroundColor: item.color }}
          title={`${item.label}: ${item.score}%`}
        />
      ))}
    </div>
  );
}

function CategoryLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:flex sm:flex-wrap sm:gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between sm:justify-start sm:gap-1.5 text-xs text-muted"
        >
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </span>
          <span className="font-mono text-[0.625rem] text-muted/70">
            {item.score}%
          </span>
        </div>
      ))}
    </div>
  );
}
