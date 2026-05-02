// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import {
  PRPanelProvider,
  usePRPanel,
} from './PRPanelProvider';

const FAKE_STORY = {
  id: 'pr-22',
  kind: 'pr' as const,
  sha: 'abc1234',
  author: 'octocat',
  committedAt: '2026-05-02T16:02:59+02:00',
  categories: [{ key: 'feature' as const, score: 100, reason: 'r' }],
  headline: 'Test headline',
  standfirst: 'Test standfirst',
  story: 'Body',
  digestSentence: '',
  technicalDescription: '',
  imageDirection: null,
  hasFactCheckIssues: false,
  factCheckIssues: null,
  sizeAssessment: 'medium' as const,
  sizeReasoning: '',
  additions: 0,
  deletions: 0,
  filesChanged: 0,
  prNumber: 22,
  prUrl: 'https://example.com/pull/22',
  prTitle: 'Add a thing',
  mergedAt: '2026-05-02T16:02:59+02:00',
};

function wrap({ children }: { children: React.ReactNode }) {
  return <PRPanelProvider>{children}</PRPanelProvider>;
}

beforeEach(() => {
  // Reset URL + scroll between tests.
  window.history.replaceState(null, '', '/');
  window.scrollTo(0, 0);
  document.body.style.cssText = '';
  vi.restoreAllMocks();
});

describe('PRPanelProvider', () => {
  it('openPanel(N) sets isLoading then fills story after fetch resolves', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(FAKE_STORY), { status: 200 }),
      );

    const { result } = renderHook(() => usePRPanel(), { wrapper: wrap });

    expect(result.current.isOpen).toBe(false);

    act(() => result.current.openPanel('pr-22'));

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.story).toBeNull();
    expect(window.location.search).toContain('story=pr-22');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.story?.headline).toBe('Test headline');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/data/stories/pr-22.json'),
    );
  });

  it('?story=ID on mount auto-opens', async () => {
    window.history.replaceState(null, '', '/?story=pr-22');
    vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(FAKE_STORY), { status: 200 }),
      );

    const { result } = renderHook(() => usePRPanel(), { wrapper: wrap });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    expect(result.current.currentStoryId).toBe('pr-22');
  });

  it('opens commit stories via the same panel', async () => {
    const commitStory = {
      ...FAKE_STORY,
      id: 'commit-08d7a04',
      kind: 'direct-push' as const,
      sha: '08d7a04e52e0deb6990d6f167457b4f851c8be80',
      prNumber: undefined,
      prUrl: undefined,
      prTitle: undefined,
      mergedAt: undefined,
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(commitStory), { status: 200 }),
      );

    const { result } = renderHook(() => usePRPanel(), { wrapper: wrap });
    act(() => result.current.openPanel('commit-08d7a04'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.story?.kind).toBe('direct-push');
    expect(window.location.search).toContain('story=commit-08d7a04');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/data/stories/commit-08d7a04.json'),
    );
  });

  it('closePanel flips isClosing and clears state after the close window', async () => {
    vi.useFakeTimers();
    vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(FAKE_STORY), { status: 200 }),
      );

    const { result } = renderHook(() => usePRPanel(), { wrapper: wrap });

    act(() => result.current.openPanel('pr-22'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => result.current.closePanel());
    expect(result.current.isClosing).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(260);
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isClosing).toBe(false);
    expect(window.location.search).not.toContain('story=');

    vi.useRealTimers();
  });

  it('locks body scroll while open and restores window.scrollY on close', async () => {
    vi.useFakeTimers();
    vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(FAKE_STORY), { status: 200 }),
      );

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 420,
    });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    const { result } = renderHook(() => usePRPanel(), { wrapper: wrap });
    act(() => result.current.openPanel('pr-22'));

    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-420px');

    act(() => result.current.closePanel());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(260);
    });

    expect(document.body.style.position).toBe('');
    expect(scrollTo).toHaveBeenCalledWith(0, 420);

    vi.useRealTimers();
  });

  it('renders children unchanged', () => {
    const { getByText } = render(
      <PRPanelProvider>
        <p>hi</p>
      </PRPanelProvider>,
    );
    expect(getByText('hi')).toBeTruthy();
  });

  it('syncs with URL on back/forward navigation (popstate)', async () => {
    vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(FAKE_STORY), { status: 200 }),
      );

    const { result } = renderHook(() => usePRPanel(), { wrapper: wrap });

    expect(result.current.isOpen).toBe(false);

    // Simulate navigation to ?story=pr-22
    window.history.replaceState(null, '', '/?story=pr-22');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    expect(result.current.currentStoryId).toBe('pr-22');
  });

  it('handles close/open race: new openPanel cancels pending close', async () => {
    vi.useFakeTimers();
    const story22 = { ...FAKE_STORY, id: 'pr-22', prNumber: 22 };
    const story33 = { ...FAKE_STORY, id: 'pr-33', prNumber: 33 };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('pr-22.json')) {
          return Promise.resolve(
            new Response(JSON.stringify(story22), { status: 200 }),
          );
        }
        if (typeof url === 'string' && url.includes('pr-33.json')) {
          return Promise.resolve(
            new Response(JSON.stringify(story33), { status: 200 }),
          );
        }
        return Promise.reject(new Error('Not found'));
      });

    const { result } = renderHook(() => usePRPanel(), { wrapper: wrap });

    // Open panel for PR 22
    act(() => result.current.openPanel('pr-22'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Close the panel
    act(() => result.current.closePanel());
    expect(result.current.isClosing).toBe(true);

    // Before the close timer elapses, open panel for PR 33
    act(() => result.current.openPanel('pr-33'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Advance timers past the original close timeout (250ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // Panel should remain open for PR 33
    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentStoryId).toBe('pr-33');
    expect(result.current.isClosing).toBe(false);

    vi.useRealTimers();
  });
});
