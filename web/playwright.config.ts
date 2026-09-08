import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env.CI);
process.env.E2E_KOTOWARI_HOME ??= mkdtempSync(join(tmpdir(), 'kotowari-e2e-'));
process.env.KOTOWARI_ACP_COMMAND = JSON.stringify([process.execPath, resolve('e2e/acp-agent.mjs')]);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: ci,
  retries: ci ? 2 : 0,
  workers: 1,
  reporter: ci ? [['github'], ['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:7730',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'sh e2e/serve.sh',
    url: 'http://127.0.0.1:7730',
    reuseExistingServer: !ci,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
