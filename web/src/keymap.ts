import { navActionFromKey } from './nav.ts';
import type { NavShortcutAction } from './nav.ts';

export type KeyAction =
  | 'palette'
  | 'new-issue'
  | 'new-adr'
  | 'move-down'
  | 'move-up'
  | 'select'
  | 'open'
  | 'escape'
  | 'status'
  | 'priority-1'
  | 'priority-2'
  | 'priority-3'
  | 'priority-4'
  | NavShortcutAction
  | 'help'
  | 'find';

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function isSubmitShortcut(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  nativeEvent?: { isComposing?: boolean };
}): boolean {
  return (
    event.key === 'Enter' &&
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.repeat &&
    !event.isComposing &&
    !event.nativeEvent?.isComposing &&
    event.keyCode !== 229
  );
}

export function isCommentSubmitShortcut(
  event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    repeat?: boolean;
    isComposing?: boolean;
    keyCode?: number;
    nativeEvent?: { isComposing?: boolean };
  },
  shortcut: 'modEnter' | 'enter',
): boolean {
  if (shortcut === 'modEnter') return isSubmitShortcut(event);
  return (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.altKey &&
    !event.repeat &&
    !event.isComposing &&
    !event.nativeEvent?.isComposing &&
    event.keyCode !== 229
  );
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object') {
    return false;
  }
  const el = target as { tagName?: string; isContentEditable?: boolean };
  if (el.isContentEditable) {
    return true;
  }
  return TYPING_TAGS.has(el.tagName ?? '');
}

const PROJECT_CREATE_SEQUENCE_TIMEOUT_MS = 1000;
const ISSUE_LINK_SEQUENCE_TIMEOUT_MS = 1000;
const GLOBAL_NAVIGATION_SEQUENCE_TIMEOUT_MS = 1000;

export function projectCreateSequenceFromKeyboard(
  event: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    repeat?: boolean;
    isComposing?: boolean;
    defaultPrevented?: boolean;
    target: EventTarget | null;
  },
  pendingSince: number | null,
  now: number,
): { action: 'new-project' | null; pendingSince: number | null } {
  const eligible =
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.repeat &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !isTypingTarget(event.target);
  if (!eligible) return { action: null, pendingSince: null };

  const key = event.key.toLowerCase();
  if (key === 'n') return { action: null, pendingSince: now };
  if (
    key === 'p' &&
    pendingSince !== null &&
    now >= pendingSince &&
    now - pendingSince <= PROJECT_CREATE_SEQUENCE_TIMEOUT_MS
  ) {
    return { action: 'new-project', pendingSince: null };
  }
  return { action: null, pendingSince: null };
}

export function issueLinkedCodeSequenceFromKeyboard(
  event: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    repeat?: boolean;
    isComposing?: boolean;
    defaultPrevented?: boolean;
    target: EventTarget | null;
  },
  pendingSince: number | null,
  now: number,
): { action: 'open-linked-code' | null; pendingSince: number | null } {
  const eligible =
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.repeat &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !isTypingTarget(event.target);
  if (!eligible) return { action: null, pendingSince: null };

  const key = event.key.toLowerCase();
  if (key === 'o') return { action: null, pendingSince: now };
  if (
    key === 'g' &&
    pendingSince !== null &&
    now >= pendingSince &&
    now - pendingSince <= ISSUE_LINK_SEQUENCE_TIMEOUT_MS
  ) {
    return { action: 'open-linked-code', pendingSince: null };
  }
  return { action: null, pendingSince: null };
}

export type GlobalNavigationAction =
  | 'inbox'
  | 'agent'
  | 'my-issues'
  | 'backlog'
  | 'all-issues'
  | 'cycles'
  | 'current-cycle'
  | 'upcoming-cycle'
  | 'projects'
  | 'initiatives'
  | 'settings';

const GLOBAL_NAVIGATION_KEYS: Record<string, GlobalNavigationAction> = {
  i: 'inbox',
  j: 'agent',
  m: 'my-issues',
  b: 'backlog',
  e: 'all-issues',
  c: 'cycles',
  v: 'current-cycle',
  w: 'upcoming-cycle',
  p: 'projects',
  n: 'initiatives',
  s: 'settings',
};

export function globalNavigationSequenceFromKeyboard(
  event: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    repeat?: boolean;
    isComposing?: boolean;
    defaultPrevented?: boolean;
    target: EventTarget | null;
  },
  pendingSince: number | null,
  now: number,
): { action: GlobalNavigationAction | null; pendingSince: number | null } {
  const eligible =
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.repeat &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !isTypingTarget(event.target);
  if (!eligible) return { action: null, pendingSince: null };

  const key = event.key.toLowerCase();
  if (key === 'g') return { action: null, pendingSince: now };
  if (
    pendingSince !== null &&
    now >= pendingSince &&
    now - pendingSince <= GLOBAL_NAVIGATION_SEQUENCE_TIMEOUT_MS
  ) {
    return { action: GLOBAL_NAVIGATION_KEYS[key] ?? null, pendingSince: null };
  }
  return { action: null, pendingSince: null };
}

