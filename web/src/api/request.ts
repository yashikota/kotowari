import { queryCache } from '../query-cache.ts';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, {
    ...init,
    headers,
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      if (!res.ok) {
        throw new Error(text.trim() || res.statusText);
      }
      throw new Error(`invalid response: ${text.slice(0, 120)}`);
    }
  }
  if (!res.ok) {
    const err = data as { error?: string } | null;
    throw new Error(err?.error ?? res.statusText);
  }
  return data as T;
}

export function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (!init?.method || init.method === 'GET')
    return queryCache.read(path, () => request<T>(path, init));
  queryCache.invalidate();
  return request<T>(path, init).finally(() => queryCache.invalidate());
}
