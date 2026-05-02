'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Story } from '@/lib/stories';
import { basePath } from '@/lib/base-path';

interface PRPanelState {
  isOpen: boolean;
  isClosing: boolean;
  isLoading: boolean;
  story: Story | null;
  error: string | null;
  currentPrNumber: number | null;
}

interface PRPanelContextValue extends PRPanelState {
  openPanel: (prNumber: number) => void;
  closePanel: () => void;
}

const initialState: PRPanelState = {
  isOpen: false,
  isClosing: false,
  isLoading: false,
  story: null,
  error: null,
  currentPrNumber: null,
};

const PRPanelContext = createContext<PRPanelContextValue | null>(null);

const CLOSE_ANIMATION_MS = 250;

function pushPRParam(prNumber: number) {
  const url = new URL(window.location.href);
  url.searchParams.set('pull', String(prNumber));
  window.history.pushState({ prPanel: true }, '', url.toString());
}

function removePRParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('pull')) return;
  url.searchParams.delete('pull');
  window.history.pushState({ prPanel: false }, '', url.toString());
}

function parsePullHrefPath(href: string): number | null {
  // Accept absolute or root-relative URLs. Match `${basePath}/pull/<n>/...`.
  let pathname: string;
  try {
    pathname = new URL(href, window.location.href).pathname;
  } catch {
    return null;
  }
  const prefix = `${basePath}/pull/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const m = rest.match(/^(\d+)(?:\/|$)/);
  if (!m) return null;
  return Number(m[1]);
}

export function PRPanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PRPanelState>(initialState);
  const scrollYRef = useRef(0);
  const cacheRef = useRef<Map<number, Story>>(new Map());
  const stateRef = useRef(state);
  stateRef.current = state;

  const openPanel = useCallback((prNumber: number) => {
    if (
      stateRef.current.isOpen &&
      stateRef.current.currentPrNumber === prNumber
    ) {
      return;
    }

    const cached = cacheRef.current.get(prNumber);
    if (cached) {
      setState({
        isOpen: true,
        isClosing: false,
        isLoading: false,
        story: cached,
        error: null,
        currentPrNumber: prNumber,
      });
      pushPRParam(prNumber);
      return;
    }

    setState({
      isOpen: true,
      isClosing: false,
      isLoading: true,
      story: null,
      error: null,
      currentPrNumber: prNumber,
    });
    pushPRParam(prNumber);

    fetch(`${basePath}/data/stories/pr-${prNumber}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json() as Promise<Story>;
      })
      .then((story) => {
        cacheRef.current.set(prNumber, story);
        setState((prev) =>
          prev.currentPrNumber === prNumber
            ? { ...prev, isLoading: false, story, error: null }
            : prev,
        );
      })
      .catch((err) => {
        setState((prev) =>
          prev.currentPrNumber === prNumber
            ? {
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err.message : String(err),
              }
            : prev,
        );
      });
  }, []);

  const closePanel = useCallback(() => {
    setState((prev) =>
      prev.isOpen ? { ...prev, isClosing: true } : prev,
    );
    setTimeout(() => {
      setState(initialState);
      removePRParam();
    }, CLOSE_ANIMATION_MS);
  }, []);

  // Body scroll lock + position restoration.
  useEffect(() => {
    if (state.isOpen) {
      if (document.body.style.position !== 'fixed') {
        scrollYRef.current = window.scrollY;
      }
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
    } else {
      const savedY = scrollYRef.current;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      if (savedY > 0) window.scrollTo(0, savedY);
    }
  }, [state.isOpen]);

  // ESC closes the panel.
  useEffect(() => {
    if (!state.isOpen || state.isClosing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.isOpen, state.isClosing, closePanel]);

  // Browser back closes the panel (when ?pull= is gone from URL).
  useEffect(() => {
    const handler = () => {
      const url = new URL(window.location.href);
      if (
        stateRef.current.isOpen &&
        !stateRef.current.isClosing &&
        !url.searchParams.has('pull')
      ) {
        setState((prev) => ({ ...prev, isClosing: true }));
        setTimeout(() => setState(initialState), CLOSE_ANIMATION_MS);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Document-level click interception for /pull/<n>/ links.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Let the user open in a new tab as expected.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;
      // Don't intercept on the full-page PR route itself.
      if (window.location.pathname.startsWith(`${basePath}/pull/`)) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      // Respect explicit target="_blank" / external links.
      if (anchor.target && anchor.target !== '' && anchor.target !== '_self') {
        return;
      }

      const prNumber = parsePullHrefPath(href);
      if (prNumber == null) return;

      e.preventDefault();
      openPanel(prNumber);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openPanel]);

  // Open from ?pull= on first mount (deep links / refresh).
  useEffect(() => {
    const url = new URL(window.location.href);
    const param = url.searchParams.get('pull');
    if (!param) return;
    const n = Number(param);
    if (!Number.isFinite(n) || n <= 0) return;
    openPanel(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PRPanelContext.Provider value={{ ...state, openPanel, closePanel }}>
      {children}
    </PRPanelContext.Provider>
  );
}

export function usePRPanel(): PRPanelContextValue {
  const ctx = useContext(PRPanelContext);
  if (!ctx) throw new Error('usePRPanel must be used inside PRPanelProvider');
  return ctx;
}
