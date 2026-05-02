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

    act(() => result.current.openPanel(22));

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.story).toBeNull();
    expect(window.location.search).toContain('pull=22');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.story?.headline).toBe('Test headline');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/data/stories/pr-22.json'),
    );
  });

  it('?pull=N on mount auto-opens', async () => {
    window.history.replaceState(null, '', '/?pull=22');
    vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(FAKE_STORY), { status: 200 }),
      );

    const { result } = renderHook(() => usePRPanel(), { wrapper: wrap });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    expect(result.current.currentPrNumber).toBe(22);
  });

  it('closePanel flips isClosing and clears state after the close window', async () => {
    vi.useFakeTimers();
    vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(FAKE_STORY), { status: 200 }),
      );

    const { result } = renderHook(() => usePRPanel(), { wrapper: wrap });

    act(() => result.current.openPanel(22));
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
    expect(window.location.search).not.toContain('pull=');

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
    act(() => result.current.openPanel(22));

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
});
