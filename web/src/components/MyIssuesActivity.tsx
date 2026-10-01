import { Link } from '@tanstack/react-router';
import { Box, Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { formatActivity } from '../activity.ts';
import { EmptyState } from '../mantine-ui.tsx';
import type { Activity } from '../types.ts';

export type MyIssueActivityItem = {
  identifier: string;
  title: string;
  activity: Activity;
};

export function MyIssuesActivity({
  items,
  onCreateIssue,
}: {
  items: MyIssueActivityItem[];
  onCreateIssue: () => void;
}) {
  const { t } = useTranslation();
  if (items.length === 0)
    return (
      <EmptyState action={<Button onClick={onCreateIssue}>{t('commands.createIssue')}</Button>}>
        {t('myIssues.emptyActivity')}
      </EmptyState>
    );
  return (
    <ScrollArea style={{ flex: 1, minHeight: 0 }}>
      <Stack component="ol" gap={0} p={0} m={0} role="list" aria-label={t('myIssues.activity')}>
        {items.map(({ identifier, title, activity }) => (
          <Box
            component="li"
            key={`${identifier}:${activity.id}`}
            px="md"
            py="sm"
            style={{
              listStyle: 'none',
              borderBottom: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
              <Text size="sm" style={{ minWidth: 0 }}>
                <Link to="/issues/$identifier" params={{ identifier }}>
                  <Text component="span" size="sm" fw={600} mr={8}>
                    {identifier}
                  </Text>
                  <Text component="span" size="sm" c="dimmed">
                    {title}
                  </Text>
                </Link>
                <Text component="span" size="sm" ml={8}>
                  {formatActivity(activity.action, activity.payload)}
                </Text>
              </Text>
              <Text component="time" size="xs" c="dimmed" dateTime={activity.createdAt}>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(activity.createdAt))}
              </Text>
            </Group>
          </Box>
        ))}
      </Stack>
    </ScrollArea>
  );
}
