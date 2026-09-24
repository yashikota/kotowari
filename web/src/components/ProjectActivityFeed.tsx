import { Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export type ProjectActivityItem = {
  id: number;
  message: string;
  createdAt: string;
};

export function ProjectActivityFeed({
  activities,
  emptyLabel,
}: {
  activities: ProjectActivityItem[];
  emptyLabel: string;
}) {
  const { i18n } = useTranslation();
  if (activities.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Stack
      component="ol"
      gap="sm"
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
      aria-label={emptyLabel}
    >
      {activities.map((activity) => {
        const date = new Date(activity.createdAt);
        const timestamp = Number.isNaN(date.getTime())
          ? activity.createdAt
          : new Intl.DateTimeFormat(i18n.language, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(date);
        return (
          <Group component="li" key={activity.id} justify="space-between" gap="md" wrap="wrap">
            <Text size="sm">{activity.message}</Text>
            <Text component="time" dateTime={activity.createdAt} size="xs" c="dimmed">
              {timestamp}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}
