import { useCallback, useEffect, useState } from 'react';

export type FontSize = 'small' | 'default' | 'large';
export type DefaultHome = 'home' | 'issues' | 'projects' | 'cycles' | 'agent';
export type CommentSubmitShortcut = 'modEnter' | 'enter';
export type SidebarItem =
  | '/'
  | '/reminders'
  | '/agent'
  | '/issues'
  | '/board'
  | '/cycles'
  | '/projects'
  | '/adrs'
  | '/pages'
  | '/templates'
  | '/recurring';
export const SIDEBAR_ITEM_IDS = [
  '/',
  '/reminders',
  '/agent',
  '/issues',
  '/board',
  '/cycles',
  '/projects',
  '/adrs',
  '/pages',
  '/templates',
  '/recurring',
] as const satisfies readonly SidebarItem[];
export type SidebarItemId = (typeof SIDEBAR_ITEM_IDS)[number];
export type SidebarLocation = 'primary' | 'more' | 'hidden';

export type PersonalPreferences = {
  defaultHome: DefaultHome;
  fontSize: FontSize;
  commentSubmitShortcut: CommentSubmitShortcut;
  sidebarLocations: Record<SidebarItemId, SidebarLocation>;
  sidebarOrder: SidebarItemId[];
  convertEmoticons: boolean;
  underlineLinks: boolean;
  pointerCursors: boolean;
};

export const DEFAULT_PERSONAL_PREFERENCES: PersonalPreferences = {
  defaultHome: 'home',
  fontSize: 'default',
  commentSubmitShortcut: 'modEnter',
  sidebarLocations: {
    '/': 'primary',
    '/reminders': 'primary',
    '/agent': 'primary',
    '/issues': 'primary',
    '/board': 'primary',
    '/cycles': 'primary',
    '/projects': 'primary',
    '/adrs': 'more',
    '/pages': 'more',
    '/templates': 'more',
    '/recurring': 'more',
  },
  sidebarOrder: [...SIDEBAR_ITEM_IDS],
  convertEmoticons: true,
  underlineLinks: false,
  pointerCursors: false,
};

export const PERSONAL_PREFERENCES_KEY = 'kotowari.preferences.v1';
export const PERSONAL_PREFERENCES_EVENT = 'kotowari:preferences-changed';

const DEFAULT_HOMES: DefaultHome[] = ['home', 'issues', 'projects', 'cycles', 'agent'];
const FONT_SIZES: FontSize[] = ['small', 'default', 'large'];
const COMMENT_SHORTCUTS: CommentSubmitShortcut[] = ['modEnter', 'enter'];
const SIDEBAR_LOCATIONS: SidebarLocation[] = ['primary', 'more', 'hidden'];

function isSidebarItemId(value: unknown): value is SidebarItemId {
  return SIDEBAR_ITEM_IDS.includes(value as SidebarItemId);
}

export function parsePersonalPreferences(value: string | null): PersonalPreferences {
  if (!value) return { ...DEFAULT_PERSONAL_PREFERENCES };
  try {
    const parsed = JSON.parse(value) as Partial<PersonalPreferences>;
    return {
      defaultHome: DEFAULT_HOMES.includes(parsed.defaultHome as DefaultHome)
        ? (parsed.defaultHome as DefaultHome)
        : DEFAULT_PERSONAL_PREFERENCES.defaultHome,
      fontSize: FONT_SIZES.includes(parsed.fontSize as FontSize)
        ? (parsed.fontSize as FontSize)
        : DEFAULT_PERSONAL_PREFERENCES.fontSize,
      commentSubmitShortcut: COMMENT_SHORTCUTS.includes(
        parsed.commentSubmitShortcut as CommentSubmitShortcut,
      )
        ? (parsed.commentSubmitShortcut as CommentSubmitShortcut)
        : DEFAULT_PERSONAL_PREFERENCES.commentSubmitShortcut,
      sidebarLocations: Object.fromEntries(
        SIDEBAR_ITEM_IDS.map((id) => {
          const location = parsed.sidebarLocations?.[id];
          return [
            id,
            SIDEBAR_LOCATIONS.includes(location as SidebarLocation)
              ? location
              : DEFAULT_PERSONAL_PREFERENCES.sidebarLocations[id],
          ];
        }),
      ) as Record<SidebarItemId, SidebarLocation>,
      sidebarOrder: [
        ...new Set((parsed.sidebarOrder ?? []).filter(isSidebarItemId)),
        ...SIDEBAR_ITEM_IDS.filter((id) => !(parsed.sidebarOrder ?? []).includes(id)),
      ],
      convertEmoticons:
        typeof parsed.convertEmoticons === 'boolean'
          ? parsed.convertEmoticons
          : DEFAULT_PERSONAL_PREFERENCES.convertEmoticons,
      underlineLinks:
        typeof parsed.underlineLinks === 'boolean'
          ? parsed.underlineLinks
          : DEFAULT_PERSONAL_PREFERENCES.underlineLinks,
      pointerCursors:
        typeof parsed.pointerCursors === 'boolean'
          ? parsed.pointerCursors
          : DEFAULT_PERSONAL_PREFERENCES.pointerCursors,
    };
  } catch {
    return { ...DEFAULT_PERSONAL_PREFERENCES };
  }
}

const EMOTICONS: Record<string, string> = {
  ':)': '🙂',
  ':-)': '🙂',
  ':(': '🙁',
  ':-(': '🙁',
  ':d': '😃',
  ':-d': '😃',
  ';)': '😉',
  ';-)': '😉',
  ':p': '😛',
  ':-p': '😛',
  '<3': '❤️',
};

export function convertTextEmoticons(value: string): string {
  return value.replace(
    /(^|\s)(:-?\)|:-?\(|:-?d|;-?\)|:-?p|<3)(?=$|[\s.,!?])/gi,
    (_match, prefix: string, token: string) =>
      `${prefix}${EMOTICONS[token.toLowerCase()] ?? token}`,
  );
}

export function getPersonalPreferences(): PersonalPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PERSONAL_PREFERENCES };
  return parsePersonalPreferences(window.localStorage.getItem(PERSONAL_PREFERENCES_KEY));
}

export function savePersonalPreferences(
  changes: Partial<PersonalPreferences>,
): PersonalPreferences {
  const next = { ...getPersonalPreferences(), ...changes };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PERSONAL_PREFERENCES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PERSONAL_PREFERENCES_EVENT));
  }
  return next;
}

export function usePersonalPreferences() {
  const [preferences, setPreferences] = useState(getPersonalPreferences);
  useEffect(() => {
    const refresh = () => setPreferences(getPersonalPreferences());
    window.addEventListener(PERSONAL_PREFERENCES_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(PERSONAL_PREFERENCES_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const update = useCallback((changes: Partial<PersonalPreferences>) => {
    const next = savePersonalPreferences(changes);
    setPreferences(next);
    return next;
  }, []);
  return { preferences, update };
}

export function defaultHomeHref(home: DefaultHome): string {
  switch (home) {
    case 'issues':
      return '/issues';
    case 'projects':
      return '/projects';
    case 'cycles':
      return '/cycles';
    case 'agent':
      return '/agent';
    case 'home':
      return '/';
  }
}
