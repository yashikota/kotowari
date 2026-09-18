import { describe, expect, it, vi } from 'vite-plus/test';
import { QueryCache } from './cache.ts';

describe('query cache', () => {
  it('shares an in-flight read and the result across consumers', async () => {
    const cache = new QueryCache();
    const load = vi.fn(async () => ({ name: 'workspace' }));
    const [a, b] = await Promise.all([
      cache.read('workspace', load),
      cache.read('workspace', load),
    ]);
    expect(a).toBe(b);
    expect(await cache.read('workspace', load)).toBe(a);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it('does not cache rejected reads', async () => {
    const cache = new QueryCache();
    await expect(cache.read('key', () => Promise.reject(new Error('offline')))).rejects.toThrow(
      'offline',
    );
    expect(await cache.read('key', async () => 'recovered')).toBe('recovered');
  });
  it('does not let a read started before a mutation overwrite fresh data', async () => {
    const cache = new QueryCache();
    let finish!: (value: string) => void;
    const stale = cache.read(
      'issue',
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    cache.invalidate('issue');
    expect(await cache.read('issue', async () => 'new')).toBe('new');
    finish('old');
    await stale;
    expect(cache.peek('issue')).toBe('new');
  });
  it('bounds retained results', async () => {
    const cache = new QueryCache(30_000, 2);
    for (const key of ['a', 'b', 'c']) await cache.read(key, async () => key);
    expect(cache.peek('a')).toBeUndefined();
    expect(cache.peek('c')).toBe('c');
  });
});
