import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const entity of ['issue', 'project'] as const) {
    for (const intent of ['stay', 'save'] as const) {
      test(`${entity} deletion and unsaved navigation share one dialog for ${intent} in ${scheme}`, async ({
        page,
        request,
      }, testInfo) => {
        const stamp = `delete-navigation-${entity}-${intent}-${Date.now()}`;
        const next = `${stamp}-next`;
        const issue =
          entity === 'issue'
            ? await (await request.post('/api/issues', { data: { title: stamp } })).json()
            : null;
        if (entity === 'project') {
          expect(
            (await request.post('/api/projects', { data: { slug: next, name: next } })).ok(),
          ).toBeTruthy();
          expect(
            (
              await request.post('/api/projects', {
                data: {
                  slug: stamp,
                  name: stamp,
                  dependencies: [{ projectSlug: next, kind: 'related' }],
                },
              })
            ).ok(),
          ).toBeTruthy();
        }
        const key = issue?.identifier ?? stamp;
        const apiPath = `/api/${entity === 'issue' ? 'issues' : 'projects'}/${key}`;
        let allowSave = false;
        let writes = 0;
        let deletes = 0;
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route(`**${apiPath}`, async (route) => {
          if (route.request().method() === 'PATCH') {
            writes++;
            if (!allowSave)
              return route.fulfill({ status: 503, json: { error: 'Draft write unavailable' } });
          }
          if (route.request().method() === 'DELETE') {
            deletes++;
            await gate;
            return route.fulfill({ status: 503, json: { error: 'Deletion unavailable' } });
          }
          return route.continue();
        });
        await page.addInitScript(
          (color) => localStorage.setItem('kotowari.color-scheme', color),
          scheme,
        );
        try {
          if (entity === 'issue') {
            await page.goto('/issues');
            const find = page.getByRole('textbox', { name: en.ui.findIssues, exact: true });
            if (!(await find.isVisible()))
              await page.getByRole('button', { name: en.ui.findIssues, exact: true }).click();
            await find.fill(stamp);
            await page.getByRole('listbox').getByRole('option').filter({ hasText: stamp }).click();
          } else {
            await page.goto(`/projects/${next}`);
            await page.getByRole('link', { name: stamp, exact: true }).click();
          }
          await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', scheme);
          const text = page.getByRole('textbox', {
            name: entity === 'issue' ? en.ui.issueTitle : en.ui.projectSummary,
            exact: true,
          });
          await text.fill('Retained changed draft');
          if (entity === 'issue') await text.press('Tab');
          else await page.getByRole('heading').filter({ hasText: stamp }).click();
          await expect(page.getByRole('alert')).toContainText('Draft write unavailable');
          const options = page.getByRole('button', {
            name: entity === 'issue' ? en.issueActions.button : en.issueActions.moreActions,
            exact: true,
          });
          await options.click();
          await page
            .getByRole('menuitem', {
              name: entity === 'issue' ? en.issueActions.delete : en.ui.delete,
              exact: true,
            })
            .click();
          const removalLabels = entity === 'issue' ? en.issueDeletion : en.projectDeletion;
          const navigationLabels = entity === 'issue' ? en.unsavedTitle : en.unsavedProject;
          const removal = page.getByRole('dialog', { name: removalLabels.title, exact: true });
          await removal
            .getByRole('button', {
              name: entity === 'issue' ? en.issueActions.delete : en.ui.delete,
              exact: true,
            })
            .click();
          await expect.poll(() => deletes).toBe(1);
          await page.evaluate(() => history.back());
          const navigation = page.getByRole('dialog', {
            name: navigationLabels.title,
            exact: true,
          });
          const save = navigation.getByRole('button', { name: navigationLabels.save, exact: true });
          await expect(page.getByRole('dialog')).toHaveCount(1);
          await expect(navigation.getByRole('status')).toContainText(removalLabels.deleting);
          await expect(save).toBeDisabled();
          await expect(
            navigation.getByRole('button', { name: navigationLabels.discard, exact: true }),
          ).toBeDisabled();
          await expect(
            navigation.getByRole('button', { name: navigationLabels.stay, exact: true }),
          ).toBeFocused();
          expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
          await page.screenshot({ path: testInfo.outputPath('deletion-navigation-pending.png') });
          expect(writes).toBe(1);
          if (intent === 'stay') {
            await navigation
              .getByRole('button', { name: navigationLabels.stay, exact: true })
              .click();
            await expect(navigation).toHaveCount(0);
            await expect(page.getByRole('dialog')).toHaveCount(1);
            await expect(removal.getByRole('status')).toContainText(removalLabels.deleting);
            release();
            const retry = removal.getByRole('button', { name: removalLabels.retry, exact: true });
            await expect(retry).toBeFocused();
            await removal.getByRole('button', { name: en.common.cancel, exact: true }).click();
            await expect(text).toHaveValue('Retained changed draft');
            await expect(options).toBeFocused();
            expect(writes).toBe(1);
          } else {
            release();
            await expect(save).toBeEnabled();
            allowSave = true;
            await save.click();
            if (entity === 'issue') await expect(page).toHaveURL(/\/issues(?:\?|$)/);
            else await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
            const stored = await (await request.get(apiPath)).json();
            expect(entity === 'issue' ? stored.title : stored.summary).toBe(
              'Retained changed draft',
            );
            expect(writes).toBe(2);
            await expect(page.getByRole('dialog')).toHaveCount(0);
          }
          expect(deletes).toBe(1);
        } finally {
          release();
          await request.delete(apiPath);
          if (entity === 'project') await request.delete(`/api/projects/${next}`);
        }
      });
    }
  }
}
