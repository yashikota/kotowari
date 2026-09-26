import { ActionIcon, Badge, Box, Button, Group, NativeSelect, Stack } from '@mantine/core';
import { IconLink, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { useProjectsPagePresenter } from '../presenters/ProjectsCycles.tsx';

type ProjectCreateDialogModel = ReturnType<typeof useProjectsPagePresenter>;
type DependencyModel = Pick<
  ProjectCreateDialogModel,
  | 'availableDependencyProjects'
  | 'dependencyDraftKind'
  | 'dependencyDraftOpen'
  | 'dependencyDraftProjectSlug'
  | 'initialDependencies'
  | 'projectNameBySlug'
>;
type DependencyHandlers = Pick<
  ProjectCreateDialogModel['handlers'],
  | 'onAddInitialDependency'
  | 'onCancelDependencyDraft'
  | 'onDependencyDraftKindChange'
  | 'onDependencyDraftProjectChange'
  | 'onOpenDependencyDraft'
  | 'onRemoveInitialDependency'
>;

export function ProjectCreateDependencyQuickAdd({
  available,
  onOpen,
}: {
  available: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      variant="default"
      size="xs"
      leftSection={<IconLink size={14} stroke={1.7} aria-hidden="true" />}
      disabled={!available}
      onClick={onOpen}
    >
      {t('projectDependencies.addFromCreate')}
    </Button>
  );
}

export function ProjectCreateDependencySummary({
  model,
  handlers,
}: {
  model: DependencyModel;
  handlers: DependencyHandlers;
}) {
  const { t } = useTranslation();

  if (model.initialDependencies.length === 0 && !model.dependencyDraftOpen) return null;

  return (
    <Stack gap="xs">
      {model.initialDependencies.length > 0 && (
        <Group gap="xs" wrap="wrap" aria-label={t('projectDependencies.heading')}>
          {model.initialDependencies.map((dependency) => {
            const projectName =
              model.projectNameBySlug[dependency.projectSlug] ?? dependency.projectSlug;

            return (
              <Group key={dependency.projectSlug} gap={4} wrap="nowrap">
                <Badge variant="light" color="gray" size="sm">
                  {t(`projectDependencies.kindOptions.${dependency.kind}`)} {projectName}
                </Badge>
                <ActionIcon
                  type="button"
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label={t('projectDependencies.remove', { project: projectName })}
                  onClick={() => handlers.onRemoveInitialDependency(dependency.projectSlug)}
                >
                  <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                </ActionIcon>
              </Group>
            );
          })}
        </Group>
      )}
      {model.dependencyDraftOpen && (
        <Box
          p="sm"
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
          }}
        >
          <Stack gap="xs">
            <Group grow>
              <NativeSelect
                aria-label={t('projectDependencies.project')}
                value={model.dependencyDraftProjectSlug}
                onChange={handlers.onDependencyDraftProjectChange}
                data={[
                  { value: '', label: t('projectDependencies.chooseProject') },
                  ...model.availableDependencyProjects.map((candidate) => ({
                    value: candidate.slug,
                    label: candidate.name,
                  })),
                ]}
              />
              <NativeSelect
                aria-label={t('projectDependencies.kind')}
                value={model.dependencyDraftKind}
                onChange={handlers.onDependencyDraftKindChange}
                data={(['blocks', 'blocked_by', 'related'] as const).map((kind) => ({
                  value: kind,
                  label: t(`projectDependencies.kindOptions.${kind}`),
                }))}
              />
            </Group>
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={handlers.onCancelDependencyDraft}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                disabled={!model.dependencyDraftProjectSlug}
                onClick={handlers.onAddInitialDependency}
              >
                {t('projectDependencies.add')}
              </Button>
            </Group>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
