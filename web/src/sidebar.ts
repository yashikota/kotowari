import { HOME_NAV, MORE_NAV, TEAM_NAV } from './nav.ts';
import type { NavTarget } from './nav.ts';
import type { PersonalPreferences, SidebarItemId, SidebarLocation } from './preferences.ts';

type SidebarGroup = 'personal' | 'workspace' | 'more' | 'hidden';

export type SidebarEntry = NavTarget & {
  id: SidebarItemId;
  location: SidebarLocation;
  group: SidebarGroup;
};

const definitions: {
  item: NavTarget;
  id: SidebarItemId;
  defaultGroup: 'personal' | 'workspace' | 'more';
}[] = [
  ...HOME_NAV.map((item) => ({
    item,
    id: (item.id ?? item.to) as SidebarItemId,
    defaultGroup: 'personal' as const,
  })),
  ...TEAM_NAV.map((item) => ({
    item,
    id: (item.id ?? item.to) as SidebarItemId,
    defaultGroup: 'workspace' as const,
  })),
  ...MORE_NAV.map((item) => ({
    item,
    id: (item.id ?? item.to) as SidebarItemId,
    defaultGroup: 'more' as const,
  })),
];

export function sidebarEntries(preferences: PersonalPreferences): SidebarEntry[] {
  return preferences.sidebarOrder.flatMap((id) => {
    const definition = definitions.find((entry) => entry.id === id);
    if (!definition) return [];
    const location = preferences.sidebarLocations[id];
    const group =
      location === 'hidden'
        ? 'hidden'
        : location === 'more'
          ? 'more'
          : definition.defaultGroup === 'more'
            ? 'workspace'
            : definition.defaultGroup;
    return [{ ...definition.item, id, location, group }];
  });
}

export function sidebarNavigation(preferences: PersonalPreferences) {
  const entries = sidebarEntries(preferences);
  return {
    personal: entries.filter((entry) => entry.group === 'personal'),
    workspace: entries.filter((entry) => entry.group === 'workspace'),
    more: entries.filter((entry) => entry.group === 'more'),
  };
}

export function sidebarSettingsGroups(preferences: PersonalPreferences) {
  const entries = sidebarEntries(preferences);
  return (['personal', 'workspace', 'more', 'hidden'] as const).map((group) => ({
    group,
    items: entries.filter((entry) => entry.group === group),
  }));
}
