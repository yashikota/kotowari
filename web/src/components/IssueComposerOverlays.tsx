import {
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
import { IconPaperclip, IconRepeat } from '@tabler/icons-react';
import type { RefObject } from 'react';
import type { useTranslation } from 'react-i18next';
import { DraftDiscardDialog } from './DraftDiscardDialog.tsx';
import { IssueCreateProperties } from './IssueCreateProperties.tsx';
import type { useShellPresenter } from '../presenters/Shell.tsx';

type Props = {
  model: ReturnType<typeof useShellPresenter>;
  t: ReturnType<typeof useTranslation>['t'];
  issueTitleRef: RefObject<HTMLTextAreaElement | null>;
};

export function IssueComposerOverlays({ model, t, issueTitleRef }: Props) {
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
        onClose={handlers.onClick10}
        title={t('modal.createIssue')}
        size="xl"
        centered
        autoFocus={false}
      >
        <Stack gap="sm">
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
            data-autofocus
            rows={1}
            aria-label={t('modal.issueTitle')}
            placeholder={t('modal.issueTitle')}
            value={issueTitle}
            onChange={handlers.Issue_title_onChange12}
            onKeyDown={handlers.Issue_title_onKeyDown13}
          />
          <Textarea
            aria-label={t('modal.issueDescription')}
            placeholder={t('modal.issueDescription')}
            rows={4}
            value={model.issueBody}
            onChange={handlers.Issue_body_onChange31}
          />
          <IssueCreateProperties
            status={issueStatus}
            priority={issuePriority}
            assignee={issueAssignee}
            projectId={issueProjectId}
            estimate={model.issueEstimate}
            type={model.issueType}
            cycleId={issueCycleId}
            templateSlug={model.issueTemplateSlug}
            labelNames={model.issueLabelNames}
            workflowStatuses={model.issueWorkflowStatuses}
            projects={projects}
            cycles={cycles}
            templates={model.issueTemplates}
            labels={model.availableLabels}
            onStatusChange={handlers.Issue_status_onChange14}
            onPriorityChange={handlers.Issue_priority_onChange15}
            onAssigneeChange={handlers.Issue_assignee_onChange}
            onProjectChange={handlers.Issue_project_onChange16}
            onEstimateChange={handlers.Issue_estimate_onChange33}
            onTypeChange={handlers.Issue_type_onChange32}
            onCycleChange={handlers.Issue_cycle_onChange17}
            onTemplateChange={handlers.Issue_template_onChange30}
            onLabelsChange={handlers.Issue_labels_onChange34}
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
              onChange={handlers.Issue_dueDate_onChange35}
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
              onSearchChange={handlers.Issue_parentSearch_onChange36}
              onChange={handlers.Issue_parent_onChange37}
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
              onChange={handlers.Issue_attachments_onChange}
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
                  onChange={handlers.Issue_createMore_onChange}
                />
              ) : null}
              <Button
                type="button"
                onClick={handlers.submitIssue}
                disabled={model.issueSubmitDisabled}
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
        </Stack>
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
