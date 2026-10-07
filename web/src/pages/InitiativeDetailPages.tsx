import {
  ActionIcon,
  Badge,
  Box,
  SimpleGrid,
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
import { IconArrowLeft, IconDotsVertical, IconStar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import { ConfirmActionDialog } from '../design-system/ConfirmActionDialog.tsx';
import {
  UnsavedChangesDialog,
  useUnsavedNavigation,
} from '../design-system/UnsavedChangesDialog.tsx';
import actionStyles from '../design-system/ActionControl.module.css';
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
import { useActionFocusReturn, useFocusWhen } from '../focus.ts';
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
  const form = useRef<HTMLFormElement>(null);
  const navigation = useUnsavedNavigation({
    dirty: (model.editor.dirty || model.healthUpdate.dirty) && !model.deletion.confirmed,
    pending:
      model.editor.pending ||
      model.healthUpdate.pending ||
      (model.deletion.pending && !model.deletion.confirmed),
    error: model.editor.error || model.healthUpdate.error,
    scope: model.initiative.slug,
    save: model.handlers.onSaveBeforeLeaving,
  });
  const runSave = useActionFocusReturn(
    model.editor.pending,
    () =>
      navigation.opened
        ? null
        : (form.current?.querySelector<HTMLButtonElement>(
            '[role="alert"] button:not(:disabled), button[type="submit"]:not(:disabled)',
          ) ?? null),
    (active) => active === document.body || Boolean(active && form.current?.contains(active)),
    `${model.initiative.slug}:${navigation.opened}`,
  );
  const nameRef = useFocusWhen<HTMLInputElement>(
    Boolean(model.editor.nameError) && !navigation.opened,
    [model.initiative.slug],
  );
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
        <Box
          style={{ display: 'contents' }}
          inert={model.deletion.pending || model.deletion.confirmed ? true : undefined}
        >
          <PageHeader
            title={initiative.name}
            actions={
              <Group gap="xs">
                <EntityReminderMenu
                  editor={model.reminderEditor}
                  onOpenCustom={handlers.onOpenCustomReminder}
                  onCloseCustom={handlers.onCloseCustomReminder}
                  onCustomChange={handlers.onCustomReminderChange}
                  onCustomSave={handlers.onCustomReminderSave}
                  onRetry={handlers.onRetryReminder}
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
                      data-initiative-actions
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
                    <Menu.Divider />
                    <Menu.Item color="red" disabled={saving} onClick={handlers.onDelete}>
                      {t('initiatives.delete')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <ActionIcon
                  type="button"
                  variant="subtle"
                  color={initiative.isFavorite ? 'yellow' : 'gray'}
                  aria-label={t(
                    initiative.isFavorite
                      ? 'initiatives.favoriteRemove'
                      : 'initiatives.favoriteAdd',
                  )}
                  aria-pressed={!!initiative.isFavorite}
                  title={t(
                    initiative.isFavorite
                      ? 'initiatives.favoriteRemove'
                      : 'initiatives.favoriteAdd',
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
              </Group>
            }
          />
          <form
            ref={form}
            aria-busy={saving}
            onSubmit={(event) => {
              event.preventDefault();
              void runSave(() => handlers.onSubmit(event));
            }}
          >
            <Stack p="md" maw={960} mx="auto" w="100%" style={{ minHeight: 0 }}>
              <Box component="fieldset" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      ref={nameRef}
                      readOnly={model.editor.pending || model.editor.confirmed}
                      label={t('initiatives.name')}
                      error={model.editor.nameError}
                      value={name}
                      onChange={handlers.onNameChange}
                      required
                      maxLength={120}
                    />
                    <Select
                      readOnly={model.editor.pending || model.editor.confirmed}
                      label={t('initiatives.status')}
                      value={status}
                      onChange={handlers.onStatusChange}
                      data={INITIATIVE_STATUSES.map((value) => ({
                        value,
                        label: t(`initiatives.${value}`),
                      }))}
                    />
                    <Select
                      readOnly={model.editor.pending || model.editor.confirmed}
                      label={t('initiatives.color')}
                      value={color}
                      onChange={handlers.onColorChange}
                      data={INITIATIVE_COLORS.map((value) => ({ value, label: value }))}
                    />
                  </SimpleGrid>
                  <Textarea
                    readOnly={model.editor.pending || model.editor.confirmed}
                    label={t('initiatives.description')}
                    value={description}
                    onChange={handlers.onDescriptionChange}
                    minRows={5}
                    autosize
                  />
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      readOnly={model.editor.pending || model.editor.confirmed}
                      type="date"
                      label={t('initiatives.startDate')}
                      value={startDate}
                      onChange={handlers.onStartDateChange}
                    />
                    <TextInput
                      readOnly={model.editor.pending || model.editor.confirmed}
                      ref={targetDateRef}
                      type="date"
                      label={t('initiatives.targetDate')}
                      value={targetDate}
                      onChange={handlers.onTargetDateChange}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <Select
                      readOnly={model.editor.pending || model.editor.confirmed}
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
                      readOnly={model.editor.pending || model.editor.confirmed}
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
                      <Group gap="xs" wrap="wrap">
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
                      readOnly={model.editor.pending || model.editor.confirmed}
                      label={t('initiativeList.labels')}
                      value={labels}
                      onChange={handlers.onLabelsChange}
                      data={availableLabels}
                      searchable
                      clearable
                    />
                  </SimpleGrid>
                  <MultiSelect
                    readOnly={model.editor.pending || model.editor.confirmed}
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
                  <SaveFeedback
                    saving={model.editor.pending}
                    saved={model.editor.saved && !model.editor.pending}
                    error={model.editor.error}
                    savingLabel={t(
                      model.editor.confirmed
                        ? 'initiativeSave.refreshing'
                        : 'initiativeSave.saving',
                    )}
                    savedLabel={t('initiativeSave.saved')}
                    failureLabel={t(
                      model.editor.confirmed
                        ? 'initiativeSave.refreshFailed'
                        : 'initiativeSave.failed',
                    )}
                    retryLabel={t(
                      model.editor.confirmed
                        ? 'initiativeSave.retryRefresh'
                        : 'initiativeSave.retry',
                    )}
                    onRetry={() => runSave(handlers.onRetrySave)}
                  />
                  <Group justify="flex-end">
                    <Button
                      className={actionStyles.action}
                      type="submit"
                      loading={saving}
                      disabled={
                        !name.trim() || saving || !model.editor.dirty || model.editor.confirmed
                      }
                    >
                      {t('initiatives.save')}
                    </Button>
                  </Group>
                </Stack>
              </Box>
            </Stack>
          </form>
          <Stack
            ref={updatesRef}
            tabIndex={-1}
            aria-label={t('initiativeUpdates.heading')}
            p="md"
            pt={0}
            maw={960}
            mx="auto"
            w="100%"
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
            <HealthUpdateFeed
              updates={updates}
              emptyLabel={t('initiativeUpdates.empty')}
              posted={model.healthUpdate.saved}
            />
          </Stack>
        </Box>
        <UnsavedChangesDialog
          state={navigation}
          title={t('unsavedInitiative.title')}
          description={t('unsavedInitiative.description')}
          stayLabel={t('unsavedInitiative.stay')}
          discardLabel={t('unsavedInitiative.discard')}
          saveLabel={t('unsavedInitiative.save')}
          savingLabel={t(
            model.deletion.pending
              ? 'initiativeDeletion.deleting'
              : model.editor.pending
                ? model.editor.confirmed
                  ? 'initiativeSave.refreshing'
                  : 'initiativeSave.saving'
                : model.healthUpdate.confirmed
                  ? 'healthUpdate.refreshing'
                  : 'healthUpdate.posting',
          )}
          failureLabel={t(
            model.editor.error
              ? model.editor.confirmed
                ? 'initiativeSave.refreshFailed'
                : 'initiativeSave.failed'
              : model.healthUpdate.confirmed
                ? 'healthUpdate.refreshFailed'
                : 'healthUpdate.failed',
          )}
        />
        <ConfirmActionDialog
          returnFocusTo={() =>
            navigation.opened
              ? null
              : document.querySelector<HTMLButtonElement>('[data-initiative-actions]')
          }
          opened={model.deletion.opened && !navigation.opened}
          title={t(
            model.deletion.confirmed ? 'initiativeDeletion.deleted' : 'initiativeDeletion.title',
          )}
          description={t(
            model.deletion.confirmed
              ? 'initiativeDeletion.deletedDescription'
              : 'initiatives.deleteConfirm',
          )}
          pending={model.deletion.pending}
          confirmed={model.deletion.confirmed}
          error={model.deletion.error}
          confirmLabel={t('initiatives.delete')}
          cancelLabel={t('common.cancel')}
          savingLabel={t(
            model.deletion.confirmed ? 'initiativeDeletion.opening' : 'initiativeDeletion.deleting',
          )}
          savedLabel={t('initiativeDeletion.deleted')}
          failureLabel={t(
            model.deletion.confirmed
              ? 'initiativeDeletion.navigationFailed'
              : 'initiativeDeletion.failed',
          )}
          retryLabel={t(
            model.deletion.confirmed
              ? 'initiativeDeletion.retryNavigation'
              : 'initiativeDeletion.retry',
          )}
          onClose={handlers.onCloseDeletion}
          onConfirm={handlers.onConfirmDeletion}
        />
        <HealthUpdateComposer
          bodyError={model.healthUpdate.bodyError}
          scope={initiative.slug}
          confirmed={model.healthUpdate.confirmed}
          onRetry={model.healthUpdate.submit}
          opened={updateOpen && !navigation.opened && !model.deletion.opened}
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
