import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { useTranslation } from 'react-i18next';
import type { IssueStatus, ProjectStatus } from '../types.ts';
import { IssueStatusIcon } from '../components/issue-ui.tsx';
import type { useConfigPagePresenter } from '../presenters/ConfigPages.tsx';

type Props = {
  model: ReturnType<typeof useConfigPagePresenter>;
  t: ReturnType<typeof useTranslation>['t'];
};

export function ConfigWorkflowSettingsSection({ model, t }: Props) {
  const {
    issueWorkflowStatuses,
    workflowError,
    workflowSaved,
    workflowDirty,
    projectWorkflowStatuses,
    projectWorkflowError,
    projectWorkflowSaved,
    projectWorkflowDirty,
    projectWorkflowFormOpen,
    projectWorkflowCategory,
    projectWorkflowName,
    projectWorkflowDescription,
  } = model;
  const { handlers } = model;

  return (
    <>
      <Stack
        id="settings-issue-statuses"
        tabIndex={-1}
        gap="md"
        component="section"
        aria-label={t('config.issueStatuses')}
      >
        <Title order={4}>{t('config.issueStatuses')}</Title>
        <Text size="sm" c="dimmed">
          {t('config.issueStatusesDescription')}
        </Text>
        {workflowError ? (
          <Alert color="red" variant="light" role="alert">
            {workflowError}
          </Alert>
        ) : null}
        {workflowSaved ? (
          <Alert color="green" variant="light" role="status">
            {t('config.workflowSaved')}
          </Alert>
        ) : null}
        {(
          [
            { id: 'backlog', category: 'backlog' },
            { id: 'todo', category: 'todo' },
            { id: 'in_progress', category: 'in_progress' },
            { id: 'done', category: 'done' },
            { id: 'canceled', category: 'canceled' },
            { id: 'duplicate', category: 'canceled', statusId: 'duplicate' },
          ] as { id: string; category: IssueStatus; statusId?: string }[]
        ).map(({ id, category, statusId }) => (
          <Stack key={id} component="section" aria-label={t(`issueStatus.${id}`)} gap="xs">
            <Group gap="xs">
              <IssueStatusIcon status={category} />
              <Text size="sm" fw={600}>
                {t(`issueStatus.${id}`)}
              </Text>
            </Group>
            {issueWorkflowStatuses
              .filter(
                (status) =>
                  status.category === category &&
                  (statusId ? status.id === statusId : status.id !== 'duplicate'),
              )
              .map((status) => (
                <Group key={status.id} align="flex-end" wrap="wrap" w="100%">
                  <TextInput
                    label={t('config.workflowStatusName', { status: status.name })}
                    value={status.name}
                    maxLength={48}
                    onChange={(event) =>
                      handlers.onWorkflowStatusNameChange(status.id, event.target.value)
                    }
                    style={{ flex: 1, minWidth: 150 }}
                  />
                  <TextInput
                    label={t('config.workflowStatusDescription', { status: status.name })}
                    value={status.description ?? ''}
                    maxLength={200}
                    onChange={(event) =>
                      handlers.onWorkflowStatusDescriptionChange(status.id, event.target.value)
                    }
                    style={{ flex: 1, minWidth: 150 }}
                  />
                  {['backlog', 'todo', 'in_progress', 'done', 'canceled', 'duplicate'].includes(
                    status.id,
                  ) ? null : (
                    <ActionIcon
                      type="button"
                      variant="subtle"
                      color="red"
                      aria-label={t('config.removeWorkflowStatus', {
                        status: status.name,
                      })}
                      onClick={() => handlers.onDeleteWorkflowStatus(status.id)}
                    >
                      <IconTrash size={16} aria-hidden />
                    </ActionIcon>
                  )}
                </Group>
              ))}
          </Stack>
        ))}
        <Box component="form" onSubmit={handlers.onAddWorkflowStatus}>
          <Group align="flex-end">
            <TextInput
              label={t('config.newWorkflowStatus')}
              value={model.workflowName}
              maxLength={48}
              onChange={handlers.onWorkflowNameChange}
            />
            <TextInput
              label={t('config.newWorkflowStatusDescription')}
              value={model.workflowDescription}
              maxLength={200}
              onChange={handlers.onWorkflowDescriptionChange}
            />
            <Select
              label={t('config.workflowCategory')}
              value={model.workflowCategory}
              onChange={handlers.onWorkflowCategoryChange}
              data={(['backlog', 'todo', 'in_progress', 'done', 'canceled'] as IssueStatus[]).map(
                (category) => ({
                  value: category,
                  label: t(`issueStatus.${category}`),
                }),
              )}
              allowDeselect={false}
            />
            <Button type="submit">{t('config.addWorkflowStatus')}</Button>
          </Group>
        </Box>
        <Box component="form" onSubmit={handlers.onSaveWorkflow}>
          <Button type="submit" disabled={!workflowDirty}>
            {t('config.saveWorkflow')}
          </Button>
        </Box>
      </Stack>

      <Stack
        id="settings-project-statuses"
        tabIndex={-1}
        gap="md"
        component="section"
        aria-label={t('config.projectStatuses')}
      >
        <Title order={4}>{t('config.projectStatuses')}</Title>
        <Text size="sm" c="dimmed">
          {t('config.projectStatusesDescription')}
        </Text>
        {projectWorkflowError ? (
          <Alert color="red" variant="light" role="alert">
            {projectWorkflowError}
          </Alert>
        ) : null}
        {projectWorkflowSaved ? (
          <Alert color="green" variant="light" role="status">
            {t('config.projectWorkflowSaved')}
          </Alert>
        ) : null}
        {(['backlog', 'planned', 'started', 'completed', 'canceled'] as ProjectStatus[]).map(
          (category) => (
            <Stack
              key={category}
              component="section"
              aria-label={t(`projectStatus.${category}`)}
              gap="xs"
            >
              <Text size="sm" fw={600}>
                {t(`projectStatus.${category}`)}
              </Text>
              {projectWorkflowStatuses
                .filter((status) => status.category === category)
                .map((status) => (
                  <Group key={status.id} align="flex-end" wrap="wrap" w="100%">
                    <TextInput
                      label={t('config.workflowStatusName', { status: status.name })}
                      value={status.name}
                      maxLength={48}
                      onChange={(event) =>
                        handlers.onProjectWorkflowStatusNameChange(status.id, event.target.value)
                      }
                      style={{ flex: 1, minWidth: 150 }}
                    />
                    <TextInput
                      label={t('config.workflowStatusDescription', { status: status.name })}
                      value={status.description ?? ''}
                      maxLength={200}
                      onChange={(event) =>
                        handlers.onProjectWorkflowStatusDescriptionChange(
                          status.id,
                          event.target.value,
                        )
                      }
                      style={{ flex: 1, minWidth: 150 }}
                    />
                    {['backlog', 'planned', 'started', 'completed', 'canceled'].includes(
                      status.id,
                    ) ? null : (
                      <ActionIcon
                        type="button"
                        variant="subtle"
                        color="red"
                        aria-label={t('config.removeWorkflowStatus', { status: status.name })}
                        onClick={() => handlers.onDeleteProjectWorkflowStatus(status.id)}
                      >
                        <IconTrash size={16} aria-hidden />
                      </ActionIcon>
                    )}
                  </Group>
                ))}
              <Button
                type="button"
                variant="subtle"
                size="compact-sm"
                onClick={() => handlers.onOpenProjectWorkflowStatus(category)}
              >
                {t('config.createProjectStatus')}
              </Button>
              {projectWorkflowFormOpen && projectWorkflowCategory === category ? (
                <Box component="form" onSubmit={handlers.onAddProjectWorkflowStatus}>
                  <Group align="flex-end" wrap="wrap">
                    <TextInput
                      label={t('config.newWorkflowStatus')}
                      value={projectWorkflowName}
                      maxLength={48}
                      onChange={handlers.onProjectWorkflowNameChange}
                    />
                    <TextInput
                      label={t('config.newWorkflowStatusDescription')}
                      value={projectWorkflowDescription}
                      maxLength={200}
                      onChange={handlers.onProjectWorkflowDescriptionChange}
                    />
                    <Button type="submit">{t('config.addWorkflowStatus')}</Button>
                    <Button
                      type="button"
                      variant="default"
                      onClick={handlers.onCloseProjectWorkflowStatus}
                    >
                      {t('config.cancelProjectStatus')}
                    </Button>
                  </Group>
                </Box>
              ) : null}
            </Stack>
          ),
        )}
        <Box component="form" onSubmit={handlers.onSaveProjectWorkflow}>
          <Button type="submit" disabled={!projectWorkflowDirty}>
            {t('config.saveWorkflow')}
          </Button>
        </Box>
      </Stack>
    </>
  );
}
