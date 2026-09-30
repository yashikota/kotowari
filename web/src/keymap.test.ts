import { isCommentSubmitShortcut, isSubmitShortcut } from './keymap.ts';
import { describe, expect, it } from 'vite-plus/test';
import {
  actionFromKeyboard,
  globalNavigationSequenceFromKeyboard,
  initiativeDetailShortcutFromKeyboard,
  inboxShortcutFromKeyboard,
  initiativeCreateSequenceFromKeyboard,
  issueLinkedCodeSequenceFromKeyboard,
  issueRelationSequenceFromKeyboard,
  issueDetailShortcutFromKeyboard,
  isTypingTarget,
  issueCopyShortcutFromKeyboard,
  projectCreateSequenceFromKeyboard,
  projectDetailSequenceFromKeyboard,
  quickOpenSequenceFromKeyboard,
} from './keymap.ts';

function el(tagName: string): EventTarget {
  return { tagName, isContentEditable: false } as unknown as EventTarget;
}

describe('actionFromKeyboard', () => {
  it('opens the palette with mod+k even in an input', () => {
    expect(
      actionFromKeyboard({
        key: 'k',
        metaKey: true,
        ctrlKey: false,
        target: el('INPUT'),
      }),
    ).toBe('palette');
  });

  it('ignores c while typing', () => {
    const input = el('TEXTAREA');
    expect(isTypingTarget(input)).toBe(true);
    expect(
      actionFromKeyboard({
        key: 'c',
        metaKey: false,
        ctrlKey: false,
        target: input,
      }),
    ).toBeNull();
  });

  it('selects the focused list item with x', () => {
    expect(
      actionFromKeyboard({
        key: 'x',
        metaKey: false,
        ctrlKey: false,
        target: el('BODY'),
      }),
    ).toBe('select');
    expect(
      actionFromKeyboard({
        key: 'x',
        metaKey: false,
        ctrlKey: false,
        target: el('INPUT'),
      }),
    ).toBeNull();
  });

  it('maps list motion and create keys', () => {
    const body = el('BODY');
    expect(
      actionFromKeyboard({
        key: 'j',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('move-down');
    expect(
      actionFromKeyboard({
        key: 'c',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('new-issue');
    expect(
      actionFromKeyboard({
        key: '1',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('nav-1');
    expect(
      actionFromKeyboard({
        key: '1',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('priority-1');
    expect(
      actionFromKeyboard({
        key: '?',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('help');
    expect(
      actionFromKeyboard({
        key: '/',
        metaKey: false,
        ctrlKey: true,
        target: body,
      }),
    ).toBe('help');
    expect(
      actionFromKeyboard({
        key: '/',
        metaKey: true,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('help');
    expect(
      actionFromKeyboard({
        key: '/',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('find');
  });

  it('maps remaining letter and number shortcuts', () => {
    const body = el('BODY');
    expect(
      actionFromKeyboard({
        key: 'a',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('nav-a');
    expect(
      actionFromKeyboard({
        key: 'p',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('new-adr');
    expect(
      actionFromKeyboard({
        key: 's',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('status');
    expect(
      actionFromKeyboard({
        key: 'k',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('move-up');
    expect(
      actionFromKeyboard({
        key: 'Enter',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('open');
    expect(
      actionFromKeyboard({
        key: '2',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('nav-2');
    expect(
      actionFromKeyboard({
        key: '3',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('nav-3');
    expect(
      actionFromKeyboard({
        key: '4',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('nav-4');
    expect(
      actionFromKeyboard({
        key: '2',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('priority-2');
    expect(
      actionFromKeyboard({
        key: '3',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('priority-3');
    expect(
      actionFromKeyboard({
        key: '4',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('priority-4');
    expect(
      actionFromKeyboard({
        key: '0',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('nav-0');
  });

  it('opens the palette with ctrl+k', () => {
    expect(
      actionFromKeyboard({
        key: 'k',
        metaKey: false,
        ctrlKey: true,
        target: el('BODY'),
      }),
    ).toBe('palette');
  });

  it('ignores alt+k and unknown keys', () => {
    const body = el('BODY');
    expect(
      actionFromKeyboard({
        key: 'k',
        metaKey: false,
        ctrlKey: false,
        altKey: true,
        target: body,
      }),
    ).toBeNull();
    expect(
      actionFromKeyboard({
        key: 'z',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBeNull();
  });

  it('opens and clears issue filters with the Linear shortcuts', () => {
    const body = el('BODY');
    expect(
      actionFromKeyboard({
        key: 'f',
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('add-filter');
    expect(
      actionFromKeyboard({
        key: 'F',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('clear-last-filter');
    expect(
      actionFromKeyboard({
        key: 'F',
        altKey: true,
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        target: body,
      }),
    ).toBe('clear-filters');
    expect(
      actionFromKeyboard({
        key: 'f',
        metaKey: false,
        ctrlKey: false,
        target: el('INPUT'),
      }),
    ).toBeNull();
    expect(
      actionFromKeyboard({
        key: 'F',
        altKey: true,
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        target: el('INPUT'),
      }),
    ).toBeNull();
  });

  it('lets Escape through while typing and ignores other keys', () => {
    const input = el('INPUT');
    expect(
      actionFromKeyboard({
        key: 'Escape',
        metaKey: false,
        ctrlKey: false,
        target: input,
      }),
    ).toBe('escape');
    expect(
      actionFromKeyboard({
        key: '/',
        metaKey: false,
        ctrlKey: false,
        target: input,
      }),
    ).toBeNull();
  });

  it('toggles the left sidebar with [ outside editable controls', () => {
    expect(
      actionFromKeyboard({ key: '[', metaKey: false, ctrlKey: false, target: el('BODY') }),
    ).toBe('toggle-sidebar');
    expect(
      actionFromKeyboard({ key: '[', metaKey: false, ctrlKey: false, target: el('INPUT') }),
    ).toBeNull();
  });

  it('toggles the right sidebar with ] outside editable controls', () => {
    expect(
      actionFromKeyboard({ key: ']', metaKey: false, ctrlKey: false, target: el('BODY') }),
    ).toBe('toggle-right-sidebar');
    expect(
      actionFromKeyboard({ key: ']', metaKey: false, ctrlKey: false, target: el('TEXTAREA') }),
    ).toBeNull();
  });

  it('treats contenteditable as a typing target', () => {
    const editor = { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget;
    expect(isTypingTarget(editor)).toBe(true);
    expect(
      actionFromKeyboard({
        key: 'c',
        metaKey: false,
        ctrlKey: false,
        target: editor,
      }),
    ).toBeNull();
  });

  it('ignores create while a modifier is held', () => {
    expect(
      actionFromKeyboard({
        key: 'c',
        metaKey: true,
        ctrlKey: false,
        target: el('BODY'),
      }),
    ).toBeNull();
  });
});

describe('project create keyboard sequence', () => {
  const body = el('BODY');
  const key = (
    value: string,
    overrides: Partial<Parameters<typeof projectCreateSequenceFromKeyboard>[0]> = {},
  ) =>
    projectCreateSequenceFromKeyboard(
      {
        key: value,
        metaKey: false,
        ctrlKey: false,
        target: body,
        ...overrides,
      },
      null,
      100,
    );

  it('recognizes N, then P and clears the pending sequence', () => {
    const started = projectCreateSequenceFromKeyboard(
      { key: 'n', metaKey: false, ctrlKey: false, target: body },
      null,
      100,
    );
    expect(started).toEqual({ action: null, pendingSince: 100 });
    expect(
      projectCreateSequenceFromKeyboard(
        { key: 'p', metaKey: false, ctrlKey: false, target: body },
        started.pendingSince,
        500,
      ),
    ).toEqual({ action: 'new-project', pendingSince: null });
  });

  it('expires the sequence and does not swallow an ordinary P shortcut', () => {
    expect(
      projectCreateSequenceFromKeyboard(
        { key: 'p', metaKey: false, ctrlKey: false, target: body },
        100,
        1101,
      ),
    ).toEqual({ action: null, pendingSince: null });
    expect(key('p').action).toBeNull();
  });

  it('does not arm or complete while typing, composing, repeating, or modified', () => {
    expect(key('n', { target: el('INPUT') }).pendingSince).toBeNull();
    expect(key('n', { isComposing: true }).pendingSince).toBeNull();
    expect(key('n', { repeat: true }).pendingSince).toBeNull();
    expect(key('n', { metaKey: true }).pendingSince).toBeNull();
    expect(key('n', { defaultPrevented: true }).pendingSince).toBeNull();
    expect(
      projectCreateSequenceFromKeyboard(
        { key: 'p', metaKey: false, ctrlKey: false, target: body, isComposing: true },
        100,
        200,
      ),
    ).toEqual({ action: null, pendingSince: null });
  });

  it('cancels a pending sequence when another key is pressed', () => {
    const interrupted = projectCreateSequenceFromKeyboard(
      { key: 'x', metaKey: false, ctrlKey: false, target: body },
      100,
      200,
    );
    expect(interrupted.pendingSince).toBeNull();
    expect(
      projectCreateSequenceFromKeyboard(
        { key: 'p', metaKey: false, ctrlKey: false, target: body },
        interrupted.pendingSince,
        300,
      ).action,
    ).toBeNull();
  });
});

describe('initiative create keyboard sequence', () => {
  const body = el('BODY');
  const key = (
    value: string,
    pendingSince: number | null = null,
    now = 100,
    overrides: Partial<Parameters<typeof initiativeCreateSequenceFromKeyboard>[0]> = {},
  ) =>
    initiativeCreateSequenceFromKeyboard(
      {
        key: value,
        metaKey: false,
        ctrlKey: false,
        target: body,
        ...overrides,
      },
      pendingSince,
      now,
    );

  it('recognizes N, then I and clears the pending sequence', () => {
    const started = key('n');
    expect(started).toEqual({ action: null, pendingSince: 100 });
    expect(key('i', started.pendingSince, 500)).toEqual({
      action: 'new-initiative',
      pendingSince: null,
    });
  });

  it('expires the sequence and ignores typing or modified keys', () => {
    expect(key('i', 100, 1101).action).toBeNull();
    expect(key('n', null, 100, { target: el('INPUT') }).pendingSince).toBeNull();
    expect(key('n', null, 100, { isComposing: true }).pendingSince).toBeNull();
    expect(key('n', null, 100, { metaKey: true }).pendingSince).toBeNull();
  });

  it('cancels the pending sequence when another key is pressed', () => {
    const interrupted = key('x', 100, 200);
    expect(interrupted).toEqual({ action: null, pendingSince: null });
    expect(key('i', interrupted.pendingSince, 300).action).toBeNull();
  });
});

describe('open linked code keyboard sequence', () => {
  const body = el('BODY');
  const key = (
    value: string,
    pendingSince: number | null = null,
    now = 100,
    overrides: Partial<Parameters<typeof issueLinkedCodeSequenceFromKeyboard>[0]> = {},
  ) =>
    issueLinkedCodeSequenceFromKeyboard(
      {
        key: value,
        metaKey: false,
        ctrlKey: false,
        target: body,
        ...overrides,
      },
      pendingSince,
      now,
    );

  it('recognizes O, then G and consumes the sequence', () => {
    const started = key('o');
    expect(started).toEqual({ action: null, pendingSince: 100 });
    expect(key('g', started.pendingSince, 250)).toEqual({
      action: 'open-linked-code',
      pendingSince: null,
    });
  });

  it('expires the sequence and ignores typing or modified keys', () => {
    expect(key('g', 100, 1101)).toEqual({ action: null, pendingSince: null });
    expect(key('g', 100, 200, { target: el('INPUT') })).toEqual({
      action: null,
      pendingSince: null,
    });
    expect(key('g', 100, 200, { shiftKey: true })).toEqual({
      action: null,
      pendingSince: null,
    });
  });
});

describe('global navigation keyboard sequence', () => {
  const body = el('BODY');
  const key = (
    value: string,
    pendingSince: number | null = null,
    now = 100,
    overrides: Partial<Parameters<typeof globalNavigationSequenceFromKeyboard>[0]> = {},
  ) =>
    globalNavigationSequenceFromKeyboard(
      {
        key: value,
        metaKey: false,
        ctrlKey: false,
        target: body,
        ...overrides,
      },
      pendingSince,
      now,
    );

  it.each([
    ['i', 'inbox'],
    ['j', 'agent'],
    ['d', 'drafts'],
    ['m', 'my-issues'],
    ['a', 'active-issues'],
    ['b', 'backlog'],
    ['e', 'all-issues'],
    ['c', 'cycles'],
    ['v', 'current-cycle'],
    ['w', 'upcoming-cycle'],
    ['p', 'projects'],
    ['n', 'initiatives'],
    ['s', 'settings'],
  ])('maps G, then %s to %s', (secondKey, action) => {
    const started = key('g');
    expect(started).toEqual({ action: null, pendingSince: 100 });
    expect(key(secondKey, started.pendingSince, 250)).toEqual({ action, pendingSince: null });
  });

  it('expires, cancels, and ignores typing or modified keys', () => {
    expect(key('i', 100, 1101)).toEqual({ action: null, pendingSince: null });
    expect(key('x', 100, 200)).toEqual({ action: null, pendingSince: null });
    expect(key('i', 100, 200, { target: el('INPUT') })).toEqual({
      action: null,
      pendingSince: null,
    });
    expect(key('i', 100, 200, { shiftKey: true })).toEqual({
      action: null,
      pendingSince: null,
    });
  });
});

describe('Linear-style quick open keyboard sequence', () => {
  const body = el('BODY');
  const key = (
    value: string,
    pendingSince: number | null = null,
    now = 100,
    overrides: Partial<Parameters<typeof quickOpenSequenceFromKeyboard>[0]> = {},
  ) =>
    quickOpenSequenceFromKeyboard(
      {
        key: value,
        metaKey: false,
        ctrlKey: false,
        target: body,
        ...overrides,
      },
      pendingSince,
      now,
    );

  it.each([
    ['i', 'issue'],
    ['f', 'favorite'],
    ['p', 'project'],
    ['c', 'cycle'],
    ['v', 'view'],
    ['d', 'document'],
    ['n', 'initiative'],
  ])('maps O, then %s to %s', (secondKey, action) => {
    const started = key('o');
    expect(started).toEqual({ action: null, pendingSince: 100 });
    expect(key(secondKey, started.pendingSince, 250)).toEqual({ action, pendingSince: null });
  });

  it('leaves O,G for the issue linked-code handler and expires safely', () => {
    expect(key('g', 100, 250)).toEqual({ action: null, pendingSince: null });
    expect(key('i', 100, 1101)).toEqual({ action: null, pendingSince: null });
    expect(key('o', null, 100, { target: el('INPUT') })).toEqual({
      action: null,
      pendingSince: null,
    });
    expect(key('o', null, 100, { isComposing: true })).toEqual({
      action: null,
      pendingSince: null,
    });
  });
});

describe('inbox keyboard shortcuts', () => {
  const key = (
    value: string,
    overrides: Partial<Parameters<typeof inboxShortcutFromKeyboard>[0]> = {},
  ) =>
    inboxShortcutFromKeyboard({
      key: value,
      metaKey: false,
      ctrlKey: false,
      target: el('BODY'),
      ...overrides,
    });

  it('snoozes a focused notification with H', () => {
    expect(key('h')).toBe('snooze-notification');
    expect(key('H')).toBe('snooze-notification');
  });

  it('deletes read notifications with Shift+Backspace', () => {
    expect(key('Backspace', { shiftKey: true })).toBe('delete-read-notifications');
    expect(key('Backspace')).toBe('delete-notification');
    expect(key('Backspace', { shiftKey: true, metaKey: true })).toBeNull();
  });

  it('marks all notifications read with Alt+U', () => {
    expect(key('u', { altKey: true })).toBe('mark-all-read');
    expect(key('U', { altKey: true })).toBe('mark-all-read');
    expect(key('u')).toBe('mark-selected-read');
    expect(key('u', { altKey: true, ctrlKey: true })).toBeNull();
    expect(key('u', { altKey: true, shiftKey: true })).toBeNull();
  });

  it('toggles the selected notification with U and deletes it with E or Backspace', () => {
    expect(key('u')).toBe('mark-selected-read');
    expect(key('U')).toBe('mark-selected-read');
    expect(key('e')).toBe('delete-notification');
    expect(key('E')).toBe('delete-notification');
    expect(key('Backspace')).toBe('delete-notification');
    expect(key('u', { shiftKey: true })).toBeNull();
    expect(key('e', { altKey: true })).toBeNull();
  });

  it('does not intercept typing, composition, repeats, or modified shortcuts', () => {
    expect(key('h', { target: el('INPUT') })).toBeNull();
    expect(key('h', { target: el('TEXTAREA') })).toBeNull();
    expect(key('h', { target: { isContentEditable: true } as unknown as EventTarget })).toBeNull();
    expect(key('h', { isComposing: true })).toBeNull();
    expect(key('h', { repeat: true })).toBeNull();
    expect(key('h', { shiftKey: true })).toBeNull();
    expect(key('h', { ctrlKey: true })).toBeNull();
  });
});

describe('issue detail keyboard shortcuts', () => {
  const body = el('BODY');
  const shortcut = (
    key: string,
    overrides: Partial<Parameters<typeof issueDetailShortcutFromKeyboard>[0]> = {},
  ) =>
    issueDetailShortcutFromKeyboard({
      key,
      metaKey: false,
      ctrlKey: false,
      target: body,
      ...overrides,
    });

  it.each([
    ['i', {}, 'assign-self'],
    ['s', {}, 'open-status'],
    ['p', {}, 'open-priority'],
    ['a', {}, 'open-assignee'],
    ['l', {}, 'open-labels'],
    ['E', { shiftKey: true }, 'open-estimate'],
    ['P', { shiftKey: true }, 'open-project'],
    ['I', { metaKey: true, shiftKey: true }, 'focus-description'],
    ['M', { ctrlKey: true }, 'focus-comment'],
    ['f', { altKey: true }, 'toggle-favorite'],
    ['S', { shiftKey: true }, 'toggle-subscription'],
    ['C', { shiftKey: true }, 'open-cycle'],
    ['D', { shiftKey: true }, 'open-due-date'],
    ['D', { ctrlKey: true, shiftKey: true }, 'clear-due-date'],
    ['H', { shiftKey: true }, 'open-reminder'],
    ['R', { shiftKey: true }, 'rename'],
    ['O', { ctrlKey: true, shiftKey: true }, 'open-sub-issue'],
    ['P', { ctrlKey: true, shiftKey: true }, 'set-parent-issue'],
    ['ArrowDown', { ctrlKey: true, shiftKey: true }, 'open-first-sub-issue'],
    ['ArrowUp', { ctrlKey: true, shiftKey: true }, 'open-parent'],
    ['L', { metaKey: true, shiftKey: true }, 'toggle-resources'],
    ['l', { ctrlKey: true, altKey: true }, 'add-link'],
  ])('maps %s with its modifiers', (key, modifiers, action) => {
    expect(shortcut(key, modifiers)).toBe(action);
  });

  it('does not fire while typing or with unrelated modifier combinations', () => {
    expect(shortcut('i', { target: el('TEXTAREA') })).toBeNull();
    expect(shortcut('i', { repeat: true })).toBeNull();
    expect(shortcut('i', { ctrlKey: true })).toBeNull();
    expect(shortcut('f', { altKey: true, shiftKey: true })).toBeNull();
    expect(shortcut('d', { shiftKey: true, metaKey: true, altKey: true })).toBeNull();
  });
});

describe('issue relation keyboard sequences', () => {
  const body = el('BODY');
  const key = (
    value: string,
    pendingSince: number | null,
    now: number,
    overrides: Partial<Parameters<typeof issueRelationSequenceFromKeyboard>[0]> = {},
  ) =>
    issueRelationSequenceFromKeyboard(
      {
        key: value,
        metaKey: false,
        ctrlKey: false,
        target: body,
        ...overrides,
      },
      pendingSince,
      now,
    );

  it.each([
    ['b', 'mark-blocked'],
    ['x', 'mark-blocking'],
    ['r', 'mark-related'],
    ['m', 'mark-duplicate'],
  ] as const)('maps M then %s to %s', (secondKey, action) => {
    const pending = key('m', null, 100);
    expect(pending).toEqual({ action: null, pendingSince: 100 });
    expect(key(secondKey, pending.pendingSince, 500)).toEqual({
      action,
      pendingSince: null,
    });
  });

  it('expires the sequence and cancels it for typing or modified keys', () => {
    expect(key('b', 100, 1101)).toEqual({ action: null, pendingSince: null });
    expect(key('b', 100, 200, { target: el('INPUT') })).toEqual({
      action: null,
      pendingSince: null,
    });
    expect(key('b', 100, 200, { shiftKey: true })).toEqual({
      action: null,
      pendingSince: null,
    });
  });
});

describe('project status keyboard sequence', () => {
  const body = el('BODY');
  const key = (
    value: string,
    pendingSince: number | null = null,
    now = 100,
    overrides: Partial<Parameters<typeof projectDetailSequenceFromKeyboard>[0]> = {},
  ) =>
    projectDetailSequenceFromKeyboard(
      {
        key: value,
        metaKey: false,
        ctrlKey: false,
        target: body,
        ...overrides,
      },
      pendingSince,
      now,
    );

  it('maps P then S to project status focus', () => {
    const pending = key('p');
    expect(pending).toEqual({ action: null, pendingSince: 100 });
    expect(key('s', pending.pendingSince, 500)).toEqual({
      action: 'focus-project-status',
      pendingSince: null,
    });
  });

  it('maps P then A to project lead focus', () => {
    const pending = key('p');
    expect(key('a', pending.pendingSince, 500)).toEqual({
      action: 'focus-project-lead',
      pendingSince: null,
    });
  });

  it('maps P then N to project initiatives focus', () => {
    const pending = key('p');
    expect(key('n', pending.pendingSince, 500)).toEqual({
      action: 'focus-project-initiatives',
      pendingSince: null,
    });
  });

  it('expires the sequence and ignores typing or modified keys', () => {
    expect(key('s', 100, 1101)).toEqual({ action: null, pendingSince: null });
    expect(key('p', null, 100, { target: el('INPUT') })).toEqual({
      action: null,
      pendingSince: null,
    });
    expect(key('p', null, 100, { shiftKey: true })).toEqual({
      action: null,
      pendingSince: null,
    });
  });
});

describe('initiative detail keyboard shortcuts', () => {
  const shortcut = (
    overrides: Partial<Parameters<typeof initiativeDetailShortcutFromKeyboard>[0]> = {},
  ) =>
    initiativeDetailShortcutFromKeyboard({
      key: 'u',
      metaKey: false,
      ctrlKey: false,
      shiftKey: true,
      target: el('BODY'),
      ...overrides,
    });

  it('opens the update composer with Ctrl+Shift+U or Meta+Shift+U', () => {
    expect(shortcut({ ctrlKey: true })).toBe('write-update');
    expect(shortcut({ metaKey: true })).toBe('write-update');
  });

  it('focuses initiative updates with Ctrl+U or Meta+U', () => {
    expect(shortcut({ ctrlKey: true, shiftKey: false })).toBe('focus-updates');
    expect(shortcut({ metaKey: true, shiftKey: false })).toBe('focus-updates');
  });

  it('focuses the target date with Ctrl+Alt+D or Meta+Alt+D', () => {
    expect(shortcut({ key: 'd', ctrlKey: true, shiftKey: false, altKey: true })).toBe(
      'focus-target-date',
    );
    expect(shortcut({ key: 'd', metaKey: true, shiftKey: false, altKey: true })).toBe(
      'focus-target-date',
    );
  });

  it('ignores typing, repeats, composition, and unrelated modifiers', () => {
    expect(shortcut({ target: el('TEXTAREA') })).toBeNull();
    expect(shortcut({ repeat: true })).toBeNull();
    expect(shortcut({ isComposing: true })).toBeNull();
    expect(shortcut({ ctrlKey: true, shiftKey: false, altKey: true })).toBeNull();
    expect(shortcut({ ctrlKey: true, altKey: true })).toBeNull();
    expect(
      shortcut({ key: 'd', ctrlKey: true, shiftKey: false, altKey: true, target: el('INPUT') }),
    ).toBeNull();
    expect(shortcut({ key: 'd', ctrlKey: true, shiftKey: true, altKey: true })).toBeNull();
  });
});

describe('issue copy shortcuts', () => {
  const body = el('BODY');
  const shortcut = (overrides: Partial<Parameters<typeof issueCopyShortcutFromKeyboard>[0]> = {}) =>
    issueCopyShortcutFromKeyboard({
      key: '',
      ctrlKey: false,
      metaKey: false,
      target: body,
      ...overrides,
    });

  it.each([{ ctrlKey: true }, { metaKey: true }])('supports platform modifier %#', (modifier) => {
    expect(shortcut({ ...modifier, key: '.', code: 'Period' })).toBe('copy-id');
    expect(shortcut({ ...modifier, key: '>', code: 'Period', shiftKey: true })).toBe('copy-branch');
    expect(shortcut({ ...modifier, key: '<', code: 'Comma', shiftKey: true })).toBe('copy-url');
    expect(shortcut({ ...modifier, key: '"', code: 'Quote', shiftKey: true })).toBe('copy-title');
    expect(shortcut({ ...modifier, key: 'c' })).toBe('copy-title-link');
    expect(shortcut({ ...modifier, key: 'c', altKey: true })).toBe('copy-everything');
    expect(shortcut({ ...modifier, key: 'p', altKey: true })).toBe('copy-prompt');
  });

  it('leaves editing, repeated, composing, and modified combinations alone', () => {
    expect(shortcut({ ctrlKey: true, key: '.', code: 'Period', target: el('INPUT') })).toBeNull();
    expect(shortcut({ ctrlKey: true, key: '.', code: 'Period', repeat: true })).toBeNull();
    expect(shortcut({ ctrlKey: true, key: '.', code: 'Period', isComposing: true })).toBeNull();
    expect(
      shortcut({ ctrlKey: true, key: 'c', code: 'KeyC', altKey: true, shiftKey: true }),
    ).toBeNull();
    expect(shortcut({ key: '.', code: 'Period' })).toBeNull();
  });
});

describe('submit shortcut', () => {
  it('requires a modifier and ignores IME confirmation and key repeat', () => {
    const key = { key: 'Enter', ctrlKey: false, metaKey: false };
    expect(isSubmitShortcut(key)).toBe(false);
    expect(isSubmitShortcut({ ...key, ctrlKey: true })).toBe(true);
    expect(isSubmitShortcut({ ...key, metaKey: true })).toBe(true);
    expect(isSubmitShortcut({ ...key, ctrlKey: true, isComposing: true })).toBe(false);
    expect(isSubmitShortcut({ ...key, ctrlKey: true, nativeEvent: { isComposing: true } })).toBe(
      false,
    );
    expect(isSubmitShortcut({ ...key, ctrlKey: true, repeat: true })).toBe(false);
  });

  it('uses the configured comment key and preserves Shift+Enter for line breaks', () => {
    const enter = { key: 'Enter', ctrlKey: false, metaKey: false };
    expect(isCommentSubmitShortcut(enter, 'modEnter')).toBe(false);
    expect(isCommentSubmitShortcut(enter, 'enter')).toBe(true);
    expect(isCommentSubmitShortcut({ ...enter, shiftKey: true }, 'enter')).toBe(false);
    expect(isCommentSubmitShortcut({ ...enter, isComposing: true }, 'enter')).toBe(false);
    expect(isCommentSubmitShortcut({ ...enter, ctrlKey: true }, 'enter')).toBe(true);
  });
});
