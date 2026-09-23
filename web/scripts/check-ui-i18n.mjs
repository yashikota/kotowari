import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const sourceDirectory = path.resolve(process.cwd(), 'src');
const localeDirectory = path.resolve(sourceDirectory, 'i18n', 'locales');
const translatableAttributes = new Set([
  'alt',
  'aria-label',
  'caption',
  'description',
  'emptyMessage',
  'error',
  'helperText',
  'label',
  'placeholder',
  'title',
]);
const translatableProperties = new Set([
  'aria-label',
  'ariaLabel',
  'keywords',
  'label',
  'placeholder',
  'title',
]);
const nonCopyElements = new Set(['code', 'kbd', 'Kbd', 'Shortcut']);

function hasWords(value) {
  return /\p{L}{2}/u.test(value.trim());
}

function elementName(node) {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return '';
}

function isNonCopyElement(node) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      return nonCopyElements.has(elementName(current));
    }
    current = current.parent;
  }
  return false;
}

function stringValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node))
    return node.head.text + node.templateSpans.map((span) => span.literal.text).join('');
  return undefined;
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(entryPath);
      return /\.tsx?$/.test(entry.name) &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.test.tsx') &&
        entry.name !== 'demo-api.ts'
        ? [entryPath]
        : [];
    }),
  );
  return nested.flat();
}

const violations = [];
const missingTranslations = [];
const locales = new Map(
  await Promise.all(
    ['en', 'ja'].map(async (locale) => [
      locale,
      JSON.parse(await readFile(path.join(localeDirectory, `${locale}.json`), 'utf8')),
    ]),
  ),
);

function hasTranslation(locale, key) {
  let value = locale;
  for (const part of key.split('.')) value = value?.[part];
  if (value !== undefined) return true;
  return ['one', 'other', 'zero', 'two', 'few', 'many'].some((form) => {
    let plural = locale;
    const parts = key.split('.');
    const leaf = parts.pop();
    for (const part of parts) plural = plural?.[part];
    return plural?.[`${leaf}_${form}`] !== undefined;
  });
}

for (const filePath of await sourceFiles(sourceDirectory)) {
  const text = await readFile(filePath, 'utf8');
  const source = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const report = (node, value, kind) => {
    if (!hasWords(value) || isNonCopyElement(node)) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    violations.push(
      `${path.relative(process.cwd(), filePath)}:${line + 1}: ${kind} "${value.trim()}"`,
    );
  };

  function visit(node) {
    if (ts.isJsxText(node)) report(node, node.text, 'JSX text');
    if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) {
      const value = stringValue(node.expression);
      if (value !== undefined) report(node, value, 'JSX string child');
    }
    if (ts.isJsxAttribute(node) && translatableAttributes.has(node.name.getText())) {
      const initializer = node.initializer;
      if (initializer && ts.isStringLiteral(initializer))
        report(node, initializer.text, `JSX ${node.name.getText()}`);
      if (initializer && ts.isJsxExpression(initializer) && initializer.expression) {
        const value = stringValue(initializer.expression);
        if (value !== undefined) report(node, value, `JSX ${node.name.getText()}`);
      }
    }
    if (ts.isPropertyAssignment(node)) {
      const propertyName = node.name.getText().replace(/^['"]|['"]$/g, '');
      if (translatableProperties.has(propertyName)) {
        const value = stringValue(node.initializer);
        if (value !== undefined) report(node, value, `UI ${propertyName}`);
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isTranslationCall =
        (ts.isIdentifier(callee) && callee.text === 't') ||
        (ts.isPropertyAccessExpression(callee) && callee.name.text === 't');
      if (isTranslationCall && node.arguments[0]) {
        const key =
          ts.isStringLiteral(node.arguments[0]) ||
          ts.isNoSubstitutionTemplateLiteral(node.arguments[0])
            ? node.arguments[0].text
            : undefined;
        if (key) {
          for (const [localeName, locale] of locales) {
            if (!hasTranslation(locale, key)) {
              const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
              missingTranslations.push(
                `${localeName}: ${path.relative(process.cwd(), filePath)}:${line + 1}: missing "${key}"`,
              );
            }
          }
        }
      }
      if (
        ts.isPropertyAccessExpression(callee) &&
        ['alert', 'confirm', 'prompt'].includes(callee.name.text) &&
        node.arguments[0]
      ) {
        const value = stringValue(node.arguments[0]);
        if (value !== undefined) report(node.arguments[0], value, 'browser dialog');
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
}

if (violations.length > 0) {
  console.error(
    `Found ${violations.length} hard-coded UI string(s). Use a localized t('...') value instead:`,
  );
  for (const violation of violations) console.error(`  ${violation}`);
  process.exitCode = 1;
}
if (missingTranslations.length > 0) {
  console.error(`Found ${missingTranslations.length} missing translation(s):`);
  for (const missing of missingTranslations) console.error(`  ${missing}`);
  process.exitCode = 1;
}
