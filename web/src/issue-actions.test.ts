import { describe, expect, it } from 'vite-plus/test';
import { issueBranchName, issueMarkdown, issuePrompt } from './issue-actions.ts';
import type { Issue } from './types.ts';

const sample: Issue = {
  id: 4,
  number: 4,
  identifier: 'KOT-4',
  title: 'Improve issue navigation',
  body: 'Keep issue context visible.',
  status: 'in_progress',
  priority: 2,
  type: 'improvement',
  estimate: 5,
  projectId: 1,
  projectSlug: 'navigation',
  milestoneId: null,
  milestoneName: null,
  cycleId: null,
  cycleNumber: 3,
  parentId: null,
  depth: 0,
  dueDate: '2026-10-02',
  reminderAt: null,
  sortOrder: 4,
  labels: [{ id: 1, name: 'frontend', color: '#000000' }],
  adrNumbers: [],
  externalLinks: [
    { id: 1, url: 'https://example.test/guide', title: 'Guide', kind: 'document', createdAt: '' },
  ],
  relations: [{ id: 1, kind: 'blocks', targetIdentifier: 'KOT-5' }],
  isFavorite: false,
  createdAt: '',
  updatedAt: '',
  completedAt: null,
};

describe('issue actions', () => {
  it('creates branch-friendly names and preserves identifiers for non-Latin titles', () => {
    expect(issueBranchName(sample)).toBe('kot-4-improve-issue-navigation');
    expect(issueBranchName({ ...sample, title: '日本語だけ' })).toBe('kot-4');
  });

  it('copies an issue as concise or complete Markdown', () => {
    expect(issueMarkdown(sample, 'https://kotowari.test/issues/KOT-4')).toBe(
      '# KOT-4 Improve issue navigation\n\nKeep issue context visible.\n',
    );
    const complete = issueMarkdown(sample, 'https://kotowari.test/issues/KOT-4', true);
    expect(complete).toContain('Status: in_progress');
    expect(complete).toContain('Labels: frontend');
    expect(complete).toContain('- [Guide](https://example.test/guide) (document)');
    expect(complete).toContain('- blocks: KOT-5');
  });

  it('creates a self-contained coding prompt', () => {
    expect(issuePrompt(sample)).toContain('Work on Linear issue KOT-4:');
    expect(issuePrompt(sample)).toContain('Suggested branch name: kot-4-improve-issue-navigation');
    expect(issuePrompt(sample)).toContain('Keep issue context visible.');
    expect(issuePrompt(sample)).toContain('Due date: 2026-10-02');
  });
});
