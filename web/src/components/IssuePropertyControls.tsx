import { Select } from '@mantine/core';
import type { ReactNode } from 'react';
import { useFocusWhen } from '../focus.ts';
import type { SelectProps } from '@mantine/core';
import { Text } from '@mantine/core';
import styles from './IssuePropertiesPanel.module.css';

export function IssuePropertyRow({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={[styles.row, className].filter(Boolean).join(' ')}>
      <div className={styles.label}>
        <Text component="span" size="sm" c="dimmed" truncate className={styles.labelText}>
          {label}
        </Text>
      </div>
      <div className={styles.value}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

export function IssuePropertySelect({
  compactChars = 10,
  compactLabel,
  ...props
}: SelectProps<string> & { compactChars?: number; compactLabel?: string }) {
  const inputRef = useFocusWhen<HTMLInputElement>(Boolean(props.dropdownOpened));
  const labelWidth = Array.from(compactLabel ?? props.value ?? '').reduce(
    (width, character) => width + ((character.codePointAt(0) ?? 0) <= 0xff ? 1 : 2),
    0,
  );
  const inputWidth = Math.max(4, Math.min(compactChars, labelWidth + 2));
  return (
    <Select
      {...props}
      ref={inputRef}
      comboboxProps={{ width: 240, ...props.comboboxProps }}
      size="sm"
      className={styles.select}
      classNames={{ input: styles.input, option: styles.option, dropdown: styles.dropdown }}
      styles={{ input: { width: `${inputWidth}ch` } }}
      rightSection={null}
      withCheckIcon={false}
    />
  );
}
