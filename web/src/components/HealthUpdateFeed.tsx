import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { MarkdownContent } from '../mantine-ui.tsx';
import { renderMarkdown } from '../markdown.ts';
import type { ProjectHealth } from '../types.ts';

export type HealthUpdateItem = {
  id: number;
  health: ProjectHealth;
  body: string;
  createdAt: string;
};

export function HealthUpdateFeed({
  updates,
  emptyLabel,
  posted = false,
}: {
  updates: HealthUpdateItem[];
  emptyLabel: string;
  posted?: boolean;
}) {
  const { t, i18n } = useTranslation();
  if (updates.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {posted && (
        <Text role="status" size="sm" c="dimmed">
          {t('healthUpdate.posted')}
        </Text>
      )}
      <Stack component="ol" gap="sm" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {updates.map((update) => {
          const date = new Date(update.createdAt);
          const timestamp = Number.isNaN(date.getTime())
            ? update.createdAt
            : new Intl.DateTimeFormat(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(date);
          return (
            <Card component="li" key={update.id} withBorder padding="sm" radius="sm">
              <Stack gap="xs">
                <Group justify="space-between" gap="md" wrap="wrap">
                  <Badge variant="light" color={healthColor(update.health)}>
                    {t(`projectHealth.status.${update.health}`)}
                  </Badge>
                  <Text component="time" dateTime={update.createdAt} size="xs" c="dimmed">
                    {timestamp}
                  </Text>
                </Group>
                <MarkdownContent html={renderMarkdown(update.body)} />
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}

function healthColor(health: ProjectHealth) {
  switch (health) {
    case 'on_track':
      return 'green';
    case 'at_risk':
      return 'yellow';
    case 'off_track':
      return 'red';
  }
}
