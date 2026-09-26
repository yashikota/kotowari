import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { issueSubscriptions } from './issue-subscriptions.ts';

describe('issueSubscriptions', () => {
  afterEach(() =>
    issueSubscriptions.list().forEach((identifier) => issueSubscriptions.toggle(identifier)),
  );

  it('toggles and persists issue identifiers without duplicates', () => {
    expect(issueSubscriptions.toggle('ENBU-1')).toBe(true);
    expect(issueSubscriptions.toggle('ENBU-2')).toBe(true);
    expect(issueSubscriptions.toggle('ENBU-1')).toBe(false);
    expect(issueSubscriptions.list()).toEqual(['ENBU-2']);
    expect(issueSubscriptions.has('ENBU-2')).toBe(true);
  });

  it('notifies in-tab subscribers and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = issueSubscriptions.subscribe(listener);
    issueSubscriptions.toggle('ENBU-3');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    issueSubscriptions.toggle('ENBU-4');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
