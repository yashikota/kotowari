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

  it('sets several subscriptions idempotently with one notification', () => {
    const listener = vi.fn();
    const unsubscribe = issueSubscriptions.subscribe(listener);
    issueSubscriptions.setMany(['ENBU-5', 'ENBU-6', 'ENBU-5'], true);
    expect(issueSubscriptions.list()).toEqual(['ENBU-5', 'ENBU-6']);
    expect(listener).toHaveBeenCalledTimes(1);

    issueSubscriptions.setMany(['ENBU-5', 'ENBU-6'], true);
    expect(listener).toHaveBeenCalledTimes(1);
    issueSubscriptions.setMany(['ENBU-5', 'ENBU-6'], false);
    expect(issueSubscriptions.list()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
