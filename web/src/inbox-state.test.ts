import { describe, expect, it } from 'vite-plus/test';
import { DEFAULT_INBOX_STATE, parseInboxState, serializeInboxState } from './inbox-state.ts';

describe('personal inbox state', () => {
  it('uses safe defaults for absent, malformed, and outdated preferences', () => {
    expect(parseInboxState(null)).toEqual(DEFAULT_INBOX_STATE);
    expect(parseInboxState('{')).toEqual(DEFAULT_INBOX_STATE);
    expect(parseInboxState(JSON.stringify({ readIds: ['2'], density: 'spacious' }))).toEqual({
      ...DEFAULT_INBOX_STATE,
      readIds: [],
    });
  });

  it('normalizes persisted ids and keeps valid display preferences', () => {
    const parsed = parseInboxState(
      JSON.stringify({
        readIds: [8, 8, -1, '3'],
        archivedIds: [5, Number.MAX_SAFE_INTEGER + 1],
        density: 'compact',
        groupByDate: false,
      }),
    );
    expect(parsed).toEqual({
      readIds: [8],
      archivedIds: [5],
      density: 'compact',
      groupByDate: false,
    });
    expect(parseInboxState(serializeInboxState(parsed))).toEqual(parsed);
  });
});
