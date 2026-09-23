import type * as React from 'react';
type Props = {
  onClose: () => void;
};

export function useShortcutHelpPresenter({ onClose }: Props) {
  return {
    _view: 0 as const,
    handlers: {
      onClick0: () => onClose(),
      Keyboard_shortcuts_onClick1: (
        e: Parameters<NonNullable<React.ComponentProps<'div'>['onClick']>>[0],
      ) => e.stopPropagation(),
      onClick2: () => onClose(),
    },
  };
}
