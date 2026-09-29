import { Link } from '@tanstack/react-router';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Menu,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import {
  IconCopy,
  IconChevronDown,
  IconChevronUp,
  IconChevronRight,
  IconDotsVertical,
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
import { MetaBadge, Section } from '../mantine-ui.tsx';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import { AIPanel } from './AIPanel.tsx';
import { DocumentEditor } from './DocumentEditor.tsx';
import { IssueDetailDialogs } from './IssueDetailDialogs.tsx';
import { IssueActivitySection } from './IssueActivitySection.tsx';
import { IssuePropertiesPanel } from './IssuePropertiesPanel.tsx';
import layoutStyles from './IssueDetail.module.css';
import { IssueAttachmentList } from './IssueAttachmentList.tsx';
import { ReactionPicker, ReactionSummary } from './ReactionPicker.tsx';

import {
  PresenterScope,
  useActions,
  useIntent,
  useIntentHandler,
  useKeyboard,
} from '../application/Root.tsx';
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
  const modifierShortcut = isApplePlatform ? 'Meta' : 'Control';
  const shiftKey = isApplePlatform ? '⇧' : 'Shift';
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
        reactionPickerTarget,
        reactionError,
        issueAttachmentError,
        issueAttachmentBusy,
        issueFilesInputRef,
        subTitle,
        adrPick,
        copied,
        historyRequest,
        issueOptionsOpen,
        reminderMenuOpen,
        subIssueEditorOpen,
        relationsEditorOpen,
        children,
        linkedAdrs,
        unlinkedAdrs,
        resourcesCollapsed,
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
        <Box maw={1180} mx="auto" px={{ base: 'sm', md: 'xs' }} pb="xl">
          <Menu
            position="bottom-end"
            shadow="md"
            withinPortal
            opened={issueOptionsOpen}
            onChange={handlers.onIssueOptionsChange}
          >
            <Box className={layoutStyles.issueHeader}>
              <Group
                justify="space-between"
                wrap="nowrap"
                className={layoutStyles.issueHeaderPrimary}
              >
                <Group
                  gap="xs"
                  wrap="nowrap"
                  style={{ minWidth: 0, flex: '1 1 auto', maxWidth: 'calc(100% - 40px)' }}
                >
                  <Text
                    component="h2"
                    className={layoutStyles.issueHeaderTitle}
                    title={`${identifier} ${issue.title}`}
                    data-testid="issue-header-title"
                  >
                    {identifier} {issue.title}
                  </Text>
                  {issue.parentIdentifier ? (
                    <Button type="button" variant="subtle" onClick={handlers.onClick1}>
                      {issue.parentIdentifier}
                    </Button>
                  ) : null}
                  {!issue.archivedAt ? (
                    <ActionIcon
                      type="button"
                      variant="subtle"
                      color={issue.isFavorite ? 'yellow' : 'gray'}
                      aria-label={t(
                        issue.isFavorite ? 'issueFavorite.remove' : 'issueFavorite.add',
                      )}
                      aria-pressed={issue.isFavorite}
                      title={t(issue.isFavorite ? 'issueFavorite.remove' : 'issueFavorite.add')}
                      onClick={handlers.onToggleFavorite}
                    >
                      <IconStar
                        size={15}
                        stroke={1.7}
                        fill={issue.isFavorite ? 'currentColor' : 'none'}
                        aria-hidden="true"
                      />
                    </ActionIcon>
                  ) : null}
                  {issue.archivedAt ? (
                    <MetaBadge>{t('issueActions.archivedBadge')}</MetaBadge>
                  ) : null}
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
                </Group>
              </Group>
              <Group
                justify="flex-end"
                gap={4}
                wrap="nowrap"
                className={layoutStyles.issueHeaderToolbar}
              >
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
                    radius="xl"
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
                    radius="xl"
                    aria-label={t('issueNavigation.next')}
                    title={t('issueNavigation.next')}
                    disabled={navigationPosition >= navigationTotal}
                    onClick={handlers.onNavigateNext}
                  >
                    <IconChevronDown size={15} aria-hidden="true" />
                  </ActionIcon>
                </Group>
                <ActionIcon
                  type="button"
                  variant="default"
                  radius="xl"
                  aria-label={t('issueActions.copyUrl')}
                  title={t('issueActions.copyUrl')}
                  onClick={handlers.Copy_url_onClick35}
                >
                  <IconLink size={15} stroke={1.7} aria-hidden="true" />
                </ActionIcon>
                <ActionIcon
                  type="button"
                  variant="default"
                  radius="xl"
                  aria-label={copied ? t('ui.copied') : t('ui.copyIdentifier')}
                  title={copied ? t('ui.copied') : t('ui.copyIdentifier')}
                  onClick={handlers.Copy_identifier_onClick0}
                >
                  <IconCopy size={14} stroke={1.8} aria-hidden="true" />
                </ActionIcon>
                <ActionIcon
                  type="button"
                  variant="default"
                  radius="xl"
                  aria-label={t('issueActions.copyBranch')}
                  title={t('issueActions.copyBranch')}
                  onClick={handlers.Copy_branch_onClick40}
                >
                  <IconGitBranch size={15} stroke={1.7} aria-hidden="true" />
                </ActionIcon>
                <ActionIcon
                  type="button"
                  variant="default"
                  radius="xl"
                  aria-label={t('issueActions.copyPrompt')}
                  title={t('issueActions.copyPrompt')}
                  onClick={handlers.Copy_prompt_onClick41}
                >
                  <IconFileText size={15} stroke={1.7} aria-hidden="true" />
                </ActionIcon>
                <Menu position="bottom-end" shadow="md" withinPortal>
                  <Menu.Target>
                    <ActionIcon
                      type="button"
                      variant="default"
                      radius="xl"
                      aria-label={t('codingTools.chooseTool')}
                      title={t('codingTools.chooseTool')}
                    >
                      <Group gap={0} wrap="nowrap" aria-hidden="true">
                        <IconExternalLink size={14} stroke={1.7} />
                        <IconChevronDown size={11} stroke={1.8} />
                      </Group>
                    </ActionIcon>
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
                <Menu.Dropdown aria-label={t('issueActions.button')}>
                  <Menu.Item
                    component="a"
                    href={issueReturnTo}
                    onClick={handlers.onReturnToList}
                    data-presenter-action="onReturnToList"
                  >
                    {t('ui.backToIssues')}
                  </Menu.Item>
                  <Menu.Divider />
                  {!issue.archivedAt ? (
                    <>
                      <Menu.Sub>
                        <Menu.Sub.Target>
                          <Menu.Sub.Item
                            aria-keyshortcuts="Shift+D"
                            rightSection={<CopyShortcut label={`${shiftKey} D`} />}
                          >
                            {t('issueActions.dueDate.label')}
                          </Menu.Sub.Item>
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
                      <Menu.Item
                        aria-keyshortcuts={`${modifierShortcut}+Alt+L`}
                        onClick={() => handlers.onOpenExternalLink('link')}
                        rightSection={<CopyShortcut label={`${modifierKey} ${alternateKey} L`} />}
                      >
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
                            rightSection={
                              <CopyShortcut label={`${modifierKey} ${alternateKey} C`} />
                            }
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
                            rightSection={
                              <CopyShortcut label={`${modifierKey} ${alternateKey} P`} />
                            }
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
                      <Menu.Divider />
                      <Menu.Item
                        aria-keyshortcuts="Alt+F"
                        onClick={handlers.onToggleFavorite}
                        rightSection={<CopyShortcut label={`${alternateKey} F`} />}
                      >
                        {t(issue.isFavorite ? 'issueFavorite.remove' : 'issueActions.favorite')}
                      </Menu.Item>
                      <Menu.Sub opened={reminderMenuOpen} onChange={handlers.onReminderMenuChange}>
                        <Menu.Sub.Target>
                          <Menu.Sub.Item
                            aria-keyshortcuts="Shift+H"
                            rightSection={<CopyShortcut label={`${shiftKey} H`} />}
                          >
                            {t('issueActions.remindMe')}
                          </Menu.Sub.Item>
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
                            disabled={
                              !cycles.some((cycle) => new Date(cycle.startsAt) > new Date())
                            }
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
                      <Menu.Item onClick={handlers.onOpenIssueAgentPage}>
                        {t('issueActions.openInAgent')}
                      </Menu.Item>
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
                            rightSection={
                              <CopyShortcut label={`${modifierKey} ${alternateKey} C`} />
                            }
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
                            rightSection={
                              <CopyShortcut label={`${modifierKey} ${alternateKey} P`} />
                            }
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
              </Group>
            </Box>
          </Menu>
          <Box
            className={layoutStyles.issueLayout}
            mt="md"
            inert={issue.archivedAt ? true : undefined}
            aria-disabled={issue.archivedAt ? true : undefined}
            style={issue.archivedAt ? { opacity: 0.72 } : undefined}
          >
            <Box className={layoutStyles.title}>
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
            </Box>

            <Stack className={layoutStyles.content} gap="lg">
              <DocumentEditor
                documentKey={`issues/${identifier}/body`}
                inline
                historyRequest={historyRequest}
                focusRequest={model.descriptionFocusRequest}
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
              <Stack gap="md">
                <Group gap={0} ml={-5} mt={12}>
                  <ReactionPicker
                    target="issue"
                    openedTarget={reactionPickerTarget}
                    buttonSize="md"
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
                    size="md"
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

                <Box component="section" aria-label={t('ui.subIssues')} ml={-5} pt={0} pb={10}>
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
                      size="compact-sm"
                      h={24}
                      pr={13}
                      styles={{ section: { marginInlineEnd: 3 } }}
                      leftSection={<IconPlus size={14} stroke={1.8} aria-hidden="true" />}
                      onClick={handlers.onOpenSubIssueEditor}
                    >
                      {t('issueSubIssues.add')}
                    </Button>
                  )}
                </Box>
              </Stack>

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
                            data={(['related', 'blocks', 'blockedBy', 'duplicateOf'] as const).map(
                              (kind) => ({
                                value: kind,
                                label: t(`issueRelations.${kind}`),
                              }),
                            )}
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

              {issue.externalLinks.length > 0 ? (
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
                      <Stack gap="xs" role="list" aria-label={t('issueLinks.heading')}>
                        {issue.externalLinks.map((link) => {
                          let pageSlug: string | null = null;
                          try {
                            const url = new URL(link.url);
                            const pageMarker = '/pages/';
                            const markerIndex = url.pathname.lastIndexOf(pageMarker);
                            if (url.origin === window.location.origin && markerIndex >= 0) {
                              const candidate = url.pathname.slice(markerIndex + pageMarker.length);
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
                    </Box>
                  )}
                </Section>
              ) : null}

              <IssueActivitySection model={model} noteRef={noteRef} />
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
                <AIPanel
                  kind="issues"
                  id={identifier}
                  floating
                  contextLabel={issue.title}
                  promptPlaceholder={t('issueAssistant.placeholder')}
                  starterPrompts={[
                    {
                      label: t('issueAssistant.prompts.summary'),
                      prompt: t('issueAssistant.prompts.summaryPrompt'),
                    },
                    {
                      label: t('issueAssistant.prompts.plan'),
                      prompt: t('issueAssistant.prompts.planPrompt'),
                    },
                    {
                      label: t('issueAssistant.prompts.risks'),
                      prompt: t('issueAssistant.prompts.risksPrompt'),
                    },
                  ]}
                  onOpenFullPage={handlers.onOpenIssueAgentPage}
                />
              </Box>
            </Stack>
            <Box component="aside" className={layoutStyles.properties}>
              <IssuePropertiesPanel model={model} />
            </Box>
          </Box>
          <IssueDetailDialogs model={model} />
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
  useIntentHandler('keyboard.sequence.cancel', () => {
    linkedCodeSequenceSince.current = null;
  });
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
        case 'open-status':
          void sendIntent('onOpenIssuePropertyMenu', ['status']);
          break;
        case 'open-priority':
          void sendIntent('onOpenIssuePropertyMenu', ['priority']);
          break;
        case 'open-labels':
          void sendIntent('onOpenIssuePropertyMenu', ['labels']);
          break;
        case 'open-estimate':
          void sendIntent('onOpenIssuePropertyMenu', ['estimate']);
          break;
        case 'create-linked-adr':
          void sendIntent('adr.create', { issueNumber: model.issue.number });
          break;
        case 'focus-description':
          void sendIntent('onFocusDescription', []);
          break;
        case 'toggle-favorite':
          void sendIntent('onToggleFavorite', []);
          break;
        case 'rename':
          titleRef.current?.focus();
          titleRef.current?.select();
          break;
        case 'open-due-date':
          void sendIntent('onOpenDueDate', []);
          break;
        case 'open-reminder':
          void sendIntent('onOpenIssueReminderMenu', []);
          break;
        case 'open-sub-issue':
          void sendIntent('onOpenSubIssueEditor', []);
          break;
        case 'open-parent':
          if (model.issue.parentIdentifier) void sendIntent('onClick1', []);
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
