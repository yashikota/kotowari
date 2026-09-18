import type * as React from 'react';
import { useState } from 'react';

type Props = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
};

export function useMarkdownFieldPresenter({ value, placeholder, onChange, onSave }: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  return {
    _view: 0 as const,
    value,
    placeholder,
    onChange,
    mode,
    handlers: {
      onClick0: () => setMode('edit'),
      onClick1: () => setMode('preview'),
      Markdown_body_onChange2: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => onChange(e.target.value),
      Markdown_body_onBlur3: () => onSave(value),
    },
  };
}
