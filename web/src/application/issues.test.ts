import { afterEach, expect, test } from 'vite-plus/test';
import type { Issue } from '../types.ts';
import { projectIssue, resetIssueProjection, updateIssue } from './issues.ts';

const issue = {
  identifier: 'ISS-1',
  title: 'Original',
  status: 'todo',
  updatedAt: '2026-09-18T10:00:00Z',
} as Issue;
afterEach(resetIssueProjection);

test('confirmed writes survive an older read with the same timestamp without replacing unrelated drafts', async () => {
  await updateIssue(issue.identifier, { status: 'done' }, async () => ({
    ...issue,
    status: 'done',
  }));
  expect(projectIssue(issue).status).toBe('done');
  expect(projectIssue({ ...issue, title: 'Draft' }).title).toBe('Draft');
  const newer = { ...issue, status: 'canceled', updatedAt: '2026-09-18T10:00:01Z' } as Issue;
  expect(projectIssue(newer)).toBe(newer);
});

test('a rejected write restores the confirmed same-second projection', async () => {
  await updateIssue(issue.identifier, { status: 'done' }, async () => ({
    ...issue,
    status: 'done',
  }));
  await expect(
    updateIssue(issue.identifier, { status: 'canceled' }, async () => {
      throw new Error('failed');
    }),
  ).rejects.toThrow('failed');
  expect(projectIssue(issue).status).toBe('done');
});
