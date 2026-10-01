import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Checkbox,
  FileInput,
  Group,
  Menu,
  Modal,
  NativeSelect,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconMaximize, IconMinimize, IconPaperclip, IconRepeat } from '@tabler/icons-react';
import type { RefObject } from 'react';
import type { useTranslation } from 'react-i18next';
import { useFocusWhen } from '../focus.ts';
import { DraftDiscardDialog } from './DraftDiscardDialog.tsx';
import { IssueCreateProperties } from './IssueCreateProperties.tsx';
import type { useShellPresenter } from '../presenters/Shell.tsx';

type Props = {
  model: ReturnType<typeof useShellPresenter>;
  t: ReturnType<typeof useTranslation>['t'];
  issueTitleRef: RefObject<HTMLTextAreaElement | null>;
};

export function IssueComposerOverlays({ model, t, issueTitleRef }: Props) {
  const issueTemplateRef = useFocusWhen<HTMLInputElement>(
    model.createIssue && model.issueTemplatePickerRequested,
    [model.issueTemplatePickerRequested],
  );
  const {
    createIssue,
    issueDraftSaved,
    issueTitle,
    issueStatus,
    issuePriority,
    issueAssignee,
    issueProjectId,
    issueCycleId,
    savedIssueDraft,
    issueDraftDiscardRequest,
    projects,
    cycles,
  } = model;
  const { handlers } = model;

  return (
    <>
      <Modal
        opened={createIssue}
        onClose={handlers.onCloseCreateIssue}
        closeOnEscape={!model.issueSubmitting}
        closeOnClickOutside={!model.issueSubmitting}
        withCloseButton={!model.issueSubmitting}
        title={
          <Group justify="space-between" w="100%" pr="xl">
            <Text component="span" fw={600}>
              {t('modal.createIssue')}
            </Text>
            <ActionIcon
              type="button"
              variant="subtle"
              aria-label={
                model.issueComposerExpanded
                  ? t('modal.collapseIssueComposer')
                  : t('modal.expandIssueComposer')
              }
              title={
                model.issueComposerExpanded
                  ? t('modal.collapseIssueComposer')
                  : t('modal.expandIssueComposer')
              }
              onClick={handlers.onToggleIssueComposerExpanded}
            >
              {model.issueComposerExpanded ? (
                <IconMinimize size={16} aria-hidden="true" />
              ) : (
                <IconMaximize size={16} aria-hidden="true" />
              )}
            </ActionIcon>
          </Group>
        }
        size="xl"
        fullScreen={model.issueComposerExpanded}
        centered
        autoFocus={false}
        onEnterTransitionEnd={() => {
          if (model.issueTemplatePickerRequested) {
            issueTemplateRef.current?.focus();
          }
        }}
      >
        <fieldset
          disabled={model.issueSubmitting}
          aria-busy={model.issueSubmitting}
          style={{
            border: 0,
            margin: 0,
            padding: 0,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--mantine-spacing-sm)',
          }}
        >
          {(issueDraftSaved || issueTitle.trim()) && (
            <Group justify="flex-end">
              {issueDraftSaved ? (
                <Button
                  type="button"
                  variant="subtle"
                  color="red"
                  size="compact-sm"
                  onClick={handlers.onRequestDiscardCurrentDraft}
                >
                  {t('drafts.discardDraft')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="subtle"
                  size="compact-sm"
                  onClick={handlers.onSaveIssueDraft}
                >
                  {t('modal.saveDraft')}
                </Button>
              )}
            </Group>
          )}
          <Textarea
            ref={issueTitleRef}
            data-autofocus={!model.issueTemplatePickerRequested || undefined}
            rows={1}
            aria-label={t('modal.issueTitle')}
            placeholder={t('modal.issueTitle')}
            value={issueTitle}
            onChange={handlers.onComposerTitleChange}
            onKeyDown={handlers.onComposerTitleKeyDown}
          />
          <Textarea
            aria-label={t('modal.issueDescription')}
            placeholder={t('modal.issueDescription')}
            rows={4}
            value={model.issueBody}
            onChange={handlers.onComposerBodyChange}
          />
          {model.issueMetadataPhase === 'loading' ? (
            <Text size="sm" c="dimmed" role="status">
              {t('issueComposer.loadingProperties')}
            </Text>
          ) : null}
          {model.issueMetadataPhase === 'error' ? (
            <Alert color="red" role="alert">
              <Stack gap="xs">
                <Text size="sm">{t('issueComposer.propertiesFailed')}</Text>
                <Button variant="default" onClick={handlers.onRetryIssueMetadata}>
                  {t('issueComposer.retryProperties')}
                </Button>
              </Stack>
            </Alert>
          ) : null}{' '}
          <IssueCreateProperties
            status={issueStatus}
            priority={issuePriority}
            assignee={issueAssignee}
            projectId={issueProjectId}
            estimate={model.issueEstimate}
            type={model.issueType}
            cycleId={issueCycleId}
            templateSlug={model.issueTemplateSlug}
            templatePickerRequested={model.issueTemplatePickerRequested}
            templatePickerRef={issueTemplateRef}
            labelNames={model.issueLabelNames}
            workflowStatuses={model.issueWorkflowStatuses}
            projects={projects}
            cycles={cycles}
            templates={model.issueTemplates}
            labels={model.availableLabels}
            onStatusChange={handlers.onComposerStatusChange}
            onPriorityChange={handlers.onComposerPriorityChange}
            onAssigneeChange={handlers.onComposerAssigneeChange}
            onProjectChange={handlers.onComposerProjectChange}
            onEstimateChange={handlers.onComposerEstimateChange}
            onTypeChange={handlers.onComposerTypeChange}
            onCycleChange={handlers.onComposerCycleChange}
            onTemplateChange={handlers.onComposerTemplateChange}
            onLabelsChange={handlers.onComposerLabelsChange}
          />
          <Group justify="flex-end" align="center">
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button type="button" variant="default">
                  {t('issueActions.moreActions')}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={handlers.onOpenIssueDueDate}>
                  {t('issueActions.dueDate.title')}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconRepeat size={14} aria-hidden />}
                  onClick={handlers.onEnableIssueRecurring}
                >
                  {t('issueActions.makeRecurring')}
                </Menu.Item>
                <Menu.Item onClick={handlers.onOpenIssueLink}>
                  {t('issueActions.addLink')}
                </Menu.Item>
                <Menu.Item onClick={handlers.onOpenIssueParent}>
                  {t('issueActions.addSubIssue')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
          {model.issueDueDateOpen && !model.issueRecurringOpen ? (
            <TextInput
              type="date"
              aria-label={t('issueProperties.dueDate')}
              label={t('issueProperties.dueDate')}
              value={model.issueDueDate}
              onChange={handlers.onComposerDueDateChange}
            />
          ) : null}
          {model.issueRecurringOpen ? (
            <Stack gap="xs">
              <TextInput
                required
                type="date"
                label={t('modal.firstDueDate')}
                value={model.issueRecurringFirstDueDate}
                onChange={handlers.onIssueRecurringFirstDueDateChange}
              />
              <Group grow align="flex-end">
                <TextInput
                  required
                  type="number"
                  min={1}
                  max={365}
                  label={t('modal.repeatEvery')}
                  value={model.issueRecurringInterval}
                  onChange={handlers.onIssueRecurringIntervalChange}
                />
                <NativeSelect
                  aria-label={t('modal.repeatUnit')}
                  value={model.issueRecurringUnit}
                  onChange={handlers.onIssueRecurringUnitChange}
                  data={(['day', 'week', 'month', 'year'] as const).map((unit) => ({
                    value: unit,
                    label: t(`modal.${unit}`),
                  }))}
                />
              </Group>
              <Button
                type="button"
                variant="subtle"
                onClick={handlers.onClearIssueRecurring}
                style={{ alignSelf: 'flex-start' }}
              >
                {t('issueActions.clearSchedule')}
              </Button>
            </Stack>
          ) : null}
          {model.issueParentOpen ? (
            <Select
              aria-label={t('issueProperties.parent')}
              label={t('issueProperties.parent')}
              placeholder={t('issueProperties.noParent')}
              searchable
              clearable
              searchValue={model.issueParentQuery}
              value={model.issueParentIdentifier || null}
              data={model.issueParentOptions}
              nothingFoundMessage={t('issueProperties.noIssuesFound')}
              onSearchChange={handlers.onComposerParentSearchChange}
              onChange={handlers.onComposerParentChange}
            />
          ) : null}
          {model.issueExternalLinks.length > 0 ? (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                {t('issueLinks.heading')}
              </Text>
              <Box role="list">
                {model.issueExternalLinks.map((link) => {
                  const title = link.title || link.url;
                  return (
                    <Group key={link.url} justify="space-between" wrap="nowrap" role="listitem">
                      <Stack gap={0} style={{ minWidth: 0 }}>
                        <Text size="sm" truncate>
                          {title}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {link.url}
                        </Text>
                      </Stack>
                      <Button
                        type="button"
                        variant="subtle"
                        size="compact-sm"
                        aria-label={t('issueLinks.remove', { title })}
                        onClick={() => handlers.onRemoveIssueLink(link.url)}
                      >
                        {t('issueLinks.remove', { title })}
                      </Button>
                    </Group>
                  );
                })}
              </Box>
            </Stack>
          ) : null}
          <Group justify="space-between" align="center">
            <FileInput
              aria-label={t('issueAttachments.attachToNewIssue')}
              placeholder={t('issueAttachments.attachToNewIssue')}
              value={model.issueAttachments}
              onChange={handlers.onComposerAttachmentsChange}
              leftSection={<IconPaperclip size={14} aria-hidden />}
              multiple
              clearable
              size="xs"
              w={290}
            />
            <Group gap="sm" align="center">
              <Text size="sm" c="dimmed">
                {t('modal.enterHint')}
              </Text>
              {!model.issueRecurringOpen ? (
                <Checkbox
                  size="sm"
                  label={t('modal.createMore')}
                  checked={model.issueCreateMore}
                  onChange={handlers.onComposerCreateMoreChange}
                />
              ) : null}
              <Button
                type="button"
                onClick={handlers.submitIssue}
                disabled={model.issueSubmitDisabled}
                loading={model.issueSubmitting}
              >
                {model.issueRecurringOpen
                  ? t('issueActions.createRecurringIssue')
                  : t('modal.create')}
              </Button>
            </Group>
          </Group>
          {model.issueAttachmentError ? (
            <Alert color="red" variant="light" role="alert">
              {model.issueAttachmentError}
            </Alert>
          ) : null}
        </fieldset>
      </Modal>

      {savedIssueDraft ? (
        <Alert
          color="teal"
          variant="light"
          role="status"
          styles={{
            root: {
              position: 'fixed',
              bottom: 16,
              left: 260,
              zIndex: 1000,
              maxWidth: 460,
            },
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">{t('drafts.saved')}</Text>
            <Group gap="xs" wrap="nowrap">
              <Button
                type="button"
                variant="subtle"
                size="compact-xs"
                onClick={handlers.onOpenSavedIssueDraft}
              >
                {t('drafts.open')}
              </Button>
              <Button
                type="button"
                variant="subtle"
                size="compact-xs"
                onClick={handlers.onDismissSavedIssueDraft}
              >
                {t('common.dismiss')}
              </Button>
            </Group>
          </Group>
        </Alert>
      ) : null}

      <DraftDiscardDialog
        opened={issueDraftDiscardRequest !== null}
        title={
          issueDraftDiscardRequest?.kind === 'all'
            ? t('drafts.discardAllTitle')
            : t('drafts.discardTitle')
        }
        description={
          issueDraftDiscardRequest?.kind === 'all'
            ? t('drafts.discardAllDescription')
            : t('drafts.discardDescription')
        }
        discardLabel={
          issueDraftDiscardRequest?.kind === 'all' ? t('drafts.discardAll') : t('drafts.discard')
        }
        cancelLabel={t('common.cancel')}
        onCancel={handlers.onCancelIssueDraftDiscard}
        onConfirm={handlers.onConfirmIssueDraftDiscard}
      />

      <Modal
        opened={createIssue && model.issueLinkOpen}
        onClose={handlers.onCloseIssueLink}
        title={t('issueActions.addResourceTitle', { kind: t('issueLinks.link') })}
        centered
        autoFocus={false}
      >
        <Box component="form" onSubmit={handlers.onAddIssueLink}>
          <Stack>
            <TextInput
              type="url"
              required
              aria-label={t('issueLinks.url')}
              label={t('issueLinks.url')}
              placeholder={t('issueLinks.urlPlaceholder')}
              value={model.issueLinkURL}
              onChange={handlers.onIssueLinkURLChange}
            />
            <TextInput
              aria-label={t('issueLinks.title')}
              label={t('issueLinks.title')}
              placeholder={t('issueLinks.titlePlaceholder')}
              value={model.issueLinkTitle}
              onChange={handlers.onIssueLinkTitleChange}
            />
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={handlers.onCloseIssueLink}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!model.issueLinkURL.trim()}>
                {t('issueLinks.add')}
              </Button>
            </Group>
          </Stack>
        </Box>
      </Modal>
    </>
  );
}
