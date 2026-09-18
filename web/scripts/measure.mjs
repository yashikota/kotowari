import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const issues = Array.from({ length: 5000 }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  identifier: `ISS-${i + 1}`,
  title: `Performance issue ${i + 1}`,
  status: 'todo',
  priority: 0,
  labels: [],
  adrNumbers: [],
  depth: 0,
  sortOrder: i,
  body: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}));
let requests = 0;
await page.route('**/api/**', async (route) => {
  requests++;
  const path = new URL(route.request().url()).pathname;
  const body =
    path === '/api/issues'
      ? issues
      : path.match(/^\/api\/issues\/ISS-\d+$/)
        ? issues[Number(path.split('-').at(-1)) - 1]
        : path === '/api/workspace'
          ? { name: 'Benchmark', timezone: 'UTC' }
          : path === '/api/revision'
            ? { revision: '1' }
            : path.includes('/documents/')
              ? { body: '# Benchmark', revision: '1' }
              : [];
  await route.fulfill({ json: body });
});
const start = performance.now();
await page.goto(process.env.MEASURE_URL ?? 'http://127.0.0.1:7741/issues');
await page.getByRole('listbox', { name: 'Issues' }).waitFor();
const ready = performance.now() - start;
const rows = await page.getByRole('listbox', { name: 'Issues' }).getByRole('option').count();
const navStart = performance.now();
await page.getByRole('link', { name: 'Board', exact: true }).click();
await page.getByRole('heading', { name: 'Board', exact: true }).waitFor();
const navigation = performance.now() - navStart;
console.log(
  JSON.stringify({
    readyMs: Math.round(ready),
    navigationMs: Math.round(navigation),
    issueRows: rows,
    requests,
    domNodes: await page.locator('*').count(),
  }),
);
await browser.close();
