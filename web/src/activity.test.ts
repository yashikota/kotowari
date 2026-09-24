import { beforeAll, describe, expect, it } from 'vite-plus/test';
import { formatActivity } from './activity.ts';
import i18n from './i18n/index.ts';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

describe('formatActivity', () => {
  it('describes a create', () => {
    expect(formatActivity('created', { identifier: 'ISS-1' })).toBe('Created ISS-1');
  });

  it('describes a status change', () => {
    expect(formatActivity('status_changed', { from: 'todo', to: 'done' })).toBe(
      'Status Todo → Done',
    );
  });

  it('describes issue type and estimate changes', () => {
    expect(formatActivity('type_changed', { from: '', to: 'feature' })).toBe(
      'Type No type → Feature',
    );
    expect(formatActivity('estimate_changed', { from: null, to: 8 })).toBe(
      'Estimate No estimate → 8',
    );
  });

  it('describes milestone changes', () => {
    expect(formatActivity('milestone_changed', { from: '', to: 'Beta' })).toBe(
      'Milestone No milestone → Beta',
    );
  });

  it('describes a note', () => {
    expect(formatActivity('commented', {})).toBe('Added a note');
  });

  it('describes external links with a URL fallback', () => {
    expect(formatActivity('link_added', { title: 'Build', url: 'https://ci.example.test' })).toBe(
      'Added link Build',
    );
    expect(formatActivity('link_removed', { url: 'https://ci.example.test' })).toBe(
      'Removed link https://ci.example.test',
    );
  });

  it('describes favorite changes', () => {
    expect(formatActivity('favorite_changed', { favorite: true })).toBe('Added to favorites');
    expect(formatActivity('favorite_changed', { favorite: false })).toBe('Removed from favorites');
  });

  it('describes archive and restore actions', () => {
    expect(formatActivity('archived', {})).toBe('Archived the issue');
    expect(formatActivity('unarchived', {})).toBe('Restored the issue');
  });

  it('describes reminder changes', () => {
    expect(formatActivity('reminder_changed', { from: '', to: '2026-09-25T00:30:00Z' })).toMatch(
      /^Set reminder for /,
    );
    expect(formatActivity('reminder_changed', { from: '2026-09-25T00:30:00Z', to: '' })).toBe(
      'Canceled reminder',
    );
  });

  it('describes issue relation changes', () => {
    expect(formatActivity('relation_added', { kind: 'blocks', target: 'ISS-2' })).toBe(
      'Added Blocks relation to ISS-2',
    );
    expect(formatActivity('relation_removed', { kind: 'related', target: 'ISS-1' })).toBe(
      'Removed Related to relation to ISS-1',
    );
  });

  it('falls back to the raw action', () => {
    expect(formatActivity('mystery', {})).toBe('mystery');
  });

  it('describes a create without an identifier', () => {
    expect(formatActivity('created', {})).toBe('Created');
  });

  it('passes through unknown status values', () => {
    expect(formatActivity('status_changed', { from: 'ready', to: 'shipped' })).toBe(
      'Status ready → shipped',
    );
  });
});
