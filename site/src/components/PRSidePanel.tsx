'use client';

import { useEffect, useRef, useState } from 'react';
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
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  if (!isOpen) return null;

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closePanel();
  };

  // Focus trap and restoration
  useEffect(() => {
    if (!isOpen || isClosing) return;

    // Save the element that triggered the panel
    triggerElementRef.current = document.activeElement as HTMLElement;

    // Move focus into the panel
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    // Set aria-hidden on the main content to prevent background tabbing
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.setAttribute('aria-hidden', 'true');
    }

    // Focus trap handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusableElements = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusableArray = Array.from(focusableElements);
      const firstFocusable = focusableArray[0];
      const lastFocusable = focusableArray[focusableArray.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore aria-hidden on cleanup
      if (mainElement) {
        mainElement.removeAttribute('aria-hidden');
      }

      // Restore focus to the trigger element
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        triggerElementRef.current.focus();
      }
    };
  }, [isOpen, isClosing]);

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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={story?.kind === 'direct-push' ? 'Direct push' : 'Pull request'}
        className={`pr-panel fixed right-0 top-0 bottom-0 z-[101] w-full md:w-[66vw] lg:w-[60vw] max-w-[960px] bg-background shadow-2xl flex flex-col ${
          isClosing ? 'pr-panel--closing' : ''
        }`}
      >
        <header className="flex items-center justify-end p-3 border-b border-border-light">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closePanel}
            aria-label="Close panel"
            className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-background-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 md:px-10 lg:px-14 py-xl">
          {isLoading && <PanelSkeleton />}
          {error && !isLoading && (
            <p className="text-muted text-sm">
              Couldn&apos;t load this story: {error}
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
