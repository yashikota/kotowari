import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

test('focus contrast uses the surface where the outline is painted', async ({ page }) => {
  await page.setContent(
    `<main id="sample" style="background:white"><button style="background:#3c478f;color:white;outline:2px solid black;outline-offset:2px">Action</button></main>`,
  );
  const button = page.getByRole('button');
  await button.focus();
  expect(await contrastFailures(page, '#sample')).toEqual([]);
  await button.evaluate((element) => (element.style.outlineOffset = '-2px'));
  expect((await contrastFailures(page, '#sample')).map((failure) => failure.text)).toEqual([
    'Keyboard focus',
  ]);
});

test('contrast measurement includes control icons, loaders and optionally disabled text', async ({
  page,
}) => {
  await page.setContent(`<style>.mantine-Loader-root::after {content:'';border:3px solid #ddd}</style>
    <main id="sample" style="background:white;color:black">
      <button style="background:white;color:#ddd"><svg width="20" height="20"><path stroke="currentColor" d="M0 0L20 20" /></svg></button>
      <span class="mantine-Loader-root" style="display:block;width:20px;height:20px"></span>
      <button disabled style="background:white;color:#ddd">Pending action</button>
    </main>`);
  expect((await contrastFailures(page, '#sample')).map((failure) => failure.text)).toEqual([
    'Control icon',
    'Loading indicator',
  ]);
  expect((await contrastFailures(page, '#sample', true)).map((failure) => failure.text)).toEqual([
    'Control icon',
    'Loading indicator',
    'Pending action',
  ]);
});

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
