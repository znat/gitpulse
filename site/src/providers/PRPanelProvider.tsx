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

const IS_ENCRYPTED = process.env.NEXT_PUBLIC_GITPULSE_ENCRYPTED === '1';

interface Envelope {
  iv: string;
  ct: string;
  salt?: string;
}

function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const arr = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function waitForKey(timeoutMs = 5_000): Promise<CryptoKey> {
  const KEY_GLOBAL = '__gitpulseKey';
  const existing = (window as unknown as Record<string, unknown>)[KEY_GLOBAL];
  if (existing instanceof CryptoKey) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('gp:unlocked', handler);
      reject(new Error('Timed out waiting for unlock key'));
    }, timeoutMs);
    function handler() {
      const k = (window as unknown as Record<string, unknown>)[KEY_GLOBAL];
      if (k instanceof CryptoKey) {
        clearTimeout(timer);
        window.removeEventListener('gp:unlocked', handler);
        resolve(k);
      }
    }
    window.addEventListener('gp:unlocked', handler);
  });
}

async function fetchStory(storyId: string): Promise<Story> {
  const res = await fetch(
    `${basePath}/data/stories/${encodeURIComponent(storyId)}.json`,
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (!IS_ENCRYPTED) return (await res.json()) as Story;
  const env = (await res.json()) as Envelope;
  const key = await waitForKey();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64decode(env.iv) },
    key,
    b64decode(env.ct),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as Story;
}

interface PRPanelState {
  isOpen: boolean;
  isClosing: boolean;
  isLoading: boolean;
  story: Story | null;
  error: string | null;
  currentStoryId: string | null;
}

interface PRPanelContextValue extends PRPanelState {
  openPanel: (storyId: string) => void;
  closePanel: () => void;
}

const initialState: PRPanelState = {
  isOpen: false,
  isClosing: false,
  isLoading: false,
  story: null,
  error: null,
  currentStoryId: null,
};

const PRPanelContext = createContext<PRPanelContextValue | null>(null);

const CLOSE_ANIMATION_MS = 250;
const STORY_PARAM = 'story';

function pushStoryParam(storyId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(STORY_PARAM, storyId);
  window.history.pushState({ prPanel: true }, '', url.toString());
}

function removeStoryParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(STORY_PARAM)) return;
  url.searchParams.delete(STORY_PARAM);
  window.history.replaceState({ prPanel: false }, '', url.toString());
}

// Map a story-detail href to the story id used as the JSON filename:
//   /pull/22/<slug>/    -> "pr-22"
//   /commit/<sha>/<slug>/ -> "commit-<short>"   (short = first 7 chars)
export function parseStoryHrefId(href: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(href, window.location.href).pathname;
  } catch {
    return null;
  }
  const pullPrefix = `${basePath}/pull/`;
  if (pathname.startsWith(pullPrefix)) {
    const m = pathname.slice(pullPrefix.length).match(/^(\d+)(?:\/|$)/);
    return m ? `pr-${m[1]}` : null;
  }
  const commitPrefix = `${basePath}/commit/`;
  if (pathname.startsWith(commitPrefix)) {
    const m = pathname.slice(commitPrefix.length).match(/^([0-9a-f]+)(?:\/|$)/i);
    if (!m) return null;
    return `commit-${m[1]!.slice(0, 7)}`;
  }
  return null;
}

function isOnStoryDetailPath(): boolean {
  return (
    window.location.pathname.startsWith(`${basePath}/pull/`) ||
    window.location.pathname.startsWith(`${basePath}/commit/`)
  );
}

export function PRPanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PRPanelState>(initialState);
  const scrollYRef = useRef(0);
  const cacheRef = useRef<Map<string, Story>>(new Map());
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const openPanel = useCallback((storyId: string) => {
    // Clear any pending close timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (
      stateRef.current.isOpen &&
      stateRef.current.currentStoryId === storyId
    ) {
      return;
    }

    const cached = cacheRef.current.get(storyId);
    if (cached) {
      setState({
        isOpen: true,
        isClosing: false,
        isLoading: false,
        story: cached,
        error: null,
        currentStoryId: storyId,
      });
      pushStoryParam(storyId);
      return;
    }

    setState({
      isOpen: true,
      isClosing: false,
      isLoading: true,
      story: null,
      error: null,
      currentStoryId: storyId,
    });
    pushStoryParam(storyId);

    fetchStory(storyId)
      .then((story) => {
        cacheRef.current.set(storyId, story);
        setState((prev) =>
          prev.currentStoryId === storyId
            ? { ...prev, isLoading: false, story, error: null }
            : prev,
        );
      })
      .catch((err) => {
        setState((prev) =>
          prev.currentStoryId === storyId
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
    // Clear any existing close timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setState((prev) =>
      prev.isOpen ? { ...prev, isClosing: true } : prev,
    );
    closeTimerRef.current = setTimeout(() => {
      setState(initialState);
      removeStoryParam();
      closeTimerRef.current = null;
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

  // Browser back/forward syncs the panel with URL.
  useEffect(() => {
    const handler = () => {
      const url = new URL(window.location.href);
      const storyId = url.searchParams.get(STORY_PARAM);

      if (storyId) {
        // URL has ?story= param, open the panel
        if (!stateRef.current.isOpen || stateRef.current.currentStoryId !== storyId) {
          openPanel(storyId);
        }
      } else {
        // URL has no ?story= param, close the panel
        if (stateRef.current.isOpen && !stateRef.current.isClosing) {
          setState((prev) => ({ ...prev, isClosing: true }));
          setTimeout(() => setState(initialState), CLOSE_ANIMATION_MS);
        }
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [openPanel]);

  // Document-level click interception for /pull/<n>/ and /commit/<sha>/ links.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Let the user open in a new tab as expected.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;
      // Don't intercept on the full-page detail routes themselves.
      if (isOnStoryDetailPath()) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      // Respect explicit target="_blank" / external links.
      if (anchor.target && anchor.target !== '' && anchor.target !== '_self') {
        return;
      }

      const storyId = parseStoryHrefId(href);
      if (!storyId) return;

      e.preventDefault();
      openPanel(storyId);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openPanel]);

  // Open from ?story= on first mount (deep links / refresh).
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get(STORY_PARAM);
    if (!id) return;
    if (!/^(pr-\d+|commit-[0-9a-f]+)$/i.test(id)) return;
    openPanel(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
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
