import { Link } from '@tanstack/react-router';
import { Button, Group, Kbd, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function ViewsEmptyState({
  title,
  description,
  createLabel,
  documentationLabel,
  onCreate,
}: {
  title: string;
  description: string;
  createLabel: string;
  documentationLabel: string;
  onCreate: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Stack
      component="section"
      aria-label={t('nav.views')}
      align="flex-start"
      justify="center"
      gap="sm"
      px="md"
      py="xl"
      style={{ flex: 1, minHeight: 280, width: 'min(360px, 100%)', marginInline: 'auto' }}
    >
      <svg
        aria-hidden="true"
        width="116"
        height="72"
        viewBox="0 0 116 72"
        fill="none"
        stroke="var(--mantine-color-dimmed)"
        strokeWidth="1.1"
        strokeLinejoin="round"
      >
        <rect x="26" y="3" width="64" height="49" rx="5" />
        <path d="M36 15h44M36 25h28M36 35h37M36 45h20" />
        <rect x="15" y="13" width="64" height="49" rx="5" fill="var(--mantine-color-body)" />
        <path d="M25 25h44M25 35h28M25 45h37M25 55h20" />
        <rect x="4" y="23" width="64" height="46" rx="5" fill="var(--mantine-color-body)" />
        <path d="M14 35h44M14 45h28M14 55h37" />
      </svg>
      <Text component="h2" fw={600} size="md">
        {title}
      </Text>
      <Text c="dimmed" size="sm" maw={360}>
        {description}
      </Text>
      <Text c="dimmed" size="sm">
        {t('views.shortcutHintBefore')} <Kbd>Alt</Kbd> <Kbd>V</Kbd> {t('views.shortcutHintAfter')}
      </Text>
      <Group gap={8} mt="xs" justify="flex-start" wrap="wrap">
        <Button
          type="button"
          variant="filled"
          size="xs"
          leftSection={<IconPlus size={14} aria-hidden />}
          onClick={onCreate}
        >
          {createLabel}
        </Button>
        <Button component={Link} to="/pages" variant="default" size="xs">
          {documentationLabel}
        </Button>
      </Group>
    </Stack>
  );
}
