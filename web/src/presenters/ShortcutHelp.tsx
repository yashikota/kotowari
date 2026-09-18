import type * as React from 'react';
type Props = {
  onClose: () => void;
};

export function useShortcutHelpPresenter({ onClose }: Props) {
  return {
    _view: 0 as const,
    handlers: {
      onClick0: (...args: Parameters<NonNullable<React.ComponentProps<'div'>['onClick']>>) => {
        const handle: NonNullable<React.ComponentProps<'div'>['onClick']> = onClose;
        return handle(...args);
      },
      Keyboard_shortcuts_onClick1: (
        e: Parameters<NonNullable<React.ComponentProps<'div'>['onClick']>>[0],
      ) => e.stopPropagation(),
      onClick2: (...args: Parameters<NonNullable<React.ComponentProps<'button'>['onClick']>>) => {
        const handle: NonNullable<React.ComponentProps<'button'>['onClick']> = onClose;
        return handle(...args);
      },
    },
  };
}
