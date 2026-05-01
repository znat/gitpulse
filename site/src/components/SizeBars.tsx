import type { SizeAssessment } from '@/lib/stories';

const SIZE_CONFIG: Record<SizeAssessment, { bars: number; label: string }> = {
  xs: { bars: 1, label: 'XS' },
  small: { bars: 2, label: 'S' },
  medium: { bars: 3, label: 'M' },
  large: { bars: 4, label: 'L' },
  xl: { bars: 5, label: 'XL' },
};

export function SizeBars({ size }: { size: SizeAssessment }) {
  const config = SIZE_CONFIG[size];
  return (
    <span className="inline-flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-[3px] h-[8px] rounded-[1px] ${
            i <= config.bars ? 'bg-feed-gold' : 'bg-border-medium'
          }`}
        />
      ))}
      <span className="ml-1 text-[0.625rem] font-medium">{config.label}</span>
    </span>
  );
}
