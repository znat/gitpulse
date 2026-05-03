import { describe, it, expect } from 'vitest';
import { pMap } from './pmap.ts';

describe('pMap', () => {
  it('preserves input order in the result regardless of completion order', async () => {
    const input = [50, 10, 30, 20, 40];
    const result = await pMap(input, 3, async (n) => {
      await new Promise((resolve) => setTimeout(resolve, n));
      return n * 2;
    });
    expect(result).toEqual([100, 20, 60, 40, 80]);
  });

  it('respects the concurrency cap', async () => {
    let inflight = 0;
    let peak = 0;
    const input = Array.from({ length: 20 }, (_, i) => i);
    await pMap(input, 4, async (i) => {
      inflight++;
      peak = Math.max(peak, inflight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inflight--;
      return i;
    });
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('returns an empty array for empty input', async () => {
    const result = await pMap([], 5, async () => 'never');
    expect(result).toEqual([]);
  });

  it('clamps concurrency to at least 1', async () => {
    const input = [1, 2, 3];
    const result = await pMap(input, 0, async (n) => n + 100);
    expect(result).toEqual([101, 102, 103]);
  });

  it('clamps concurrency to the input length when smaller', async () => {
    let peak = 0;
    let inflight = 0;
    const input = [1, 2];
    await pMap(input, 100, async (n) => {
      inflight++;
      peak = Math.max(peak, inflight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inflight--;
      return n;
    });
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('propagates errors thrown by the worker', async () => {
    await expect(
      pMap([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      }),
    ).rejects.toThrow('boom');
  });

  it('passes the index as the second argument', async () => {
    const result = await pMap(['a', 'b', 'c'], 2, async (item, i) => `${i}:${item}`);
    expect(result).toEqual(['0:a', '1:b', '2:c']);
  });
});
