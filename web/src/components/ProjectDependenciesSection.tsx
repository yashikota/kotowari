import { ActionIcon, Box, Button, Group, NativeSelect, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Project, ProjectDependency } from '../types.ts';
import { Section } from '../mantine-ui.tsx';

export function ProjectDependenciesSection({
  dependencies,
  projects,
  availableProjects,
  selectedProjectSlug,
  kind,
  onProjectChange,
  onKindChange,
  onAdd,
  onRemove,
}: {
  dependencies: ProjectDependency[];
  projects: Project[];
  availableProjects: Pick<Project, 'slug' | 'name'>[];
  selectedProjectSlug: string;
  kind: ProjectDependency['kind'];
  onProjectChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onKindChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (projectSlug: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Section title={t('projectDependencies.heading')}>
      <Box component="form" aria-label={t('projectDependencies.form')} onSubmit={onAdd}>
        <Group gap="xs" align="flex-end" wrap="wrap">
          <NativeSelect
            aria-label={t('projectDependencies.project')}
            value={selectedProjectSlug}
            onChange={onProjectChange}
            disabled={availableProjects.length === 0}
            data={[
              {
                value: '',
                label: availableProjects.length
                  ? t('projectDependencies.chooseProject')
                  : t('projectDependencies.noProjects'),
              },
              ...availableProjects.map((project) => ({
                value: project.slug,
                label: project.name,
              })),
            ]}
          />
          <NativeSelect
            aria-label={t('projectDependencies.kind')}
            value={kind}
            onChange={onKindChange}
            data={(['blocks', 'blocked_by', 'related'] as const).map((dependencyKind) => ({
              value: dependencyKind,
              label: t(`projectDependencies.kindOptions.${dependencyKind}`),
            }))}
          />
          <Button type="submit" variant="default" size="sm" disabled={!selectedProjectSlug}>
            {t('projectDependencies.add')}
          </Button>
        </Group>
      </Box>
      {dependencies.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('projectDependencies.empty')}
        </Text>
      ) : (
        <Stack
          component="ul"
          aria-label={t('projectDependencies.list')}
          gap="xs"
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          {dependencies.map((dependency) => {
            const relatedProject = projects.find(
              (project) => project.slug === dependency.projectSlug,
            );
            const relatedName = relatedProject?.name ?? dependency.projectSlug;
            return (
              <Group component="li" key={dependency.projectSlug} justify="space-between">
                <Group gap="xs">
                  <Text size="sm">{t(`projectDependencies.kindOptions.${dependency.kind}`)}</Text>
                  {relatedProject ? (
                    <Link to="/projects/$slug" params={{ slug: dependency.projectSlug }}>
                      {relatedName}
                    </Link>
                  ) : (
                    <Text size="sm">{relatedName}</Text>
                  )}
                </Group>
                <ActionIcon
                  type="button"
                  variant="subtle"
                  color="gray"
                  aria-label={t('projectDependencies.remove', { project: relatedName })}
                  onClick={() => onRemove(dependency.projectSlug)}
                >
                  <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                </ActionIcon>
              </Group>
            );
          })}
        </Stack>
      )}
    </Section>
  );
}
