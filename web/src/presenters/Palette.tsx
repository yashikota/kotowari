import type * as React from 'react';
import { useEffect, useState } from 'react';
import type { Command } from '../commands.ts';

type Props = {
  query: string;
  onQuery: (q: string) => void;
  commands: Command[];
  onPick: (id: string) => void;
  onClose: () => void;
};

export function usePalettePresenter({ query, onQuery, commands, onPick, onClose }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [query, commands.length]);

  return {
    _view: 0 as const,
    query,
    commands,
    active,
    handlers: {
      onClick0: (...args: Parameters<NonNullable<React.ComponentProps<'div'>['onClick']>>) => {
        const handle: NonNullable<React.ComponentProps<'div'>['onClick']> = onClose;
        return handle(...args);
      },
      Command_palette_onClick1: (
        e: Parameters<NonNullable<React.ComponentProps<'div'>['onClick']>>[0],
      ) => e.stopPropagation(),
      Command_search_onChange2: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => onQuery(e.target.value),
      Command_search_onKeyDown3: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActive((n) => Math.min(n + 1, Math.max(commands.length - 1, 0)));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActive((n) => Math.max(n - 1, 0));
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const id = commands[active]?.id;
          if (id) {
            onPick(id);
          }
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      },
      onMouseEnter4: (i: number) => setActive(i),
      onClick5: (c: Command) => onPick(c.id),
    },
  };
}
