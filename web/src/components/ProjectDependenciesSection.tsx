import { ActionIcon, Box, Button, Group, NativeSelect, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Project, ProjectDependency } from '../types.ts';
import { useRef } from 'react';
import { useActionFocusReturn } from '../focus.ts';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import actionStyles from '../design-system/ActionControl.module.css';
import type { useProjectDependencyChanges } from '../presenters/useProjectDependencyChanges.ts';
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
  changes,
  scope,
}: {
  dependencies: ProjectDependency[];
  projects: Project[];
  availableProjects: Pick<Project, 'slug' | 'name'>[];
  selectedProjectSlug: string;
  kind: ProjectDependency['kind'];
  onProjectChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onKindChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (projectSlug: string) => unknown;
  changes: ReturnType<typeof useProjectDependencyChanges>;
  scope: string;
}) {
  const { t } = useTranslation();
  const section = useRef<HTMLDivElement>(null);
  const run = useActionFocusReturn(
    changes.pending,
    () =>
      section.current?.querySelector<HTMLButtonElement>('[role=alert] button') ??
      section.current?.querySelector<HTMLSelectElement>('select:not(:disabled)') ??
      null,
    (active) => active === document.body || Boolean(active && section.current?.contains(active)),
    scope,
  );
  const disabled = changes.pending || changes.confirmed;

  return (
    <Section title={t('projectDependencies.heading')}>
      <div ref={section}>
        <Stack gap="sm">
          <Box
            component="form"
            aria-label={t('projectDependencies.form')}
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => onAdd(event));
            }}
          >
            <Group gap="xs" align="flex-end" wrap="wrap">
              <NativeSelect
                label={t('projectDependencies.project')}
                aria-label={t('projectDependencies.project')}
                value={selectedProjectSlug}
                onChange={onProjectChange}
                disabled={disabled || availableProjects.length === 0}
                styles={{ root: { flex: '1 1 180px', minWidth: 0 }, input: { minHeight: 44 } }}
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
                label={t('projectDependencies.kind')}
                disabled={disabled}
                aria-label={t('projectDependencies.kind')}
                value={kind}
                onChange={onKindChange}
                styles={{ root: { flex: '1 1 140px', minWidth: 0 }, input: { minHeight: 44 } }}
                data={(['blocks', 'blocked_by', 'related'] as const).map((dependencyKind) => ({
                  value: dependencyKind,
                  label: t(`projectDependencies.kindOptions.${dependencyKind}`),
                }))}
              />
              <Button
                type="submit"
                variant="default"
                size="sm"
                className={actionStyles.action}
                disabled={disabled || !selectedProjectSlug}
              >
                {t('projectDependencies.add')}
              </Button>
            </Group>
          </Box>
          <SaveFeedback
            saving={changes.pending}
            saved={changes.saved}
            error={changes.error}
            savingLabel={t(
              changes.confirmed
                ? 'dependencySave.refreshing'
                : changes.action === 'add'
                  ? 'dependencySave.adding'
                  : 'dependencySave.removing',
            )}
            savedLabel={t(
              changes.action === 'add' ? 'dependencySave.added' : 'dependencySave.removed',
            )}
            failureLabel={t(
              changes.confirmed ? 'dependencySave.refreshFailed' : 'dependencySave.failed',
            )}
            retryLabel={t(
              changes.confirmed ? 'dependencySave.retryRefresh' : 'dependencySave.retry',
            )}
            onRetry={() => run(changes.retry)}
          />
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
                    <Group
                      gap="xs"
                      style={{ flex: '1 1 180px', minWidth: 0, overflowWrap: 'anywhere' }}
                    >
                      <Text size="sm">
                        {t(`projectDependencies.kindOptions.${dependency.kind}`)}
                      </Text>
                      {relatedProject ? (
                        <Link to="/projects/$slug" params={{ slug: dependency.projectSlug }}>
                          {relatedName}
                        </Link>
                      ) : (
                        <Text size="sm">{relatedName}</Text>
                      )}
                    </Group>
                    <ActionIcon
                      size={44}
                      disabled={disabled}
                      type="button"
                      variant="subtle"
                      color="gray"
                      aria-label={t('projectDependencies.remove', { project: relatedName })}
                      onClick={() => run(() => onRemove(dependency.projectSlug))}
                    >
                      <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                    </ActionIcon>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Stack>
      </div>
    </Section>
  );
}
