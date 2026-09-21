import { navActionFromKey } from './nav.ts';

export type KeyAction =
  | 'palette'
  | 'new-issue'
  | 'new-adr'
  | 'move-down'
  | 'move-up'
  | 'open'
  | 'escape'
  | 'status'
  | 'priority-1'
  | 'priority-2'
  | 'priority-3'
  | 'priority-4'
  | 'nav-1'
  | 'nav-2'
  | 'nav-3'
  | 'nav-4'
  | 'nav-5'
  | 'nav-6'
  | 'nav-7'
  | 'nav-0'
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
