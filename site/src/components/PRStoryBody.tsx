'use client';

import { useState } from 'react';
import { BookOpen, Terminal } from 'lucide-react';
import { renderStoryMarkup } from '@/lib/render-story';

type Tab = 'story' | 'technical';

export function PRStoryBody({
  story,
  technicalDescription,
}: {
  story: string;
  technicalDescription?: string;
}) {
  const hasTechnical = !!technicalDescription;
  const [activeTab, setActiveTab] = useState<Tab>('story');

  const text = hasTechnical && activeTab === 'technical' ? technicalDescription! : story;

  return (
    <div>
      {hasTechnical && <TabBar active={activeTab} onChange={setActiveTab} />}
      <div className="font-feed-body text-foreground-secondary leading-relaxed">
        {renderStoryMarkup(text)}
      </div>
    </div>
  );
}

function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div className="flex items-center gap-1 mb-6 border-b border-border-light">
      <TabButton
        isActive={active === 'story'}
        onClick={() => onChange('story')}
        icon={<BookOpen className="w-3.5 h-3.5" />}
        label="Story"
      />
      <TabButton
        isActive={active === 'technical'}
        onClick={() => onChange('technical')}
        icon={<Terminal className="w-3.5 h-3.5" />}
        label="Technical"
        inactiveMono
      />
    </div>
  );
}

function TabButton({
  isActive,
  onClick,
  icon,
  label,
  inactiveMono,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  inactiveMono?: boolean;
}) {
  const base =
    'flex items-center gap-1.5 px-3 py-2 text-xs transition-colors -mb-px border-b-2';
  const state = isActive
    ? 'border-foreground text-foreground font-medium'
    : `border-transparent text-muted hover:text-foreground-secondary ${
        inactiveMono ? 'font-mono' : 'font-medium'
      }`;
  return (
    <button type="button" onClick={onClick} className={`${base} ${state}`}>
      {icon}
      {label}
    </button>
  );
}
