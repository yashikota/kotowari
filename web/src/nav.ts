import type { LinkProps } from '@tanstack/react-router';

type NavKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | 'a' | 'i' | 'r' | 't';

export type NavTarget = {
  key: NavKey;
  labelKey: string;
  to: LinkProps['to'];
  search?: LinkProps['search'];
  params?: LinkProps['params'];
  fuzzy?: boolean;
};

export const HOME_NAV: NavTarget[] = [
  { key: '8', labelKey: 'nav.reminders', to: '/reminders', fuzzy: false },
  { key: 'a', labelKey: 'nav.agent', to: '/agent', fuzzy: false },
];

export const TEAM_NAV: NavTarget[] = [
  { key: '1', labelKey: 'nav.home', to: '/', fuzzy: false },
  { key: '2', labelKey: 'nav.issues', to: '/issues', search: {} },
  { key: '6', labelKey: 'nav.cycles', to: '/cycles', fuzzy: true },
  { key: '5', labelKey: 'nav.projects', to: '/projects' },
  { key: 'i', labelKey: 'nav.initiatives', to: '/initiatives' },
];

export const MORE_NAV: NavTarget[] = [
  { key: '3', labelKey: 'nav.board', to: '/board', search: {} },
  { key: '4', labelKey: 'nav.adrs', to: '/adrs' },
  { key: '7', labelKey: 'nav.pages', to: '/pages' },
  { key: 't', labelKey: 'nav.templates', to: '/templates' },
  { key: 'r', labelKey: 'nav.recurringIssues', to: '/recurring' },
];

export const CONFIG_NAV: NavTarget = { key: '0', labelKey: 'nav.config', to: '/config' };

export const SIDEBAR_NAV: NavTarget[] = [...HOME_NAV, ...TEAM_NAV, ...MORE_NAV, CONFIG_NAV];

export type NavShortcutAction = `nav-${NavKey}`;

export function navActionFromKey(key: string): NavShortcutAction | null {
  const match = SIDEBAR_NAV.find((item) => item.key === key);
  return match ? `nav-${match.key}` : null;
}

export function navTargetForAction(action: NavShortcutAction): NavTarget | undefined {
  const key = action.slice(4);
  return SIDEBAR_NAV.find((item) => item.key === key);
}
