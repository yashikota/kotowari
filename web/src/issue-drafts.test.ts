import { describe, expect, it } from 'vite-plus/test';
import { parseIssueDrafts } from './issue-drafts.ts';

describe('issue drafts', () => {
  it('ignores malformed, incomplete, and blank drafts', () => {
    expect(parseIssueDrafts('{')).toEqual([]);
    expect(
      parseIssueDrafts(JSON.stringify([{ id: 'missing-title' }, null, { title: '   ' }])),
    ).toEqual([]);
  });

  it('validates stored fields and sorts drafts by most recently updated', () => {
    const drafts = parseIssueDrafts(
      JSON.stringify([
        { id: 'older', title: 'Older', updatedAt: '2026-01-01T00:00:00.000Z' },
        {
          id: 'newer',
          title: '  Newer  ',
          updatedAt: '2026-01-02T00:00:00.000Z',
          status: 'custom-in-progress',
          skipDefaultTemplate: true,
          priority: 2,
          assignee: 'self',
          type: 'feature',
          estimate: '3',
          labelNames: ['bug', 4],
          externalLinks: [
            { url: 'https://example.com/pull/1', kind: 'pullRequest' },
            { url: 'invalid', kind: 'unknown' },
          ],
          recurringOpen: true,
          recurringUnit: 'month',
        },
      ]),
    );

    expect(drafts.map((draft) => draft.id)).toEqual(['newer', 'older']);
    expect(drafts[0]).toMatchObject({
      title: 'Newer',
      skipDefaultTemplate: true,
      status: 'custom-in-progress',
      priority: 2,
      assignee: 'self',
      type: 'feature',
      estimate: '3',
      labelNames: ['bug'],
      externalLinks: [{ url: 'https://example.com/pull/1', kind: 'pullRequest' }],
      recurringOpen: true,
      recurringUnit: 'month',
    });
    expect(drafts[1]).toMatchObject({
      body: '',
      skipDefaultTemplate: false,
      status: 'todo',
      priority: 0,
      labelNames: [],
      recurringInterval: '1',
    });
  });
});