export function inboxShortcutFromKeyboard(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
  target: EventTarget | null;
}): 'snooze-notification' | null {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey ||
    isTypingTarget(event.target)
  )
    return null;
  return event.key.toLowerCase() === 'h' ? 'snooze-notification' : null;
}

export type IssueDetailShortcut =
  | 'assign-self'
  | 'open-status'
  | 'open-priority'
  | 'open-labels'
  | 'open-estimate'
  | 'create-linked-adr'
  | 'focus-description'
  | 'toggle-favorite'
  | 'rename'
  | 'open-due-date'
  | 'open-reminder'
  | 'open-sub-issue'
  | 'toggle-resources'
  | 'add-link';

export function issueDetailShortcutFromKeyboard(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
  target: EventTarget | null;
}): IssueDetailShortcut | null {
  if (event.defaultPrevented || event.isComposing || event.repeat || isTypingTarget(event.target))
    return null;

  const key = event.key.toLowerCase();
  const modifier = event.metaKey || event.ctrlKey;
  if (event.altKey && !event.shiftKey && !modifier && key === 'f') return 'toggle-favorite';
  if (modifier && event.shiftKey) {
    if (key === 'o') return 'open-sub-issue';
    if (key === 'l') return 'toggle-resources';
    if (key === 'i') return 'focus-description';
  }
  if (modifier && event.altKey && !event.shiftKey && key === 'l') return 'add-link';
  if (modifier || event.altKey) return null;
  if (event.shiftKey) {
    if (key === 'd') return 'open-due-date';
    if (key === 'h') return 'open-reminder';
    if (key === 'r') return 'rename';
    if (key === 'e') return 'open-estimate';
    if (key === 'p') return 'create-linked-adr';
    return null;
  }
  if (key === 'i') return 'assign-self';
  if (key === 's') return 'open-status';
  if (key === 'p') return 'open-priority';
  if (key === 'l') return 'open-labels';
  return null;
}

export type IssueCopyShortcut =
  | 'copy-id'
  | 'copy-url'
  | 'copy-title'
  | 'copy-title-link'
  | 'copy-everything'
  | 'copy-branch'
  | 'copy-prompt';

export function issueCopyShortcutFromKeyboard(event: {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
  target: EventTarget | null;
}): IssueCopyShortcut | null {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    isTypingTarget(event.target) ||
    !(event.ctrlKey || event.metaKey)
  )
    return null;

  const key = event.key.toLowerCase();
  if (event.altKey) {
    if (event.shiftKey) return null;
    if (key === 'c') return 'copy-everything';
    if (key === 'p') return 'copy-prompt';
    return null;
  }

  if (event.code === 'Period') return event.shiftKey ? 'copy-branch' : 'copy-id';
  if (event.code === 'Comma' && event.shiftKey) return 'copy-url';
  if (event.code === 'Quote' && event.shiftKey) return 'copy-title';
  if (event.shiftKey && event.key === '>') return 'copy-branch';
  if (event.shiftKey && (event.key === '<' || event.key === ',')) return 'copy-url';
  if (event.shiftKey && event.key === '"') return 'copy-title';
  if (!event.shiftKey && event.key === '.') return 'copy-id';
  if (!event.shiftKey && key === 'c') return 'copy-title-link';
  return null;
}

export function actionFromKeyboard(event: {
  key: string;
  isComposing?: boolean;
  repeat?: boolean;
  defaultPrevented?: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  target: EventTarget | null;
}): KeyAction | null {
  if (
    event.isComposing ||
    event.defaultPrevented ||
    (event.repeat && !['j', 'k', 'ArrowDown', 'ArrowUp'].includes(event.key))
  )
    return null;
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key.toLowerCase() === 'k') {
    return 'palette';
  }
  if (mod || event.altKey) {
    return null;
  }
  if (event.key === 'Escape') {
    return 'escape';
  }
  if (isTypingTarget(event.target)) {
    return null;
  }
  if (event.shiftKey) {
    switch (event.key) {
      case '1':
        return 'priority-1';
      case '2':
        return 'priority-2';
      case '3':
        return 'priority-3';
      case '4':
        return 'priority-4';
      default:
        break;
    }
  }
  const nav = navActionFromKey(event.key);
  if (nav) {
    return nav;
  }
  switch (event.key) {
    case 'c':
      return 'new-issue';
    case 'p':
      return 'new-adr';
    case 'ArrowDown':
    case 'j':
      return 'move-down';
    case 'ArrowUp':
    case 'k':
      return 'move-up';
    case 'Enter':
      return 'open';
    case 'x':
    case 'X':
      return 'select';
    case 's':
      return 'status';
    case '?':
      return 'help';
    case '/':
      return 'find';
    default:
      return null;
  }
}
