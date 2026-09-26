import { describe, expect, it } from 'vite-plus/test';
import { listLinkedPullRequests } from './reviews.ts';

describe('listLinkedPullRequests', () => {
  it('keeps only pull requests and carries their issue context', () => {
    expect(
      listLinkedPullRequests([
        {
          identifier: 'ISS-1',
          title: 'Ship search',
          status: 'in_progress',
          externalLinks: [
            {
              id: 1,
              url: 'https://github.com/example/repo/pull/1',
              title: '  Search implementation  ',
              kind: 'pullRequest',
              createdAt: '2026-09-01T10:00:00Z',
            },
            {
              id: 2,
              url: 'https://example.com/spec',
              title: 'Specification',
              kind: 'link',
              createdAt: '2026-09-02T10:00:00Z',
            },
          ],
        },
      ]),
    ).toEqual([
      {
        issueIdentifier: 'ISS-1',
        issueTitle: 'Ship search',
        issueStatus: 'in_progress',
        linkId: 1,
        title: 'Search implementation',
        url: 'https://github.com/example/repo/pull/1',
        createdAt: '2026-09-01T10:00:00Z',
      },
    ]);
  });

  it('sorts newest linked pull requests first and falls back to the URL as a title', () => {
    expect(
      listLinkedPullRequests([
        {
          identifier: 'ISS-1',
          title: 'Older issue',
          status: 'todo',
          externalLinks: [
            {
              id: 1,
              url: 'https://github.com/example/repo/pull/1',
              kind: 'pullRequest',
              createdAt: '2026-08-01T10:00:00Z',
            },
          ],
        },
        {
          identifier: 'ISS-2',
          title: 'Newer issue',
          status: 'backlog',
          externalLinks: [
            {
              id: 2,
              url: 'https://github.com/example/repo/pull/2',
              kind: 'pullRequest',
              createdAt: '2026-09-01T10:00:00Z',
            },
          ],
        },
      ]).map(({ issueIdentifier, title }) => ({ issueIdentifier, title })),
    ).toEqual([
      { issueIdentifier: 'ISS-2', title: 'https://github.com/example/repo/pull/2' },
      { issueIdentifier: 'ISS-1', title: 'https://github.com/example/repo/pull/1' },
    ]);
  });
});
