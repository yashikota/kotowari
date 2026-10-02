import { Box, Group } from '@mantine/core';
import type { ReactNode } from 'react';
import styles from './ManagementRow.module.css';

export function ManagementRow({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <Box role="listitem" className={styles.row}>
      <Box className={styles.content}>{children}</Box>
      <Group className={styles.actions} gap="xs" wrap="wrap" justify="flex-end">
        {actions}
      </Group>
    </Box>
  );
}
