import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const localeDirectory = path.resolve(process.cwd(), 'src', 'i18n', 'locales');
const localeFiles = ['en.json', 'ja.json'];

async function readLocale(fileName) {
  return JSON.parse(await readFile(path.join(localeDirectory, fileName), 'utf8'));
}

function collectKeys(value, prefix = '', keys = new Set()) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return keys;

  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.add(fullKey);
    collectKeys(child, fullKey, keys);
  }

  return keys;
}

const pluralForms = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

function normalizePluralKey(key) {
  const separator = key.lastIndexOf('.');
  const prefix = separator === -1 ? '' : key.slice(0, separator + 1);
  const leaf = key.slice(separator + 1);
  const suffix = leaf.lastIndexOf('_');
  if (suffix === -1 || !pluralForms.has(leaf.slice(suffix + 1))) return key;
  return `${prefix}${leaf.slice(0, suffix)}`;
}

function compareKeys(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

const [en, ja] = await Promise.all(localeFiles.map(readLocale));
const enKeys = new Set([...collectKeys(en)].map(normalizePluralKey));
const jaKeys = new Set([...collectKeys(ja)].map(normalizePluralKey));
const onlyInEn = [...enKeys].filter((key) => !jaKeys.has(key)).sort(compareKeys);
const onlyInJa = [...jaKeys].filter((key) => !enKeys.has(key)).sort(compareKeys);

if (onlyInEn.length === 0 && onlyInJa.length === 0) {
  console.log(`Locale keys match (${enKeys.size} keys).`);
} else {
  console.error('Locale key mismatch between src/i18n/locales/en.json and ja.json:');
  if (onlyInEn.length > 0) {
    console.error(`Only in en.json (${onlyInEn.length}):`);
    for (const key of onlyInEn) console.error(`  ${key}`);
  }
  if (onlyInJa.length > 0) {
    console.error(`Only in ja.json (${onlyInJa.length}):`);
    for (const key of onlyInJa) console.error(`  ${key}`);
  }
  process.exitCode = 1;
}
