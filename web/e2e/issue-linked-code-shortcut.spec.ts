import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __openedIssueLinks?: string[];
  }
}

test('O then G opens the linked pull request and GitHub issues, but never while typing', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    const storageKey = 'kotowari.e2e.opened-issue-links';
    const opened = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]') as string[];
    Object.defineProperty(window, '__openedIssueLinks', { configurable: true, get: () => opened });
    window.open = ((url?: string | URL) => {
      opened.push(String(url));
      sessionStorage.setItem(storageKey, JSON.stringify(opened));
      return null;
    }) as typeof window.open;
  });

  const created = await request.post('/api/issues', {
    data: { title: `Open linked code ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  const linkedIssueURL = 'https://github.com/example/repo/issues/12';
  const pullRequestURL = 'https://github.com/example/repo/pull/42';

  for (const link of [
    { url: linkedIssueURL, title: 'Tracked GitHub issue', kind: 'link' },
    { url: pullRequestURL, title: 'Review build', kind: 'pullRequest' },
  ]) {
    const response = await request.post(`/api/issues/${issue.identifier}/links`, { data: link });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto(`/issues/${issue.identifier}`);
  const note = page.getByRole('textbox', { name: 'New note' });
  await note.fill('og');
  await page.keyboard.press('o');
  await page.keyboard.press('g');
  await expect.poll(() => page.evaluate(() => window.__openedIssueLinks)).toEqual([]);

  await note.fill('');
  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('o');
  await page.keyboard.press('g');
  await expect.poll(() => page.evaluate(() => window.__openedIssueLinks)).toEqual([pullRequestURL]);

  const githubIssueOnly = await request.post('/api/issues', {
    data: { title: `Open linked GitHub issue ${Date.now()}`, status: 'todo' },
  });
  expect(githubIssueOnly.ok()).toBeTruthy();
  const secondIssue = (await githubIssueOnly.json()) as { identifier: string };
  const issueLink = await request.post(`/api/issues/${secondIssue.identifier}/links`, {
    data: { url: linkedIssueURL, title: 'Tracked issue', kind: 'link' },
  });
  expect(issueLink.ok()).toBeTruthy();

  await page.goto(`/issues/${secondIssue.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('o');
  await page.keyboard.press('g');
  await expect
    .poll(() => page.evaluate(() => window.__openedIssueLinks))
    .toEqual([pullRequestURL, linkedIssueURL]);

  await page.keyboard.press('?');
  const shortcutHelp = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(shortcutHelp).toContainText('O, then G');
  await expect(shortcutHelp).toContainText('Open a linked GitHub issue or pull request');
});
