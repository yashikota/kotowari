import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const home = process.env.E2E_KOTOWARI_HOME ?? mkdtempSync(join(tmpdir(), 'kotowari-e2e-'));
const env = { ...process.env, KOTOWARI_HOME: home };
const configuredBin = process.env.E2E_KOTOWARI_BIN;
const bin = configuredBin
  ? (process.platform === 'win32'
      ? [resolve(`${configuredBin}.exe`), resolve(configuredBin)]
      : [resolve(configuredBin), resolve(`${configuredBin}.exe`)]
    ).find(existsSync)
  : undefined;
if (configuredBin && !bin) throw new Error(`E2E binary not found: ${configuredBin}`);
const command = bin ?? 'go';
const args = bin ? [] : ['run', '.'];

if (!existsSync(join(home, 'workspace.toml'))) {
  const initialized = spawnSync(command, [...args, 'init'], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  if (initialized.error) throw initialized.error;
  if (initialized.status !== 0) process.exit(initialized.status ?? 1);
}

const child = spawn(
  command,
  [
    ...args,
    'serve',
    '--fg',
    '--strict-port',
    '--addr',
    `127.0.0.1:${process.env.E2E_PORT ?? '5108'}`,
  ],
  { cwd: root, env, stdio: 'inherit' },
);

child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
