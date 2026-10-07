import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

test('contrast measurement includes group opacity and skips clipped text', async ({ page }) => {
  await page.setContent(`<main id="sample" style="background:white;color:black">
    <div style="opacity:.4"><span>Faint text</span></div>
    <div style="height:20px;overflow:hidden"><div style="margin-top:40px;color:#aaa">Clipped text</div></div>
    <div style="background:rgba(0,0,0,.1)"><span style="color:black">Readable text</span></div>
  </main>`);
  const failures = await contrastFailures(page, '#sample');
  expect(failures).toHaveLength(1);
  expect(failures[0]!.text).toBe('Faint text');
  expect(failures[0]!.ratio).toBeLessThan(4.5);
});

test('contrast measurement checks keyboard focus on buttons and links', async ({ page }) => {
  await page.setContent(`<main id="sample" style="background:white;color:black">
    <button style="background:white;color:black;outline:2px solid #ddd"><span>Action</span></button>
    <a href="#sample" style="color:black;outline:2px solid #ddd">Destination</a>
  </main>`);
  for (const role of ['button', 'link'] as const) {
    await page.getByRole(role).focus();
    const failures = await contrastFailures(page, '#sample');
    expect(failures).toHaveLength(1);
    expect(failures[0]!.text).toBe('Keyboard focus');
    expect(failures[0]!.ratio).toBeLessThan(3);
  }
});
