import { mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT ?? '5108';
const ci = Boolean(process.env.CI);
const chromiumExecutable = process.env.E2E_CHROMIUM_EXECUTABLE;
process.env.E2E_KOTOWARI_HOME ??= mkdtempSync(join(tmpdir(), 'kotowari-e2e-'));
process.env.KOTOWARI_ACP_COMMAND = JSON.stringify([
  process.execPath,
  fileURLToPath(new URL('./e2e/acp-agent.mjs', import.meta.url)),
]);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: ci,
  retries: ci ? 2 : 0,
  workers: 1,
  reporter: ci ? [['github'], ['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumExecutable ? { executablePath: chromiumExecutable } : undefined,
      },
    },
  ],
  webServer: {
    command: 'node e2e/serve.mjs',
    url: `http://127.0.0.1:${port}`,
    // The E2E server gets its own temporary KOTOWARI_HOME. Reusing a running
    // dev server would silently bypass that isolation and leave fixture data
    // in the user's workspace.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
