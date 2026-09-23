import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(web, '..');
const source = resolve(web, 'dist');
const target = resolve(web, '../internal/webembed/dist');

if (!existsSync(source)) throw new Error('Build web/dist before copying the embedded assets');
if (!target.startsWith(`${root}${sep}`) || target === root)
  throw new Error('Embedded asset output must stay inside the project');

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
