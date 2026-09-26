import { Link } from '@tanstack/react-router';
import {
  Anchor,
  ActionIcon,
  Alert,
  Box,
  Button,
  Grid,
  Group,
  Menu,
  Modal,
  NativeSelect,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  VisuallyHidden,
} from '@mantine/core';
import {
  IconCopy,
  IconChevronDown,
  IconChevronUp,
  IconChevronRight,
  IconDotsVertical,
  IconArrowUp,
  IconExternalLink,
  IconFileText,
  IconGitBranch,
  IconLink,
  IconPaperclip,
  IconPlus,
  IconStar,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { formatActivity } from '../activity.ts';
import { MarkdownContent, MetaBadge, Section } from '../mantine-ui.tsx';
import { renderMarkdown } from '../markdown.ts';
import { formatStamp } from '../time.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import { priorityLabel } from '../i18n/labels.ts';
import { projectWorkflowStatusLabel } from '../project-workflow.tsx';
import { AIPanel } from './AIPanel.tsx';
import { DocumentEditor } from './DocumentEditor.tsx';
import { IssuePropertiesPanel } from './IssuePropertiesPanel.tsx';
import { formatAttachmentSize, IssueAttachmentList } from './IssueAttachmentList.tsx';
import { ReactionPicker, ReactionSummary } from './ReactionPicker.tsx';

import { PresenterScope, useActions, useIntent, useKeyboard } from '../application/Root.tsx';
import {
  issueCopyShortcutFromKeyboard,
  issueDetailShortcutFromKeyboard,
  issueLinkedCodeSequenceFromKeyboard,
} from '../keymap.ts';
import type { IssueCopyShortcut } from '../keymap.ts';
import { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

const ISSUE_COPY_SHORTCUT_INTENTS: Record<IssueCopyShortcut, string> = {
  'copy-id': 'Copy_id_onClick34',
  'copy-url': 'Copy_url_onClick35',
  'copy-title': 'Copy_title_onClick36',
  'copy-title-link': 'Copy_title_link_onClick37',
  'copy-everything': 'Copy_everything_onClick39',
  'copy-branch': 'Copy_branch_onClick40',
  'copy-prompt': 'Copy_prompt_onClick41',
};

function CopyShortcut({ label }: { label: string }) {
  return (
    <Text component="span" size="xs" c="dimmed" aria-hidden="true" data-testid="copy-shortcut">
      {label}
    </Text>
  );
}

export function IssueDetailView({
  model,
  titleRef,
  subRef,
  noteRef,
}: {
  model: ReturnType<typeof useIssueDetailPresenter>;
  titleRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
  subRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
  noteRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
}) {
  const { t } = useTranslation();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const isApplePlatform =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const modifierKey = isApplePlatform ? '⌘' : 'Ctrl';
  const shiftKey = '⇧';
  const alternateKey = isApplePlatform ? '⌥' : 'Alt';
  switch (model._view) {
    case 0: {
      const { error } = model;
      return <Alert color="red">{error}</Alert>;
    }
    case 1: {
      return (
        <Text c="dimmed" ta="center" py="xl">
          {t('ui.loading')}
        </Text>
      );
    }
    case 2: {
      const {
        identifier,
        issueReturnTo,
        navigationPosition,
        navigationTotal,
        issue,
        cycles,
        pages,
        timeline,
        editingCommentId,
        editingCommentDraft,
        reactionPickerTarget,
        reactionError,
        issueAttachmentError,
        issueAttachmentBusy,
        issueFilesInputRef,
        commentFiles,
        commentError,
        commentFilesInputRef,
        commentSubmitShortcut,
        draft,
        subTitle,
        adrPick,
        timeZone,
        copied,
        historyRequest,
        customReminderOpen,
        customReminderValue,
        issueOptionsOpen,
        subIssueEditorOpen,
        relatedIssueKind,
        relatedIssueTitle,
        markAsKind,
        markAsIssueOptions,
        relationsEditorOpen,
        templateOpen,
        templateName,
        projectConversionOpen,
        projectConversionName,
        projectConversionDescription,
        projectConversionStatus,
        projectConversionPriority,
        projectConversionStartDate,
        projectConversionTargetDate,
        recurringOpen,
        recurringName,
        recurringFirstDueDate,
        recurringInterval,
        recurringUnit,
        children,
        linkedAdrs,
        unlinkedAdrs,
        externalLinkURL,
        externalLinkTitle,
        externalLinkKind,
        externalLinkOpen,
        resourcesCollapsed,
        dueDateOpen,
        dueDateValue,
        hasUpcomingCycle,
        relationTarget,
        relationKind,
        relationIssues,
        relationTargetOptions,
        codingToolName,
        codingToolURL,
        handlers,
      } = model;
      return (
        <Box maw={1120} mx="auto" px={{ base: 'sm', md: 'xl' }} pb="xl">
          <Group
            justify="space-between"
            wrap="wrap"
            mih={42}
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <Group gap="sm">
              <Anchor
                href={issueReturnTo}
                aria-label={t('ui.backToIssues')}
                data-presenter-action="onReturnToList"
                style={{
                  color: 'var(--mantine-color-dimmed)',
                  fontSize: 'var(--mantine-font-size-xs)',
                }}
              >
                {t('nav.issues')}
              </Anchor>
              <Button
                type="button"
                variant="subtle"
                aria-label={t('ui.copyIdentifier')}
                onClick={handlers.Copy_identifier_onClick0}
              >
                {copied ? t('ui.copied') : issue.identifier}
              </Button>
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                aria-label={t('issueActions.copyUrl')}
                title={t('issueActions.copyUrl')}
                onClick={handlers.Copy_url_onClick35}
              >
                <IconLink size={15} stroke={1.7} aria-hidden="true" />
              </ActionIcon>
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                aria-label={t('issueActions.copyBranch')}
                title={t('issueActions.copyBranch')}
                onClick={handlers.Copy_branch_onClick40}
              >
                <IconGitBranch size={15} stroke={1.7} aria-hidden="true" />
              </ActionIcon>
              {!issue.archivedAt ? (
                <ActionIcon
                  type="button"
                  variant="subtle"
                  color={issue.isFavorite ? 'yellow' : 'gray'}
                  aria-label={t(issue.isFavorite ? 'issueFavorite.remove' : 'issueFavorite.add')}
                  aria-pressed={issue.isFavorite}
                  title={t(issue.isFavorite ? 'issueFavorite.remove' : 'issueFavorite.add')}
                  onClick={handlers.Favorite_onClick29}
                >
                  <IconStar
                    size={15}
                    stroke={1.7}
                    fill={issue.isFavorite ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                </ActionIcon>
              ) : null}
              {issue.parentIdentifier ? (
                <Button type="button" variant="subtle" onClick={handlers.onClick1}>
                  {issue.parentIdentifier}
                </Button>
              ) : null}
              <Text c="dimmed" size="sm">
                {formatStamp(issue.updatedAt, timeZone)}
              </Text>
              {issue.reminderAt ? (
                <MetaBadge>
                  {t('issueActions.reminderScheduled', {
                    date: new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone,
                    }).format(new Date(issue.reminderAt)),
                  })}
                </MetaBadge>
              ) : null}
              {issue.archivedAt ? <MetaBadge>{t('issueActions.archivedBadge')}</MetaBadge> : null}
            </Group>
            <Group gap="xs" wrap="nowrap">
              <Text
                size="sm"
                c="dimmed"
                aria-label={t('issueNavigation.position', {
                  current: navigationPosition,
                  total: navigationTotal,
                })}
              >
                {t('issueNavigation.position', {
                  current: navigationPosition,
                  total: navigationTotal,
                })}
              </Text>
              <ActionIcon
                type="button"
                variant="default"
                aria-label={t('issueNavigation.previous')}
                title={t('issueNavigation.previous')}
                disabled={navigationPosition <= 1}
                onClick={handlers.onNavigatePrevious}
              >
                <IconChevronUp size={15} aria-hidden="true" />
              </ActionIcon>
              <ActionIcon
                type="button"
                variant="default"
                aria-label={t('issueNavigation.next')}
                title={t('issueNavigation.next')}
                disabled={navigationPosition >= navigationTotal}
                onClick={handlers.onNavigateNext}
              >
                <IconChevronDown size={15} aria-hidden="true" />
              </ActionIcon>
            </Group>
          </Group>
          <Group justify="flex-end" gap="xs" py="xs">
            <Button
              type="button"
              variant="default"
              leftSection={<IconCopy size={14} />}
              onClick={handlers.Copy_prompt_onClick41}
            >
              {t('issueActions.copyPrompt')}
            </Button>
            <Menu position="bottom-end" shadow="md" withinPortal>
              <Menu.Target>
                <Button
                  type="button"
                  variant="default"
                  leftSection={<IconExternalLink size={14} />}
                >
                  {t('codingTools.chooseTool')}
                </Button>
              </Menu.Target>
              <Menu.Dropdown aria-label={t('codingTools.chooseTool')}>
                <Menu.Item onClick={handlers.Copy_prompt_onClick41}>
                  {t('issueActions.copyPrompt')}
                </Menu.Item>
                {codingToolURL ? (
                  <Menu.Item onClick={handlers.onOpenCodingTool}>
                    {t('codingTools.openWith', { name: codingToolName })}
                  </Menu.Item>
                ) : null}
                <Menu.Divider />
                <Menu.Item onClick={handlers.onOpenCodingToolSettings}>
                  {t('codingTools.configure')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Menu
              position="bottom-end"
              shadow="md"
              withinPortal
              opened={issueOptionsOpen}
              onChange={handlers.onIssueOptionsChange}
            >
              <Menu.Target>
                <ActionIcon
                  type="button"
                  variant="subtle"
                  color="gray"
                  aria-label={t('issueActions.button')}
                  title={t('issueActions.button')}
                >
                  <IconDotsVertical size={16} stroke={1.8} aria-hidden="true" />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown aria-label={t('issueActions.button')}>
                {!issue.archivedAt ? (
                  <>
                    <Menu.Sub>
                      <Menu.Sub.Target>
                        <Menu.Sub.Item>{t('issueActions.dueDate.label')}</Menu.Sub.Item>
                      </Menu.Sub.Target>
                      <Menu.Sub.Dropdown>
                        <Menu.Item onClick={() => handlers.onSetDueDatePreset('tomorrow')}>
                          {t('issueActions.dueDate.tomorrow')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onSetDueDatePreset('week')}>
                          {t('issueActions.dueDate.week')}
                        </Menu.Item>
                        <Menu.Item
                          disabled={!hasUpcomingCycle}
                          onClick={() => handlers.onSetDueDatePreset('cycle')}
                        >
                          {t('issueActions.dueDate.cycle')}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item onClick={handlers.onOpenDueDate}>
                          {t('issueActions.dueDate.custom')}
                        </Menu.Item>
                        {issue.dueDate ? (
                          <Menu.Item onClick={handlers.onClearDueDate}>
                            {t('issueActions.dueDate.clear')}
                          </Menu.Item>
                        ) : null}
                      </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Item onClick={() => handlers.onOpenExternalLink('link')}>
                      {t('issueActions.addLink')}
                    </Menu.Item>
                    <Menu.Item onClick={() => handlers.onOpenExternalLink('pullRequest')}>
                      {t('issueActions.addPullRequest')}
                    </Menu.Item>
                    <Menu.Item onClick={handlers.Create_document_onClick44}>
                      {t('issueActions.addDocument')}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Sub>
                      <Menu.Sub.Target>
                        <Menu.Sub.Item>{t('issueActions.copy')}</Menu.Sub.Item>
                      </Menu.Sub.Target>
                      <Menu.Sub.Dropdown style={{ minWidth: 300 }}>
                        <Menu.Item
                          onClick={handlers.Copy_id_onClick34}
                          rightSection={<CopyShortcut label={`${modifierKey} .`} />}
                        >
                          {t('issueActions.copyId')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_url_onClick35}
                          rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} ,`} />}
                        >
                          {t('issueActions.copyUrl')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_title_onClick36}
                          rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} '`} />}
                        >
                          {t('issueActions.copyTitle')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_title_link_onClick37}
                          rightSection={<CopyShortcut label={`${modifierKey} C`} />}
                        >
                          {t('issueActions.copyTitleLink')}
                        </Menu.Item>
                        <Menu.Item onClick={handlers.Copy_issue_markdown_onClick38}>
                          {t('issueActions.copyIssueMarkdown')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_everything_onClick39}
                          rightSection={<CopyShortcut label={`${modifierKey} ${alternateKey} C`} />}
                        >
                          {t('issueActions.copyEverything')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_branch_onClick40}
                          rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} .`} />}
                        >
                          {t('issueActions.copyBranch')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_prompt_onClick41}
                          rightSection={<CopyShortcut label={`${modifierKey} ${alternateKey} P`} />}
                        >
                          {t('issueActions.copyPrompt')}
                        </Menu.Item>
                      </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Divider />
                    <Menu.Sub>
                      <Menu.Sub.Target>
                        <Menu.Sub.Item>{t('issueActions.createRelated')}</Menu.Sub.Item>
                      </Menu.Sub.Target>
                      <Menu.Sub.Dropdown>
                        <Menu.Item onClick={() => handlers.onOpenCreateRelated('issue')}>
                          {t('issueActions.related.issue')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onOpenCreateRelated('subIssue')}>
                          {t('issueActions.related.subIssue')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onOpenCreateRelated('parent')}>
                          {t('issueActions.related.parent')}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item onClick={() => handlers.onOpenCreateRelated('blocked')}>
                          {t('issueActions.related.blocked')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onOpenCreateRelated('blocking')}>
                          {t('issueActions.related.blocking')}
                        </Menu.Item>
                      </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Item onClick={handlers.onOpenRelationsEditor}>
                      {t('issueRelations.addMenu')}
                    </Menu.Item>
                    <Menu.Sub>
                      <Menu.Sub.Target>
                        <Menu.Sub.Item>{t('issueActions.markAs.label')}</Menu.Sub.Item>
                      </Menu.Sub.Target>
                      <Menu.Sub.Dropdown>
                        <Menu.Item onClick={() => handlers.onOpenMarkAs('parentOf')}>
                          {t('issueActions.markAs.parentOf')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onOpenMarkAs('subIssueOf')}>
                          {t('issueActions.markAs.subIssueOf')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onOpenMarkAs('relatedTo')}>
                          {t('issueActions.markAs.relatedTo')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onOpenMarkAs('blockedBy')}>
                          {t('issueActions.markAs.blockedBy')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onOpenMarkAs('blocking')}>
                          {t('issueActions.markAs.blocking')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onOpenMarkAs('duplicateOf')}>
                          {t('issueActions.markAs.duplicateOf')}
                        </Menu.Item>
                      </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Divider />
                    <Menu.Sub>
                      <Menu.Sub.Target>
                        <Menu.Sub.Item>{t('issueActions.convertTo')}</Menu.Sub.Item>
                      </Menu.Sub.Target>
                      <Menu.Sub.Dropdown>
                        <Menu.Item onClick={handlers.onOpenConvertToProject}>
                          {t('issueActions.project')}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item onClick={handlers.onOpenConvertToTemplate}>
                          {t('issueActions.template')}
                        </Menu.Item>
                        <Menu.Item onClick={handlers.onOpenRecurringIssue}>
                          {t('issueActions.recurringIssue')}
                        </Menu.Item>
                      </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Item onClick={handlers.Make_copy_onClick42}>
                      {t('issueActions.makeCopy')}
                    </Menu.Item>
                    <Menu.Sub>
                      <Menu.Sub.Target>
                        <Menu.Sub.Item>{t('issueActions.remindMe')}</Menu.Sub.Item>
                      </Menu.Sub.Target>
                      <Menu.Sub.Dropdown>
                        <Menu.Item onClick={() => handlers.onSetReminder('hour')}>
                          {t('issueActions.reminder.hour')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onSetReminder('tomorrow')}>
                          {t('issueActions.reminder.tomorrow')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onSetReminder('week')}>
                          {t('issueActions.reminder.week')}
                        </Menu.Item>
                        <Menu.Item onClick={() => handlers.onSetReminder('month')}>
                          {t('issueActions.reminder.month')}
                        </Menu.Item>
                        <Menu.Item
                          disabled={!cycles.some((cycle) => new Date(cycle.startsAt) > new Date())}
                          onClick={() => handlers.onSetReminder('cycle')}
                        >
                          {t('issueActions.reminder.cycle')}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item onClick={handlers.onOpenCustomReminder}>
                          {t('issueActions.reminder.custom')}
                        </Menu.Item>
                        {issue.reminderAt ? (
                          <Menu.Item onClick={handlers.onClearReminder}>
                            {t('issueActions.reminder.clear')}
                          </Menu.Item>
                        ) : null}
                      </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Item onClick={handlers.Show_description_history_onClick50}>
                      {t('issueActions.descriptionHistory')}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item onClick={handlers.onArchiveIssue}>
                      {t('issueActions.archive')}
                    </Menu.Item>
                    <Menu.Item color="red" onClick={handlers.onClick2}>
                      {t('issueActions.delete')}
                    </Menu.Item>
                  </>
                ) : (
                  <>
                    <Menu.Sub>
                      <Menu.Sub.Target>
                        <Menu.Sub.Item>{t('issueActions.copy')}</Menu.Sub.Item>
                      </Menu.Sub.Target>
                      <Menu.Sub.Dropdown style={{ minWidth: 300 }}>
                        <Menu.Item
                          onClick={handlers.Copy_id_onClick34}
                          rightSection={<CopyShortcut label={`${modifierKey} .`} />}
                        >
                          {t('issueActions.copyId')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_url_onClick35}
                          rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} ,`} />}
                        >
                          {t('issueActions.copyUrl')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_title_onClick36}
                          rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} '`} />}
                        >
                          {t('issueActions.copyTitle')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_title_link_onClick37}
                          rightSection={<CopyShortcut label={`${modifierKey} C`} />}
                        >
                          {t('issueActions.copyTitleLink')}
                        </Menu.Item>
                        <Menu.Item onClick={handlers.Copy_issue_markdown_onClick38}>
                          {t('issueActions.copyIssueMarkdown')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_everything_onClick39}
                          rightSection={<CopyShortcut label={`${modifierKey} ${alternateKey} C`} />}
                        >
                          {t('issueActions.copyEverything')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_branch_onClick40}
                          rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} .`} />}
                        >
                          {t('issueActions.copyBranch')}
                        </Menu.Item>
                        <Menu.Item
                          onClick={handlers.Copy_prompt_onClick41}
                          rightSection={<CopyShortcut label={`${modifierKey} ${alternateKey} P`} />}
                        >
                          {t('issueActions.copyPrompt')}
                        </Menu.Item>
                      </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Divider />
                    <Menu.Item onClick={handlers.onArchiveIssue}>
                      {t('issueActions.restore')}
                    </Menu.Item>
                    <Menu.Item color="red" onClick={handlers.onClick2}>
                      {t('issueActions.delete')}
                    </Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>

          <Grid
            gap="xl"
            mt="md"
            inert={issue.archivedAt ? true : undefined}
            aria-disabled={issue.archivedAt ? true : undefined}
            style={issue.archivedAt ? { opacity: 0.72 } : undefined}
          >
            <Grid.Col span={12}>
              <Stack gap="lg">
                <TextInput
                  ref={titleRef}
                  aria-label={t('ui.issueTitle')}
                  value={issue.title}
                  onChange={handlers.Issue_title_onChange3}
                  onBlur={handlers.Issue_title_onBlur4}
                  variant="unstyled"
                  styles={{
                    input: {
                      height: 'auto',
                      minHeight: 0,
                      padding: 0,
                      color: 'var(--mantine-color-text)',
                      fontSize: '24px',
                      fontWeight: 600,
                      lineHeight: 1.3,
                    },
                  }}
                />

                <IssuePropertiesPanel model={model} />

                <DocumentEditor
                  documentKey={`issues/${identifier}/body`}
                  inline
                  historyRequest={historyRequest}
                  showHistoryButton={false}
                />
                <input
                  ref={issueFilesInputRef}
                  type="file"
                  multiple
                  aria-label={t('issueAttachments.chooseIssueFiles')}
                  onChange={handlers.onIssueFilesChange}
                  style={{ display: 'none' }}
                />
                <Group gap="xs">
                  <ReactionPicker
                    target="issue"
                    openedTarget={reactionPickerTarget}
                    onOpenChange={handlers.onReactionPickerChange}
                    onSelect={handlers.onSelectReaction}
                  />
                  <ReactionSummary
                    reactions={issue.reactions ?? []}
                    onToggle={(emoji) => handlers.onToggleReaction('issue', emoji)}
                  />
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    size="sm"
                    aria-label={t(
                      issueAttachmentBusy
                        ? 'issueAttachments.uploading'
                        : 'issueAttachments.addToIssue',
                    )}
                    disabled={issueAttachmentBusy}
                    onClick={handlers.onChooseIssueFiles}
                  >
                    <IconPaperclip size={15} aria-hidden="true" />
                  </ActionIcon>
                </Group>
                {issueAttachmentError ? (
                  <Alert color="red" role="alert">
                    {issueAttachmentError}
                  </Alert>
                ) : null}
                {reactionError ? (
                  <Alert color="red" role="alert">
                    {reactionError}
                  </Alert>
                ) : null}
                {issue.attachments?.length ? (
                  <Section title={t('issueAttachments.issueHeading')}>
                    <IssueAttachmentList
                      identifier={identifier}
                      attachments={issue.attachments}
                      onRemove={handlers.onRemoveIssueAttachment}
                    />
                  </Section>
                ) : null}

                <Box component="section" aria-label={t('ui.subIssues')} py="xs">
                  {children.length > 0 ? (
                    <Stack gap="xs">
                      {children.map((c) => (
                        <Button
                          type="button"
                          variant="subtle"
                          key={c.identifier}
                          onClick={() => handlers.onClick18(c)}
                          fullWidth
                          styles={{ inner: { justifyContent: 'flex-start' } }}
                        >
                          <Group justify="space-between" wrap="nowrap" w="100%">
                            <Group gap="sm" wrap="nowrap">
                              <Text fw={500}>{c.identifier}</Text>
                              <Text>{c.title}</Text>
                            </Group>
                            <MetaBadge>
                              {workflowStatusLabel(c.workflowStatus ?? c.status, workflowStatuses)}
                            </MetaBadge>
                          </Group>
                        </Button>
                      ))}
                    </Stack>
                  ) : null}
                  {subIssueEditorOpen ? (
                    <Stack gap="xs" mt={children.length > 0 ? 'xs' : 0}>
                      <Textarea
                        ref={subRef}
                        rows={2}
                        aria-label={t('ui.newSubIssue')}
                        placeholder={t('ui.addSubIssue')}
                        value={subTitle}
                        onChange={handlers.New_sub_issue_onChange19}
                        onKeyDown={handlers.New_sub_issue_onKeyDown20}
                      />
                      <Group justify="flex-end" gap="xs">
                        <Button
                          type="button"
                          variant="default"
                          size="xs"
                          onClick={handlers.onCloseSubIssueEditor}
                        >
                          {t('issueSubIssues.cancel')}
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          disabled={!subTitle.trim()}
                          onClick={handlers.onCreateSubIssue}
                        >
                          {t('issueSubIssues.create')}
                        </Button>
                      </Group>
                    </Stack>
                  ) : (
                    <Button
                      type="button"
                      variant="subtle"
                      size="sm"
                      leftSection={<IconPlus size={14} stroke={1.8} aria-hidden="true" />}
                      onClick={handlers.onOpenSubIssueEditor}
                    >
                      {t('issueSubIssues.add')}
                    </Button>
                  )}
                </Box>

                {relationIssues.length > 0 || relationsEditorOpen ? (
                  <Box component="section" aria-label={t('issueRelations.heading')} py="xs">
                    {relationIssues.length > 0 ? (
                      <Stack gap="xs" role="list" aria-label={t('issueRelations.heading')}>
                        {relationIssues.map(({ relation, target }) => (
                          <Group
                            key={relation.id}
                            justify="space-between"
                            wrap="nowrap"
                            role="listitem"
                          >
                            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                              <MetaBadge>{t(`issueRelations.${relation.kind}`)}</MetaBadge>
                              <Link
                                to="/issues/$identifier"
                                params={{ identifier: target.identifier }}
                              >
                                {target.identifier} {target.title}
                              </Link>
                            </Group>
                            <Button
                              type="button"
                              variant="subtle"
                              color="gray"
                              size="compact-sm"
                              aria-label={t('issueRelations.remove', {
                                identifier: target.identifier,
                              })}
                              onClick={() => handlers.onRemoveRelation33(relation)}
                            >
                              <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                            </Button>
                          </Group>
                        ))}
                      </Stack>
                    ) : null}
                    {relationsEditorOpen ? (
                      <form onSubmit={handlers.Relation_onSubmit32}>
                        <Stack gap="xs">
                          <Group align="flex-end" wrap="wrap">
                            <NativeSelect
                              aria-label={t('issueRelations.kindLabel')}
                              value={relationKind}
                              onChange={handlers.Relation_kind_onChange31}
                              data={(
                                ['related', 'blocks', 'blockedBy', 'duplicateOf'] as const
                              ).map((kind) => ({
                                value: kind,
                                label: t(`issueRelations.${kind}`),
                              }))}
                            />
                            <NativeSelect
                              aria-label={t('issueRelations.issueLabel')}
                              value={relationTarget}
                              onChange={handlers.Relation_target_onChange30}
                              data={[
                                { value: '', label: t('issueRelations.chooseIssue') },
                                ...relationTargetOptions.map((candidate) => ({
                                  value: candidate.identifier,
                                  label: `${candidate.identifier} ${candidate.title}`,
                                })),
                              ]}
                              style={{ flex: '1 1 240px' }}
                            />
                          </Group>
                          <Group justify="flex-end" gap="xs">
                            <Button
                              type="button"
                              variant="default"
                              size="xs"
                              onClick={handlers.onCloseRelationsEditor}
                            >
                              {t('issueSubIssues.cancel')}
                            </Button>
                            <Button type="submit" size="xs" disabled={!relationTarget}>
                              {t('issueRelations.add')}
                            </Button>
                          </Group>
                        </Stack>
                      </form>
                    ) : null}
                  </Box>
                ) : null}

                <Section
                  title={t('issueLinks.resourcesHeading')}
                  ariaLabel={t('issueLinks.resourcesHeading')}
                  action={
                    <Group gap={4}>
                      <ActionIcon
                        type="button"
                        variant="subtle"
                        color="gray"
                        aria-label={
                          resourcesCollapsed
                            ? t('issueLinks.expandResources')
                            : t('issueLinks.collapseResources')
                        }
                        aria-expanded={!resourcesCollapsed}
                        aria-controls="issue-resources-content"
                        onClick={handlers.onToggleResources}
                      >
                        {resourcesCollapsed ? (
                          <IconChevronRight size={14} stroke={1.8} aria-hidden="true" />
                        ) : (
                          <IconChevronDown size={14} stroke={1.8} aria-hidden="true" />
                        )}
                      </ActionIcon>
                      <Menu position="bottom-end" shadow="md" withinPortal>
                        <Menu.Target>
                          <ActionIcon
                            type="button"
                            variant="subtle"
                            color="gray"
                            aria-label={t('issueLinks.addResource')}
                            title={t('issueLinks.addResource')}
                          >
                            <IconPlus size={15} stroke={1.8} aria-hidden="true" />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown aria-label={t('issueLinks.addResource')}>
                          <Menu.Item onClick={() => handlers.onOpenExternalLink('link')}>
                            {t('issueActions.addLink')}
                          </Menu.Item>
                          <Menu.Item onClick={() => handlers.onOpenExternalLink('pullRequest')}>
                            {t('issueActions.addPullRequest')}
                          </Menu.Item>
                          <Menu.Item onClick={handlers.Create_document_onClick44}>
                            {t('issueActions.addDocument')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  }
                >
                  {resourcesCollapsed ? null : (
                    <Box id="issue-resources-content">
                      {issue.externalLinks.length === 0 ? (
                        <Text c="dimmed" size="sm">
                          {t('issueLinks.empty')}
                        </Text>
                      ) : (
                        <Stack gap="xs" role="list" aria-label={t('issueLinks.heading')}>
                          {issue.externalLinks.map((link) => {
                            let pageSlug: string | null = null;
                            try {
                              const url = new URL(link.url);
                              const pageMarker = '/pages/';
                              const markerIndex = url.pathname.lastIndexOf(pageMarker);
                              if (url.origin === window.location.origin && markerIndex >= 0) {
                                const candidate = url.pathname.slice(
                                  markerIndex + pageMarker.length,
                                );
                                if (candidate && !candidate.includes('/')) {
                                  pageSlug = decodeURIComponent(candidate);
                                }
                              }
                            } catch {
                              pageSlug = null;
                            }
                            const page = pageSlug
                              ? pages.find((item) => item.slug === pageSlug)
                              : null;
                            const title = page?.title || link.title || link.url;
                            return (
                              <Group
                                key={link.id}
                                justify="space-between"
                                wrap="nowrap"
                                role="listitem"
                              >
                                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                                  {pageSlug ? (
                                    <IconFileText size={15} stroke={1.7} aria-hidden="true" />
                                  ) : (
                                    <IconExternalLink size={15} stroke={1.7} aria-hidden="true" />
                                  )}
                                  {pageSlug ? (
                                    <Link to="/pages/$slug" params={{ slug: pageSlug }}>
                                      {title}
                                    </Link>
                                  ) : (
                                    <a href={link.url} target="_blank" rel="noreferrer">
                                      {title}
                                    </a>
                                  )}
                                  <MetaBadge>{t(`issueLinks.${link.kind}`)}</MetaBadge>
                                </Group>
                                <Button
                                  type="button"
                                  variant="subtle"
                                  color="gray"
                                  size="compact-sm"
                                  aria-label={t('issueLinks.remove', { title })}
                                  onClick={() => handlers.onRemoveExternalLink28(link)}
                                >
                                  <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                                </Button>
                              </Group>
                            );
                          })}
                        </Stack>
                      )}
                    </Box>
                  )}
                </Section>

                <Section title={t('ui.activity')} ariaLabel={t('ui.activity')}>
                  <Stack gap="sm">
                    {timeline.map((entry) => {
                      if (entry.kind === 'activity') {
                        const { activity } = entry;
                        return (
                          <Text key={`activity-${entry.id}`}>
                            <Text span fw={550}>
                              {t('issueComments.you')}
                            </Text>{' '}
                            {formatActivity(activity.action, activity.payload, workflowStatuses)}{' '}
                            <Text span c="dimmed" size="sm">
                              {formatStamp(activity.createdAt, timeZone)}
                            </Text>
                          </Text>
                        );
                      }

                      const c = entry.comment;
                      return (
                        <Stack key={`comment-${entry.id}`} gap={4}>
                          <Group justify="space-between" wrap="nowrap" align="flex-start">
                            <Text c="dimmed" size="sm">
                              <Text span fw={550} c="var(--mantine-color-text)">
                                {t('issueComments.you')}
                              </Text>
                              {' · '}
                              {formatStamp(c.createdAt, timeZone)}
                              {c.updatedAt ? (
                                <Text span ml={6}>
                                  · {t('issueComments.edited')}
                                </Text>
                              ) : null}
                            </Text>
                            <Menu withinPortal position="bottom-end">
                              <Menu.Target>
                                <ActionIcon
                                  type="button"
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  aria-label={t('issueComments.moreOptions')}
                                >
                                  <IconDotsVertical size={15} aria-hidden="true" />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item onClick={() => handlers.onEditComment(c.id, c.body)}>
                                  {t('issueComments.edit')}
                                </Menu.Item>
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={14} aria-hidden="true" />}
                                  onClick={() => handlers.onDeleteComment(c.id)}
                                >
                                  {t('issueComments.delete')}
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                          {editingCommentId === c.id ? (
                            <Stack gap="xs">
                              <Textarea
                                aria-label={t('issueComments.edit')}
                                value={editingCommentDraft}
                                onChange={handlers.onChangeCommentEdit}
                                autosize
                                minRows={2}
                                maxRows={12}
                              />
                              <Group justify="flex-end" gap="xs">
                                <Button
                                  type="button"
                                  variant="default"
                                  size="xs"
                                  onClick={handlers.onCancelCommentEdit}
                                >
                                  {t('issueComments.cancel')}
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  disabled={!editingCommentDraft.trim() && !c.attachments?.length}
                                  onClick={() => handlers.onSaveCommentEdit(c.id)}
                                >
                                  {t('issueComments.save')}
                                </Button>
                              </Group>
                            </Stack>
                          ) : c.body ? (
                            <MarkdownContent
                              html={renderMarkdown(c.body, '', `comment-${c.id}-`)}
                            />
                          ) : null}
                          <IssueAttachmentList
                            identifier={identifier}
                            attachments={c.attachments ?? []}
                          />
                          <Group gap="xs">
                            <ReactionPicker
                              target={`comment:${c.id}`}
                              openedTarget={reactionPickerTarget}
                              onOpenChange={handlers.onReactionPickerChange}
                              onSelect={handlers.onSelectReaction}
                            />
                            <ReactionSummary
                              reactions={c.reactions ?? []}
                              onToggle={(emoji) =>
                                handlers.onToggleReaction(`comment:${c.id}`, emoji)
                              }
                            />
                          </Group>
                        </Stack>
                      );
                    })}
                    <input
                      ref={commentFilesInputRef}
                      type="file"
                      multiple
                      aria-label={t('issueAttachments.chooseFiles')}
                      onChange={handlers.onCommentFilesChange}
                      style={{ display: 'none' }}
                    />
                    <Paper withBorder p="xs" radius="md">
                      {commentFiles.length ? (
                        <Stack gap={4} aria-label={t('issueAttachments.pending')} mb="xs">
                          {commentFiles.map((file, index) => (
                            <Group key={`${file.name}-${file.lastModified}-${index}`} gap="xs">
                              <IconPaperclip size={15} aria-hidden="true" />
                              <Text size="sm" truncate>
                                {file.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {t('issueAttachments.fileSize', {
                                  size: formatAttachmentSize(file.size),
                                })}
                              </Text>
                              <ActionIcon
                                type="button"
                                variant="subtle"
                                color="gray"
                                size="sm"
                                aria-label={t('issueAttachments.removeFile', { name: file.name })}
                                onClick={() => handlers.onRemoveCommentFile(index)}
                              >
                                <IconTrash size={14} aria-hidden="true" />
                              </ActionIcon>
                            </Group>
                          ))}
                        </Stack>
                      ) : null}
                      <Textarea
                        ref={noteRef}
                        minRows={1}
                        maxRows={8}
                        autosize
                        variant="unstyled"
                        aria-label={t('ui.newNote')}
                        aria-describedby="issue-comment-instructions"
                        placeholder={t('issueComments.composerPlaceholder')}
                        value={draft}
                        onChange={handlers.New_note_onChange21}
                        onKeyDown={handlers.New_note_onKeyDown22}
                      />
                      <Group justify="space-between" mt="xs">
                        <ActionIcon
                          type="button"
                          variant="subtle"
                          color="gray"
                          aria-label={t('issueAttachments.add')}
                          onClick={handlers.onChooseCommentFiles}
                        >
                          <IconPaperclip size={16} aria-hidden="true" />
                        </ActionIcon>
                        <ActionIcon
                          type="button"
                          variant="filled"
                          aria-label={t('issueAttachments.submit')}
                          onClick={handlers.onSubmitComment}
                          disabled={!draft.trim() && commentFiles.length === 0}
                        >
                          <IconArrowUp size={16} aria-hidden="true" />
                        </ActionIcon>
                      </Group>
                    </Paper>
                    <VisuallyHidden id="issue-comment-instructions">
                      {t('issueAttachments.limits')}{' '}
                      {t(
                        commentSubmitShortcut === 'enter' ? 'ui.enterToSave' : 'ui.modEnterToSave',
                      )}
                    </VisuallyHidden>
                    {commentError ? (
                      <Alert color="red" role="alert">
                        {commentError}
                      </Alert>
                    ) : null}
                  </Stack>
                </Section>
                <Section title={t('nav.adrs')}>
                  {linkedAdrs.length === 0 ? (
                    <Text c="dimmed" size="sm">
                      {t('ui.noLinkedDecisions')}
                    </Text>
                  ) : (
                    <Stack gap="xs" role="list">
                      {linkedAdrs.map((a) => (
                        <Group key={a.identifier} justify="space-between" wrap="nowrap">
                          <Group gap="sm" wrap="nowrap">
                            <Link to="/adrs/$identifier" params={{ identifier: a.identifier }}>
                              {a.identifier}
                            </Link>
                            <Text>{a.title}</Text>
                            <MetaBadge>{a.status}</MetaBadge>
                          </Group>
                          <Button
                            type="button"
                            variant="subtle"
                            aria-label={t('issueADRs.unlink', { identifier: a.identifier })}
                            onClick={() => handlers.onClick14(a)}
                          >
                            {t('ui.unlink')}
                          </Button>
                        </Group>
                      ))}
                    </Stack>
                  )}
                  <Group align="flex-end" wrap="wrap">
                    <NativeSelect
                      aria-label={t('ui.linkAdr')}
                      value={adrPick}
                      onChange={handlers.Link_ADR_onChange15}
                      data={[
                        { value: '', label: t('issueADRs.choose') },
                        ...unlinkedAdrs.map((a) => ({
                          value: String(a.number),
                          label: `${a.identifier} ${a.title}`,
                        })),
                      ]}
                      style={{ flex: 1, minWidth: 200 }}
                    />
                    <Button
                      type="button"
                      variant="subtle"
                      disabled={!adrPick}
                      onClick={handlers.onClick16}
                    >
                      {t('ui.link')}
                    </Button>
                    <Button type="button" variant="subtle" onClick={handlers.onClick17}>
                      {t('ui.newAdr')}
                    </Button>
                  </Group>
                </Section>
                <Box pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                  <AIPanel kind="issues" id={identifier} />
                </Box>
              </Stack>
            </Grid.Col>
          </Grid>
          <Modal
            opened={customReminderOpen}
            onClose={handlers.onCloseCustomReminder}
            title={t('issueActions.reminder.customTitle')}
            centered
          >
            <Stack>
              <TextInput
                type="datetime-local"
                label={t('issueActions.reminder.dateTime')}
                value={customReminderValue}
                onChange={handlers.onCustomReminderChange}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={handlers.onCloseCustomReminder}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handlers.onCustomReminderSave} disabled={!customReminderValue}>
                  {t('common.save')}
                </Button>
              </Group>
            </Stack>
          </Modal>
          <Modal
            opened={relatedIssueKind !== null}
            onClose={handlers.onCloseCreateRelated}
            title={t('issueActions.createRelatedTitle')}
            centered
          >
            <form onSubmit={handlers.onCreateRelatedSubmit}>
              <Stack>
                <TextInput
                  autoFocus
                  required
                  label={t('modal.issueTitle')}
                  placeholder={t('issueActions.relatedTitlePlaceholder')}
                  value={relatedIssueTitle}
                  onChange={handlers.onRelatedIssueTitleChange}
                />
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseCreateRelated}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!relatedIssueTitle.trim()}>
                    {t('modal.createIssue')}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Modal>
          <Modal
            opened={markAsKind !== null}
            onClose={handlers.onCloseMarkAs}
            title={t('issueActions.markAsTitle', {
              kind: markAsKind ? t(`issueActions.markAs.${markAsKind}`) : '',
            })}
            centered
          >
            <Stack>
              <Select
                label={t('issueRelations.issueLabel')}
                placeholder={t('issueRelations.chooseIssue')}
                searchable
                nothingFoundMessage={t('issueActions.markAsNothingFound')}
                data={markAsIssueOptions.map((candidate) => ({
                  value: candidate.identifier,
                  label: `${candidate.identifier} ${candidate.title}`,
                }))}
                onChange={handlers.onSelectMarkAs}
              />
              <Group justify="flex-end">
                <Button type="button" variant="default" onClick={handlers.onCloseMarkAs}>
                  {t('common.cancel')}
                </Button>
              </Group>
            </Stack>
          </Modal>
          <Modal
            opened={projectConversionOpen}
            onClose={handlers.onCloseConvertToProject}
            title={t('issueActions.project')}
            centered
          >
            <form onSubmit={handlers.onCreateProjectFromIssue}>
              <Stack>
                <TextInput
                  autoFocus
                  required
                  maxLength={120}
                  label={t('modal.projectName')}
                  value={projectConversionName}
                  onChange={handlers.Project_conversion_name_onChange}
                />
                <Textarea
                  label={t('modal.projectDescription')}
                  value={projectConversionDescription}
                  onChange={handlers.Project_conversion_description_onChange}
                  minRows={3}
                  autosize
                />
                <Group grow>
                  <NativeSelect
                    label={t('field.status')}
                    value={projectConversionStatus}
                    onChange={handlers.Project_conversion_status_onChange}
                    data={model.projectWorkflowStatuses.map((status) => ({
                      value: status.id,
                      label: projectWorkflowStatusLabel(
                        status.id,
                        model.projectWorkflowStatuses,
                        t,
                      ),
                    }))}
                  />
                  <NativeSelect
                    label={t('field.priority')}
                    value={String(projectConversionPriority)}
                    onChange={handlers.Project_conversion_priority_onChange}
                    data={[0, 1, 2, 3, 4].map((priority) => ({
                      value: String(priority),
                      label: priorityLabel(priority),
                    }))}
                  />
                </Group>
                <Group grow>
                  <TextInput
                    type="date"
                    label={t('modal.projectStartDate')}
                    value={projectConversionStartDate}
                    onChange={handlers.Project_conversion_start_onChange}
                  />
                  <TextInput
                    type="date"
                    label={t('modal.projectTargetDate')}
                    value={projectConversionTargetDate}
                    onChange={handlers.Project_conversion_target_onChange}
                  />
                </Group>
                <Text size="sm" c="dimmed">
                  {t('modal.projectIssuePreserved', { issue: issue.identifier })}
                </Text>
                <Group justify="flex-end">
                  <Button
                    type="button"
                    variant="default"
                    onClick={handlers.onCloseConvertToProject}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!projectConversionName.trim()}>
                    {t('issueActions.convertToProject')}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Modal>
          <Modal
            opened={templateOpen}
            onClose={handlers.onCloseConvertToTemplate}
            title={t('issueActions.template')}
            centered
          >
            <form onSubmit={handlers.onCreateIssueTemplate}>
              <Stack>
                <TextInput
                  autoFocus
                  required
                  maxLength={100}
                  label={t('modal.templateName')}
                  value={templateName}
                  onChange={handlers.onTemplateNameChange}
                />
                <Text size="sm" c="dimmed">
                  {issue.identifier} · {issue.title}
                </Text>
                <Group justify="flex-end">
                  <Button
                    type="button"
                    variant="default"
                    onClick={handlers.onCloseConvertToTemplate}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!templateName.trim()}>
                    {t('modal.create')}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Modal>
          <Modal
            opened={recurringOpen}
            onClose={handlers.onCloseRecurringIssue}
            title={t('issueActions.recurringIssue')}
            centered
          >
            <form onSubmit={handlers.onCreateRecurringIssue}>
              <Stack>
                <TextInput
                  autoFocus
                  required
                  maxLength={100}
                  label={t('modal.recurringName')}
                  value={recurringName}
                  onChange={handlers.onRecurringNameChange}
                />
                <TextInput
                  required
                  type="date"
                  label={t('modal.firstDueDate')}
                  value={recurringFirstDueDate}
                  onChange={handlers.onRecurringFirstDueDateChange}
                />
                <Group grow align="flex-end">
                  <TextInput
                    required
                    type="number"
                    min={1}
                    max={365}
                    label={t('modal.repeatEvery')}
                    value={recurringInterval}
                    onChange={handlers.onRecurringIntervalChange}
                  />
                  <NativeSelect
                    aria-label={t('modal.repeatEvery')}
                    value={recurringUnit}
                    onChange={handlers.onRecurringUnitChange}
                    data={(['day', 'week', 'month', 'year'] as const).map((unit) => ({
                      value: unit,
                      label: t(`modal.${unit}`),
                    }))}
                  />
                </Group>
                <Text size="sm" c="dimmed">
                  {issue.identifier} · {issue.title}
                </Text>
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseRecurringIssue}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !recurringName.trim() ||
                      !recurringFirstDueDate ||
                      Number(recurringInterval) < 1
                    }
                  >
                    {t('modal.create')}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Modal>
          <Modal
            opened={externalLinkOpen}
            onClose={handlers.onCloseExternalLink}
            title={t('issueActions.addResourceTitle', {
              kind: t(`issueLinks.${externalLinkKind}`),
            })}
            centered
          >
            <form onSubmit={handlers.External_link_onSubmit27}>
              <Stack>
                <TextInput
                  type="url"
                  required
                  autoFocus
                  label={t('issueLinks.url')}
                  placeholder={t('issueLinks.urlPlaceholder')}
                  value={externalLinkURL}
                  onChange={handlers.External_link_URL_onChange24}
                />
                <TextInput
                  label={t('issueLinks.title')}
                  placeholder={t('issueLinks.titlePlaceholder')}
                  value={externalLinkTitle}
                  onChange={handlers.External_link_title_onChange25}
                />
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseExternalLink}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!externalLinkURL.trim()}>
                    {t('issueActions.addResourceButton', {
                      kind: t(`issueLinks.${externalLinkKind}`),
                    })}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Modal>
          <Modal
            opened={dueDateOpen}
            onClose={handlers.onCloseDueDate}
            title={t('issueActions.dueDate.title')}
            centered
          >
            <Stack>
              <TextInput
                type="date"
                label={t('issueActions.dueDate.label')}
                value={dueDateValue}
                onChange={handlers.onDueDateChange}
              />
              <Group justify="space-between">
                {issue.dueDate ? (
                  <Button
                    type="button"
                    variant="subtle"
                    color="red"
                    onClick={handlers.onClearDueDate}
                  >
                    {t('issueActions.dueDate.clear')}
                  </Button>
                ) : (
                  <span />
                )}
                <Group>
                  <Button type="button" variant="default" onClick={handlers.onCloseDueDate}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="button" onClick={handlers.onSaveDueDate} disabled={!dueDateValue}>
                    {t('common.save')}
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Modal>
        </Box>
      );
    }
  }
}

export function IssueDetail(props: Parameters<typeof useIssueDetailPresenter>[0]) {
  return (
    <PresenterScope name="IssueDetail">
      <IssueDetailBinding {...props} />
    </PresenterScope>
  );
}

function IssueDetailBinding(props: Parameters<typeof useIssueDetailPresenter>[0]) {
  const model = useIssueDetailPresenter(props);
  const handlers = useActions(model.handlers);
  const sendIntent = useIntent();
  const autofocusTitle = useAutofocusTarget('title');
  const identifier = model._view === 2 ? model.identifier : '';
  const focusSub = model._view === 2 ? model.focusSub : 0;
  const focusNote = model._view === 2 ? model.focusNote : 0;
  const titleRef = useFocusWhen<HTMLInputElement>(autofocusTitle && model._view === 2, [
    identifier,
  ]);
  const subRef = useFocusWhen<HTMLTextAreaElement>(focusSub > 0, [focusSub]);
  const noteRef = useFocusWhen<HTMLTextAreaElement>(focusNote > 0, [focusNote]);
  const linkedCodeSequenceSince = useRef<number | null>(null);
  useKeyboard((event) => {
    if (model._view !== 2) {
      linkedCodeSequenceSince.current = null;
      return false;
    }
    if (
      event.target instanceof Element &&
      event.target.closest('[role="menu"], [role="listbox"], [role="dialog"]')
    ) {
      linkedCodeSequenceSince.current = null;
      return false;
    }
    const issueShortcut = issueDetailShortcutFromKeyboard(event);
    if (issueShortcut) {
      event.preventDefault();
      switch (issueShortcut) {
        case 'assign-self':
          void sendIntent('Assignee_onChange', ['self']);
          break;
        case 'toggle-favorite':
          void sendIntent('Favorite_onClick29', []);
          break;
        case 'rename':
          titleRef.current?.focus();
          titleRef.current?.select();
          break;
        case 'open-due-date':
          void sendIntent('onOpenDueDate', []);
          break;
        case 'open-sub-issue':
          void sendIntent('onOpenSubIssueEditor', []);
          break;
        case 'toggle-resources':
          void sendIntent('onToggleResources', []);
          break;
        case 'add-link':
          void sendIntent('onOpenExternalLink', ['link']);
          break;
      }
      linkedCodeSequenceSince.current = null;
      return true;
    }
    const linkedCodeSequence = issueLinkedCodeSequenceFromKeyboard(
      event,
      linkedCodeSequenceSince.current,
      Date.now(),
    );
    linkedCodeSequenceSince.current = linkedCodeSequence.pendingSince;
    if (linkedCodeSequence.action === 'open-linked-code') {
      event.preventDefault();
      void sendIntent('Open_linked_code_onClick', []);
      return true;
    }
    const shortcut = issueCopyShortcutFromKeyboard(event);
    if (!shortcut) return false;
    event.preventDefault();
    void sendIntent(ISSUE_COPY_SHORTCUT_INTENTS[shortcut], []);
    return true;
  });
  return (
    <IssueDetailView
      model={{ ...model, handlers } as typeof model}
      titleRef={titleRef}
      subRef={subRef}
      noteRef={noteRef}
    />
  );
}
