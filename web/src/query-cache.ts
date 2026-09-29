type Entry = { value: unknown; expires: number };
export class QueryCache {
  private entries = new Map<string, Entry>();
  private pending = new Map<string, Promise<unknown>>();
  private generation = 0;
  private ttl: number;
  private limit: number;
  constructor(ttl = 30_000, limit = 256) {
    this.ttl = ttl;
    this.limit = limit;
  }

  read<T>(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached && cached.expires > Date.now()) return Promise.resolve(cached.value as T);
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<T>;
    const generation = this.generation;
    const promise = load()
      .then((value) => {
        if (generation === this.generation) {
          this.entries.delete(key);
          this.entries.set(key, { value, expires: Date.now() + this.ttl });
          if (this.entries.size > this.limit)
            this.entries.delete(this.entries.keys().next().value!);
        }
        return value;
      })
      .finally(() => {
        if (this.pending.get(key) === promise) this.pending.delete(key);
      });
    this.pending.set(key, promise);
    return promise;
  }

  peek<T>(key: string): T | undefined {
    return this.entries.get(key)?.value as T | undefined;
  }
  invalidate(prefix = '/api/') {
    this.generation++;
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key);
    // Detach older reads; they may finish for their caller, but cannot repopulate the cache.
    this.pending.clear();
  }
}
export const queryCache = new QueryCache();
