import { Link } from '@tanstack/react-router';
import { Button, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function ViewEntityTabs({ active }: { active: 'issues' | 'projects' }) {
  const { t } = useTranslation();
  return (
    <Group component="nav" aria-label={t('viewBuilder.entity')} role="tablist" gap={4}>
      <Button
        component={Link}
        to="/views/new"
        role="tab"
        aria-selected={active === 'issues'}
        variant={active === 'issues' ? 'light' : 'subtle'}
        color="gray"
        radius="xl"
        size="xs"
      >
        {t('viewBuilder.issues')}
      </Button>
      <Button
        component={Link}
        to="/views/projects/new"
        role="tab"
        aria-selected={active === 'projects'}
        variant={active === 'projects' ? 'light' : 'subtle'}
        color="gray"
        radius="xl"
        size="xs"
      >
        {t('viewBuilder.projects')}
      </Button>
    </Group>
  );
}
