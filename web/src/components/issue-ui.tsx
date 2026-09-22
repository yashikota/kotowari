import type { ReactNode } from 'react';
import { Text, type BoxProps } from '@mantine/core';
import {
  IconAlertTriangle,
  IconAntennaBars1,
  IconAntennaBars3,
  IconAntennaBars5,
  IconCircle,
  IconCircleCheck,
  IconCircleDashed,
  IconCircleX,
  IconProgress,
} from '@tabler/icons-react';
import type { IssueStatus } from '../types.ts';

const STATUS_ICON_SIZE = 14;

export function IssueStatusIcon({ status }: { status: IssueStatus }) {
  switch (status) {
    case 'backlog':
      return (
        <IconCircleDashed
          size={STATUS_ICON_SIZE}
          stroke={1.75}
          color="var(--mantine-color-gray-5)"
        />
      );
    case 'todo':
      return (
        <IconCircle size={STATUS_ICON_SIZE} stroke={1.75} color="var(--mantine-color-gray-5)" />
      );
    case 'in_progress':
      return (
        <IconProgress size={STATUS_ICON_SIZE} stroke={1.75} color="var(--mantine-color-yellow-5)" />
      );
    case 'done':
      return (
        <IconCircleCheck
          size={STATUS_ICON_SIZE}
          stroke={1.75}
          color="var(--mantine-color-teal-5)"
        />
      );
    case 'canceled':
      return (
        <IconCircleX size={STATUS_ICON_SIZE} stroke={1.75} color="var(--mantine-color-gray-6)" />
      );
  }
}

export function IssuePriorityIcon({ priority }: { priority: number }) {
  if (priority <= 0) {
    return null;
  }
  if (priority === 1) {
    return <IconAlertTriangle size={13} stroke={1.75} color="var(--mantine-color-red-5)" />;
  }
  if (priority === 2) {
    return <IconAntennaBars5 size={13} stroke={1.75} color="var(--mantine-color-orange-5)" />;
  }
  if (priority === 3) {
    return <IconAntennaBars3 size={13} stroke={1.75} color="var(--mantine-color-gray-5)" />;
  }
  return <IconAntennaBars1 size={13} stroke={1.75} color="var(--mantine-color-gray-6)" />;
}

export function IssueLabelPill({ name, color }: { name: string; color: string }) {
  return (
    <Text
      size="xs"
      lh={1.2}
      px={6}
      py={2}
      style={{
        borderRadius: 4,
        backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
        color: 'var(--mantine-color-gray-3)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {name}
    </Text>
  );
}

export function IssueMetaText({ children, ...props }: BoxProps & { children: ReactNode }) {
  return (
    <Text
      component="span"
      size="xs"
      c="dimmed"
      style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
      {...props}
    >
      {children}
    </Text>
  );
}
