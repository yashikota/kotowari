import type { LinkProps } from '@tanstack/react-router';

type NavTarget = {
  key: string;
  label: string;
  to: LinkProps['to'];
  search?: LinkProps['search'];
  params?: LinkProps['params'];
  fuzzy?: boolean;
};

export const PRIMARY_NAV: NavTarget[] = [
  { key: '1', label: 'Home', to: '/', fuzzy: false },
  { key: '2', label: 'Issues', to: '/issues', search: {} },
  { key: '3', label: 'Board', to: '/board', search: {} },
  { key: '4', label: 'ADRs', to: '/adrs' },
  { key: '5', label: 'Projects', to: '/projects' },
  { key: '6', label: 'Cycles', to: '/cycles' },
  { key: '7', label: 'Pages', to: '/pages' },
];

export const CONFIG_NAV: NavTarget = { key: '0', label: 'Config', to: '/config' };

export const SIDEBAR_NAV: NavTarget[] = [...PRIMARY_NAV, CONFIG_NAV];

export type NavShortcutAction = `nav-${NavTarget['key']}`;

export function navActionFromKey(key: string): NavShortcutAction | null {
  if (SIDEBAR_NAV.some((item) => item.key === key)) {
    return `nav-${key}`;
  }
  return null;
}

export function navTargetForAction(action: NavShortcutAction): NavTarget | undefined {
  const key = action.slice(4);
  return SIDEBAR_NAV.find((item) => item.key === key);
}
