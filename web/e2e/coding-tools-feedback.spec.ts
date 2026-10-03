import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`coding tool storage failures preserve drafts and retry in ${scheme}`, async ({
    page,
  }, testInfo) => {
    const original = {
      customLinkEnabled: false,
      customLinkName: 'Original tool',
      customLinkURL: '',
      promptTemplate: 'Original stored prompt',
    };
    await page.addInitScript(
      ({ scheme, original }) => {
        localStorage.setItem('kotowari.color-scheme', scheme);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
        if (!localStorage.getItem('kotowari.coding-tools.v1'))
          localStorage.setItem('kotowari.coding-tools.v1', JSON.stringify(original));
        const globals = window as Window & {
          failCodingToolSaves?: boolean;
          codingToolWrites?: number;
        };
        globals.failCodingToolSaves = true;
        globals.codingToolWrites = 0;
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'kotowari.coding-tools.v1') {
            globals.codingToolWrites!++;
            if (globals.failCodingToolSaves)
              throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
          }
          return setItem.call(this, key, value);
        };
      },
      { scheme, original },
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/config');
    const section = page.getByRole('region', { name: 'Coding tools', exact: true });
    const enabled = section.getByLabel('Enable custom web tool');
    const name = section.getByLabel('Tool name', { exact: true });
    const url = section.getByLabel('Custom link URL', { exact: true });
    const prompt = section.getByLabel('Prompt template');
    await expect(name).toBeDisabled();
    await expect(url).toBeDisabled();
    await enabled.check();
    const nextName = `  Task agent with a long readable tool name ${Date.now()}  `;
    const nextURL = 'https://agent.example/open?prompt={{prompt}}&issue={{issue.identifier}}';
    const nextPrompt = 'Plan {{issue.identifier}}: {{issue.title}}\n{{context}}\n'.repeat(100);
    await name.fill(nextName);
    await url.fill(nextURL);
    await prompt.fill(nextPrompt);
    const save = section.getByRole('button', { name: 'Save coding tools', exact: true });
    await save.click();
    const alert = section.getByRole('alert');
    await expect(alert).toContainText('Coding tool settings could not be saved');
    await expect(alert).toContainText('Your edits have been kept.');
    await expect(section.getByRole('status')).toHaveCount(0);
    await expect(name).toHaveValue(nextName);
    await expect(url).toHaveValue(nextURL);
    await expect(prompt).toHaveValue(nextPrompt);
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('kotowari.coding-tools.v1')!)),
    ).toEqual(original);
    await page.evaluate(() =>
      window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated-preference' })),
    );
    await expect(name).toHaveValue(nextName);
    await expect(prompt).toHaveValue(nextPrompt);
    const retry = alert.getByRole('button', { name: 'Retry saving', exact: true });
    await retry.focus();
    await page.screenshot({ path: testInfo.outputPath('coding-tools-storage-failure.png') });
    const bounds = await prompt.boundingBox();
    expect(bounds?.height).toBeLessThan(360);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.evaluate(() => {
      (window as Window & { failCodingToolSaves: boolean }).failCodingToolSaves = false;
    });
    await retry.press('Enter');
    await expect(alert).toHaveCount(0);
    await expect(section.getByRole('status')).toHaveText('Coding tool settings saved locally.');
    await expect(save).toBeFocused();
    const confirmed = await page.evaluate(() => ({
      value: JSON.parse(localStorage.getItem('kotowari.coding-tools.v1')!),
      writes: (window as Window & { codingToolWrites: number }).codingToolWrites,
    }));
    expect(confirmed.writes).toBe(2);
    expect(confirmed.value).toEqual({
      customLinkEnabled: true,
      customLinkName: nextName.trim(),
      customLinkURL: nextURL,
      promptTemplate: nextPrompt,
    });
    await page.reload();
    await expect(name).toHaveValue(nextName.trim());
    await expect(prompt).toHaveValue(nextPrompt);
    await name.fill('A newer unsaved name');
    await expect(section.getByRole('status')).toHaveCount(0);
  });

  test(`coding tool validation identifies each field and restores focus in ${scheme}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((value) => {
      localStorage.setItem('kotowari.color-scheme', value);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      localStorage.removeItem('kotowari.coding-tools.v1');
    }, scheme);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/config');
    const section = page.getByRole('region', { name: 'Coding tools', exact: true });
    const enabled = section.getByLabel('Enable custom web tool');
    const url = section.getByLabel('Custom link URL', { exact: true });
    const prompt = section.getByLabel('Prompt template');
    await expect(prompt).toHaveValue(/Work on Kotowari issue/);
    await enabled.check();
    await url.fill('javascript:alert(1)');
    await prompt.fill('   ');
    const save = section.getByRole('button', { name: 'Save coding tools', exact: true });
    await save.click();
    await expect(url).toHaveAttribute('aria-invalid', 'true');
    await expect(prompt).toHaveAttribute('aria-invalid', 'true');
    await expect(url).toBeFocused();
    const contrast = await section
      .getByText('Prompt template cannot be empty.', { exact: true })
      .evaluate((error) => {
        const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        let ancestor: Element | null = error;
        let background = 'rgb(255, 255, 255)';
        while (ancestor) {
          const value = getComputedStyle(ancestor).backgroundColor;
          if (value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') {
            background = value;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        const luminance = (color: number[]) =>
          color
            .map((component) => {
              const value = component / 255;
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            })
            .reduce(
              (sum, component, index) => sum + component * [0.2126, 0.7152, 0.0722][index]!,
              0,
            );
        const text = luminance(rgb(getComputedStyle(error).color));
        const surface = luminance(rgb(background));
        return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
      });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await expect(section.getByRole('alert')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('kotowari.coding-tools.v1'))).toBeNull();
    await page.screenshot({ path: testInfo.outputPath('coding-tools-validation.png') });
    await save.focus();
    await save.press('Enter');
    await expect(url).toBeFocused();
    await url.fill('https://agent.example/open?prompt={{prompt}}');
    await expect(url).not.toHaveAttribute('aria-invalid', 'true');
    await save.click();
    await expect(prompt).toBeFocused();
    await prompt.fill('Work on {{issue.identifier}}: {{context}}');
    await expect(prompt).not.toHaveAttribute('aria-invalid', 'true');
    await enabled.uncheck();
    await expect(url).toBeDisabled();
    await expect(url).toHaveValue('https://agent.example/open?prompt={{prompt}}');
    await save.click();
    await expect(section.getByRole('status')).toHaveText('Coding tool settings saved locally.');
    await enabled.check();
    await expect(url).toBeEnabled();
    await expect(section.getByRole('status')).toHaveCount(0);
  });
}
