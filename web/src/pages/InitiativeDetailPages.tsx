import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Menu,
  MultiSelect,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconArrowLeft, IconDotsVertical, IconStar, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { EntityReminderMenu } from '../components/EntityReminderMenu.tsx';
import { PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';
import {
  INITIATIVE_COLORS,
  INITIATIVE_HEALTH,
  INITIATIVE_STATUSES,
} from '../initiative-options.ts';
import { HealthUpdateComposer } from '../components/HealthUpdateComposer.tsx';
import { HealthUpdateFeed } from '../components/HealthUpdateFeed.tsx';
import { useFocusWhen } from '../focus.ts';
import { useInitiativeDetailPresenter } from '../presenters/InitiativesPages.tsx';

export function InitiativeDetailPageView({
  model,
}: {
  model: ReturnType<typeof useInitiativeDetailPresenter> & {
    ownerRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
    targetDateRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
    updatesRef: ReturnType<typeof useFocusWhen<HTMLDivElement>>;
  };
}) {
  const { t } = useTranslation();
  const {
    initiative,
    availableProjects,
    owner,
    ownerRef,
    linkedProjects,
    name,
    description,
    status,
    color,
    startDate,
    targetDate,
    targetDateRef,
    updatesRef,
    priority,
    health,
    updates,
    labels,
    availableLabels,
    projectSlugs,
    error,
    saving,
    copied,
    updateOpen,
    updateHealth,
    updateBody,
    updateError,
    updating,
    handlers,
  } = model;
  return (
    <SplitLayout single>
      <Pane single>
        <PageHeader
          title={initiative.name}
          actions={
            <Group gap="xs">
              <EntityReminderMenu
                reminderAt={initiative.reminderAt}
                opened={model.reminderMenuOpen}
                onMenuChange={handlers.onReminderMenuChange}
                onSetReminder={handlers.onSetReminder}
              />
              {copied ? (
                <Text size="xs" c="dimmed" role="status">
                  {t('ui.copied')}
                </Text>
              ) : null}
              <Menu withinPortal position="bottom-end">
                <Menu.Target>
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    aria-label={t('issueActions.moreActions')}
                    title={t('issueActions.moreActions')}
                  >
                    <IconDotsVertical size={16} stroke={1.8} aria-hidden="true" />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={handlers.onCopyInitiativeId}>
                    {t('issueActions.copyId')}
                  </Menu.Item>
                  <Menu.Item onClick={handlers.onCopyInitiativeURL}>
                    {t('issueActions.copyUrl')}
                  </Menu.Item>
                  <Menu.Item onClick={handlers.onCopyInitiativeTitle}>
                    {t('issueActions.copyTitle')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <ActionIcon
                type="button"
                variant="subtle"
                color={initiative.isFavorite ? 'yellow' : 'gray'}
                aria-label={t(
                  initiative.isFavorite ? 'initiatives.favoriteRemove' : 'initiatives.favoriteAdd',
                )}
                aria-pressed={!!initiative.isFavorite}
                title={t(
                  initiative.isFavorite ? 'initiatives.favoriteRemove' : 'initiatives.favoriteAdd',
                )}
                onClick={handlers.onToggleFavorite}
              >
                <IconStar
                  size={15}
                  stroke={1.7}
                  fill={initiative.isFavorite ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
              </ActionIcon>
              <Button
                type="button"
                variant="default"
                leftSection={<IconArrowLeft size={15} />}
                onClick={handlers.onBack}
              >
                {t('nav.initiatives')}
              </Button>
              <Button
                type="button"
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={15} />}
                onClick={handlers.onDelete}
              >
                {t('initiatives.delete')}
              </Button>
            </Group>
          }
        />
        <form onSubmit={handlers.onSubmit}>
          <Stack p="md" maw={900} style={{ overflow: 'auto', minHeight: 0 }}>
            <Group grow align="flex-start">
              <TextInput
                label={t('initiatives.name')}
                value={name}
                onChange={handlers.onNameChange}
                required
                maxLength={120}
              />
              <Select
                label={t('initiatives.status')}
                value={status}
                onChange={handlers.onStatusChange}
                data={INITIATIVE_STATUSES.map((value) => ({
                  value,
                  label: handlers.onStatusLabel(value),
                }))}
              />
              <Select
                label={t('initiatives.color')}
                value={color}
                onChange={handlers.onColorChange}
                data={INITIATIVE_COLORS.map((value) => ({ value, label: value }))}
              />
            </Group>
            <Textarea
              label={t('initiatives.description')}
              value={description}
              onChange={handlers.onDescriptionChange}
              minRows={5}
              autosize
            />
            <Group grow>
              <TextInput
                type="date"
                label={t('initiatives.startDate')}
                value={startDate}
                onChange={handlers.onStartDateChange}
              />
              <TextInput
                ref={targetDateRef}
                type="date"
                label={t('initiatives.targetDate')}
                value={targetDate}
                onChange={handlers.onTargetDateChange}
              />
            </Group>
            <Group grow align="flex-start">
              <Select
                ref={ownerRef}
                label={t('initiatives.owner')}
                value={owner}
                onChange={handlers.onOwnerChange}
                data={[
                  { value: '', label: t('projectList.leadUnassigned') },
                  { value: 'self', label: t('projectList.leadYou') },
                ]}
                searchable
                openOnFocus
                comboboxProps={{ withinPortal: false }}
              />
              <Select
                label={t('initiativeList.priority')}
                value={String(priority)}
                onChange={handlers.onPriorityChange}
                data={['0', '1', '2', '3', '4'].map((value) => ({
                  value,
                  label: t(`initiativeList.priorityValue.${value}`),
                }))}
              />
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  {t('initiativeList.health')}
                </Text>
                <Group gap="xs" wrap="nowrap">
                  <Badge
                    variant="light"
                    color={health ? 'green' : 'gray'}
                    aria-label={t('initiativeList.health')}
                  >
                    {health
                      ? t(`initiativeList.healthValue.${health}`)
                      : t('initiativeList.noHealth')}
                  </Badge>
                  <Button type="button" size="compact-sm" onClick={handlers.onOpenUpdate}>
                    {t('initiativeUpdates.postButton')}
                  </Button>
                </Group>
              </Stack>
              <MultiSelect
                label={t('initiativeList.labels')}
                value={labels}
                onChange={handlers.onLabelsChange}
                data={availableLabels}
                searchable
                clearable
              />
            </Group>
            <MultiSelect
              label={t('initiatives.addProjects')}
              aria-label={t('initiatives.addProjects')}
              value={projectSlugs}
              onChange={handlers.onProjectSlugsChange}
              data={availableProjects}
              searchable
              clearable
              comboboxProps={{ withinPortal: false }}
            />
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                {t('initiatives.projects')}
              </Text>
              {linkedProjects.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t('initiatives.noProjects')}
                </Text>
              ) : (
                <Group gap="xs">
                  {linkedProjects.map((project) => (
                    <Button
                      key={project.slug}
                      type="button"
                      size="compact-sm"
                      variant="default"
                      onClick={() => handlers.onProjectOpen(project.slug)}
                    >
                      {project.name}
                    </Button>
                  ))}
                </Group>
              )}
            </Stack>
            {error ? (
              <Text c="red" role="alert">
                {error}
              </Text>
            ) : null}
            <Group justify="flex-end">
              <Button type="submit" loading={saving} disabled={!name.trim()}>
                {t('initiatives.save')}
              </Button>
            </Group>
          </Stack>
        </form>
        <Stack
          ref={updatesRef}
          tabIndex={-1}
          aria-label={t('initiativeUpdates.heading')}
          p="md"
          pt={0}
          maw={900}
          gap="sm"
          style={{ overflow: 'auto', minHeight: 0 }}
        >
          <Group justify="space-between" align="center">
            <Text size="lg" fw={600}>
              {t('initiativeUpdates.heading')}
            </Text>
            <Button type="button" variant="subtle" onClick={handlers.onOpenUpdate}>
              {t('initiativeUpdates.postButton')}
            </Button>
          </Group>
          <HealthUpdateFeed updates={updates} emptyLabel={t('initiativeUpdates.empty')} />
        </Stack>
        <HealthUpdateComposer
          opened={updateOpen}
          onClose={handlers.onCloseUpdate}
          title={t('initiativeUpdates.modalTitle')}
          onSubmit={handlers.onSubmitUpdate}
          healthLabel={t('initiativeUpdates.health')}
          health={updateHealth}
          healthOptions={INITIATIVE_HEALTH.map((value) => ({
            value,
            label: t(`initiativeList.healthValue.${value}`),
          }))}
          onHealthChange={handlers.onUpdateHealthChange}
          bodyLabel={t('initiativeUpdates.body')}
          bodyPlaceholder={t('initiativeUpdates.bodyPlaceholder')}
          body={updateBody}
          onBodyChange={handlers.onUpdateBodyChange}
          cancelLabel={t('common.cancel')}
          submitLabel={t('initiativeUpdates.postButton')}
          error={updateError}
          submitting={updating}
        />
      </Pane>
    </SplitLayout>
  );
}

export function InitiativeDetailPage() {
  return (
    <PresenterScope name="InitiativeDetailPage">
      <InitiativeDetailPageBinding />
    </PresenterScope>
  );
}

function InitiativeDetailPageBinding() {
  const model = useInitiativeDetailPresenter();
  const handlers = useActions(model.handlers);
  const ownerRef = useFocusWhen<HTMLInputElement>(model.focusOwner > 0, [model.focusOwner]);
  const targetDateRef = useFocusWhen<HTMLInputElement>(model.focusTargetDate > 0, [
    model.focusTargetDate,
  ]);
  const updatesRef = useFocusWhen<HTMLDivElement>(model.focusUpdates > 0, [model.focusUpdates]);
  return (
    <InitiativeDetailPageView
      model={
        { ...model, handlers, ownerRef, targetDateRef, updatesRef } as typeof model & {
          ownerRef: typeof ownerRef;
          targetDateRef: typeof targetDateRef;
          updatesRef: typeof updatesRef;
        }
      }
    />
  );
}
