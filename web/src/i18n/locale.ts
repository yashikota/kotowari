import type { Workspace } from '../types.ts';

export const APP_LOCALES = ['en', 'ja'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value);
}

export function normalizeWorkspace(workspace: Workspace): Workspace {
  return {
    url: '',
    description: '',
    githubUrl: '',
    ...workspace,
    locale: resolveLocale(workspace.locale),
  };
}

export function resolveLocale(value: string | undefined | null): AppLocale {
  if (value && isAppLocale(value)) {
    return value;
  }
  return defaultLocale();
}

export function defaultLocale(): AppLocale {
  const raw = typeof navigator !== 'undefined' ? navigator.language : '';
  const browser = raw.split('-')[0] ?? '';
  return isAppLocale(browser) ? browser : 'en';
}

export function languageOptions(current: AppLocale) {
  const display = new Intl.DisplayNames([current], { type: 'language' });
  return APP_LOCALES.map((code) => ({
    value: code,
    label: display.of(code) ?? code,
  }));
}
