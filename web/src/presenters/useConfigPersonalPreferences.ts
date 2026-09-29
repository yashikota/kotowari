import { useMantineColorScheme } from '@mantine/core';
import type * as React from 'react';
import { useMachineFlag } from '../application/Root.tsx';
import {
  FIRST_DAYS_OF_WEEK,
  SIDEBAR_ITEM_IDS,
  usePersonalPreferences,
  type CommentSubmitShortcut,
  type DefaultHome,
  type FontSize,
  type SidebarItemId,
} from '../preferences.ts';
import { sidebarSettingsGroups } from '../sidebar.ts';
import { useTranslation } from 'react-i18next';

export function useConfigPersonalPreferences() {
  const { t } = useTranslation();
  const { preferences, update: updatePreferences } = usePersonalPreferences();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [sidebarCustomizationOpen, setSidebarCustomizationOpen] =
    useMachineFlag('sidebar-customization');

  return {
    data: {
      preferences,
      colorScheme,
      sidebarCustomizationOpen,
      sidebarGroups: sidebarSettingsGroups(preferences).map(({ group, items }) => ({
        group,
        label: t(`config.sidebarGroup.${group}`),
        items: items.map((item) => ({ ...item, label: t(item.labelKey) })),
      })),
    },
    handlers: {
      onDefaultHomeChange: (value: string | null) => {
        if (
          value === 'home' ||
          value === 'inbox' ||
          value === 'reviews' ||
          value === 'myIssues' ||
          value === 'activeIssues' ||
          value === 'issues' ||
          value === 'currentCycle' ||
          value === 'projects' ||
          value === 'cycles' ||
          value === 'agent'
        )
          updatePreferences({ defaultHome: value as DefaultHome });
      },
      onFirstDayOfWeekChange: (value: string | null) => {
        if (FIRST_DAYS_OF_WEEK.includes(value as (typeof FIRST_DAYS_OF_WEEK)[number]))
          updatePreferences({ firstDayOfWeek: value as (typeof FIRST_DAYS_OF_WEEK)[number] });
      },
      onAutoAssignToSelfChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updatePreferences({ autoAssignToSelf: event.currentTarget.checked }),
      onAutoAssignOnStartChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updatePreferences({ autoAssignOnStart: event.currentTarget.checked }),
      onColorSchemeChange: (value: string | null) => {
        if (value === 'light' || value === 'dark' || value === 'auto') setColorScheme(value);
      },
      onFontSizeChange: (value: string | null) => {
        if (value === 'small' || value === 'default' || value === 'large')
          updatePreferences({ fontSize: value as FontSize });
      },
      onCommentShortcutChange: (value: string | null) => {
        if (value === 'modEnter' || value === 'enter')
          updatePreferences({ commentSubmitShortcut: value as CommentSubmitShortcut });
      },
      onConvertEmoticonsChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updatePreferences({ convertEmoticons: event.currentTarget.checked }),
      onPointerCursorsChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updatePreferences({ pointerCursors: event.currentTarget.checked }),
      onUnderlineLinksChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updatePreferences({ underlineLinks: event.currentTarget.checked }),
      onOpenSidebarCustomization: () => setSidebarCustomizationOpen(true),
      onCloseSidebarCustomization: () => setSidebarCustomizationOpen(false),
      onSidebarLocationChange: (id: string, value: string | null) => {
        if (!SIDEBAR_ITEM_IDS.includes(id as SidebarItemId)) return;
        if (value !== 'primary' && value !== 'badged' && value !== 'more' && value !== 'hidden')
          return;
        updatePreferences({
          sidebarLocations: {
            ...preferences.sidebarLocations,
            [id]: value,
          },
        });
      },
      onSidebarBadgeStyleChange: (value: string | null) => {
        if (value === 'count' || value === 'dot') updatePreferences({ sidebarBadgeStyle: value });
      },
      onMoveSidebarItem: (id: string, direction: number) => {
        const group = sidebarSettingsGroups(preferences).find((candidate) =>
          candidate.items.some((item) => item.id === id),
        );
        if (!group) return;
        const index = group.items.findIndex((item) => item.id === id);
        const neighbor = group.items[index + direction];
        if (!neighbor) return;
        const sidebarOrder = [...preferences.sidebarOrder];
        const from = sidebarOrder.indexOf(id as SidebarItemId);
        const to = sidebarOrder.indexOf(neighbor.id);
        if (from < 0 || to < 0) return;
        [sidebarOrder[from], sidebarOrder[to]] = [sidebarOrder[to]!, sidebarOrder[from]!];
        updatePreferences({ sidebarOrder });
      },
    },
  };
}
