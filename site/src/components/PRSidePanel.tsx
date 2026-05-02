'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { usePRPanel } from '@/providers/PRPanelProvider';
import { PRArticle } from './PRArticle';

export function PRSidePanel() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(<PanelContent />, document.body);
}

function PanelContent() {
  const { isOpen, isClosing, isLoading, story, error, closePanel } =
    usePRPanel();
  if (!isOpen) return null;

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closePanel();
  };

  return (
    <>
      <div
        className={`pr-panel-backdrop fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] ${
          isClosing ? 'pr-panel-backdrop--closing' : ''
        }`}
        onClick={onBackdropClick}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pull request"
        className={`pr-panel fixed right-0 top-0 bottom-0 z-[101] w-full md:w-[66vw] lg:w-[60vw] max-w-[960px] bg-background shadow-2xl flex flex-col ${
          isClosing ? 'pr-panel--closing' : ''
        }`}
      >
        <header className="flex items-center justify-end p-3 border-b border-border-light">
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close panel"
            className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-background-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-md md:px-lg py-xl">
          {isLoading && <PanelSkeleton />}
          {error && !isLoading && (
            <p className="text-muted text-sm">
              Couldn&apos;t load this PR: {error}
            </p>
          )}
          {story && <PRArticle story={story} variant="panel" />}
        </div>
      </div>
    </>
  );
}

function PanelSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-6 bg-background-tertiary rounded w-1/3" />
      <div className="h-10 bg-background-tertiary rounded w-3/4" />
      <div className="h-4 bg-background-tertiary rounded w-1/2" />
      <div className="space-y-2">
        <div className="h-4 bg-background-tertiary rounded" />
        <div className="h-4 bg-background-tertiary rounded" />
        <div className="h-4 bg-background-tertiary rounded w-5/6" />
      </div>
    </div>
  );
}
