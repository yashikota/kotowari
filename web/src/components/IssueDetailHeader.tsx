import { ActionIcon, Box, Button, Group, Menu, Text } from '@mantine/core';
import {
  IconCopy,
  IconChevronDown,
  IconChevronUp,
  IconDotsVertical,
  IconExternalLink,
  IconFileText,
  IconGitBranch,
  IconLink,
  IconStar,
} from '@tabler/icons-react';
import { useActionFocusReturn } from '../focus.ts';
import { useTranslation } from 'react-i18next';
import { useClipboardFocus } from '../design-system/ClipboardFeedback.tsx';
import { MetaBadge } from '../mantine-ui.tsx';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';
import layoutStyles from './IssueDetail.module.css';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;
type IssueHeaderHandlers = Pick<
  IssueDetailModel['handlers'],
  | 'Copy_branch_onClick40'
  | 'Copy_everything_onClick39'
  | 'Copy_id_onClick34'
  | 'Copy_identifier_onClick0'
  | 'Copy_issue_markdown_onClick38'
  | 'Copy_prompt_onClick41'
  | 'Copy_title_link_onClick37'
  | 'Copy_title_onClick36'
  | 'Copy_url_onClick35'
  | 'Create_document_onClick44'
  | 'Make_copy_onClick42'
  | 'Show_description_history_onClick50'
  | 'onArchiveIssue'
  | 'onClearDueDate'
  | 'onClearReminder'
  | 'onClick1'
  | 'onDeleteIssue'
  | 'onIssueOptionsChange'
  | 'onNavigateNext'
  | 'onNavigatePrevious'
  | 'onOpenCodingTool'
  | 'onOpenCodingToolSettings'
  | 'onOpenApplyTemplate'
  | 'onOpenConvertToProject'
  | 'onOpenConvertToTemplate'
  | 'onOpenCreateRelated'
  | 'onOpenCustomReminder'
  | 'onOpenDueDate'
  | 'onOpenExternalLink'
  | 'onOpenIssueAgentPage'
  | 'onOpenMarkAs'
  | 'onOpenRecurringIssue'
  | 'onOpenRelationsEditor'
  | 'onReminderMenuChange'
  | 'onReturnToList'
  | 'onSetDueDatePreset'
  | 'onSetReminder'
  | 'onToggleFavorite'
>;
type IssueHeaderModel = Pick<
  IssueDetailModel,
  | 'identifier'
  | 'issueReturnTo'
  | 'navigationPosition'
  | 'navigationTotal'
  | 'cycles'
  | 'hasUpcomingCycle'
  | 'clipboard'
  | 'issueOptionsOpen'
  | 'archivePending'
  | 'reminderMenuOpen'
  | 'reminderEditor'
  | 'dueDateSaving'
  | 'codingToolName'
  | 'codingToolURL'
> & {
  issue: Pick<
    IssueDetailModel['issue'],
    'title' | 'parentIdentifier' | 'archivedAt' | 'isFavorite' | 'dueDate' | 'reminderAt'
  >;
  handlers: IssueHeaderHandlers;
};

function CopyShortcut({ label }: { label: string }) {
  return (
    <Text component="span" size="xs" c="dimmed" aria-hidden="true" data-testid="copy-shortcut">
      {label}
    </Text>
  );
}

export function IssueDetailHeader({ model }: { model: IssueHeaderModel }) {
  const { t } = useTranslation();
  const { runCopy, onMenuExited } = useClipboardFocus({
    clipboard: model.clipboard,
    scope: model.identifier,
    feedbackSelector: '[data-issue-copy-feedback]',
    menuSelector: '[data-issue-options-menu]',
    fallback: () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.getAttribute('aria-label') === t('issueActions.button'),
      ) ?? null,
  });
  const runArchive = useActionFocusReturn(
    model.archivePending,
    () =>
      document.querySelector<HTMLButtonElement>(
        '[data-issue-archive-feedback] [role="alert"] button:not(:disabled)',
      ) ??
      Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.getAttribute('aria-label') === t('issueActions.button'),
      ) ??
      null,
    (active) =>
      active === document.body || active?.getAttribute('aria-label') === t('issueActions.button'),
    model.identifier,
  );
  const {
    identifier,
    issueReturnTo,
    navigationPosition,
    navigationTotal,
    issue,
    cycles,
    hasUpcomingCycle,
    clipboard,
    issueOptionsOpen,
    reminderMenuOpen,
    codingToolName,
    codingToolURL,
    handlers,
  } = model;
  const isApplePlatform =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const modifierKey = isApplePlatform ? '⌘' : 'Ctrl';
  const modifierShortcut = isApplePlatform ? 'Meta' : 'Control';
  const shiftKey = isApplePlatform ? '⇧' : 'Shift';
  const alternateKey = isApplePlatform ? '⌥' : 'Alt';

  return (
    <Menu
      position="bottom-end"
      shadow="md"
      withinPortal
      opened={issueOptionsOpen}
      onChange={handlers.onIssueOptionsChange}
      onExitTransitionEnd={onMenuExited}
    >
      <Box className={layoutStyles.issueHeader}>
        {model.dueDateSaving ? (
          <Text role="status" size="sm" c="dimmed">
            {t('issueActions.dueDate.saving')}
          </Text>
        ) : null}
        {model.reminderEditor.saving ? (
          <Text role="status" size="sm" c="dimmed">
            {t('issueActions.reminder.saving')}
          </Text>
        ) : null}
        <Group justify="space-between" wrap="nowrap" className={layoutStyles.issueHeaderPrimary}>
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
                aria-label={t(issue.isFavorite ? 'issueFavorite.remove' : 'issueFavorite.add')}
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
            {issue.archivedAt ? <MetaBadge>{t('issueActions.archivedBadge')}</MetaBadge> : null}
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
        <Group justify="flex-end" gap={4} wrap="nowrap" className={layoutStyles.issueHeaderToolbar}>
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
            disabled={clipboard.pending}
            onClick={() => runCopy(handlers.Copy_url_onClick35)}
          >
            <IconLink size={15} stroke={1.7} aria-hidden="true" />
          </ActionIcon>
          <ActionIcon
            type="button"
            variant="default"
            radius="xl"
            aria-label={t('ui.copyIdentifier')}
            title={t('ui.copyIdentifier')}
            disabled={clipboard.pending}
            onClick={() => runCopy(handlers.Copy_identifier_onClick0)}
          >
            <IconCopy size={14} stroke={1.8} aria-hidden="true" />
          </ActionIcon>
          <ActionIcon
            type="button"
            variant="default"
            radius="xl"
            aria-label={t('issueActions.copyBranch')}
            title={t('issueActions.copyBranch')}
            disabled={clipboard.pending}
            onClick={() => runCopy(handlers.Copy_branch_onClick40)}
          >
            <IconGitBranch size={15} stroke={1.7} aria-hidden="true" />
          </ActionIcon>
          <ActionIcon
            type="button"
            variant="default"
            radius="xl"
            aria-label={t('issueActions.copyPrompt')}
            title={t('issueActions.copyPrompt')}
            disabled={clipboard.pending}
            onClick={() => runCopy(handlers.Copy_prompt_onClick41)}
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
              <Menu.Item
                disabled={clipboard.pending}
                onClick={() => runCopy(handlers.Copy_prompt_onClick41)}
              >
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
          <Menu.Dropdown aria-label={t('issueActions.button')} data-issue-options-menu>
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
                  <Menu.Sub.Dropdown style={{ minWidth: 300 }} data-issue-options-menu>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_id_onClick34)}
                      rightSection={<CopyShortcut label={`${modifierKey} .`} />}
                    >
                      {t('issueActions.copyId')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_url_onClick35)}
                      rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} ,`} />}
                    >
                      {t('issueActions.copyUrl')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_title_onClick36)}
                      rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} '`} />}
                    >
                      {t('issueActions.copyTitle')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_title_link_onClick37)}
                      rightSection={<CopyShortcut label={`${modifierKey} C`} />}
                    >
                      {t('issueActions.copyTitleLink')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_issue_markdown_onClick38)}
                    >
                      {t('issueActions.copyIssueMarkdown')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_everything_onClick39)}
                      rightSection={<CopyShortcut label={`${modifierKey} ${alternateKey} C`} />}
                    >
                      {t('issueActions.copyEverything')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_branch_onClick40)}
                      rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} .`} />}
                    >
                      {t('issueActions.copyBranch')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_prompt_onClick41)}
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
                <Menu.Item
                  aria-keyshortcuts={`${modifierShortcut}+Alt+Shift+T`}
                  onClick={handlers.onOpenApplyTemplate}
                  rightSection={
                    <CopyShortcut label={`${modifierKey} ${alternateKey} ${shiftKey} T`} />
                  }
                >
                  {t('issueActions.applyTemplate')}
                </Menu.Item>
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
                      disabled={model.reminderEditor.saving}
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
                <Menu.Item onClick={handlers.onOpenIssueAgentPage}>
                  {t('issueActions.openInAgent')}
                </Menu.Item>
                <Menu.Item onClick={handlers.Show_description_history_onClick50}>
                  {t('issueActions.descriptionHistory')}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  disabled={model.archivePending}
                  onClick={() => runArchive(handlers.onArchiveIssue)}
                >
                  {t('issueActions.archive')}
                </Menu.Item>
                <Menu.Item
                  color="red"
                  aria-keyshortcuts={`${modifierShortcut}+Delete`}
                  onClick={handlers.onDeleteIssue}
                  rightSection={<CopyShortcut label={`${modifierKey} ${t('ui.keyDelete')}`} />}
                >
                  {t('issueActions.delete')}
                </Menu.Item>
              </>
            ) : (
              <>
                <Menu.Sub>
                  <Menu.Sub.Target>
                    <Menu.Sub.Item>{t('issueActions.copy')}</Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown style={{ minWidth: 300 }} data-issue-options-menu>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_id_onClick34)}
                      rightSection={<CopyShortcut label={`${modifierKey} .`} />}
                    >
                      {t('issueActions.copyId')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_url_onClick35)}
                      rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} ,`} />}
                    >
                      {t('issueActions.copyUrl')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_title_onClick36)}
                      rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} '`} />}
                    >
                      {t('issueActions.copyTitle')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_title_link_onClick37)}
                      rightSection={<CopyShortcut label={`${modifierKey} C`} />}
                    >
                      {t('issueActions.copyTitleLink')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_issue_markdown_onClick38)}
                    >
                      {t('issueActions.copyIssueMarkdown')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_everything_onClick39)}
                      rightSection={<CopyShortcut label={`${modifierKey} ${alternateKey} C`} />}
                    >
                      {t('issueActions.copyEverything')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_branch_onClick40)}
                      rightSection={<CopyShortcut label={`${modifierKey} ${shiftKey} .`} />}
                    >
                      {t('issueActions.copyBranch')}
                    </Menu.Item>
                    <Menu.Item
                      disabled={clipboard.pending}
                      onClick={() => runCopy(handlers.Copy_prompt_onClick41)}
                      rightSection={<CopyShortcut label={`${modifierKey} ${alternateKey} P`} />}
                    >
                      {t('issueActions.copyPrompt')}
                    </Menu.Item>
                  </Menu.Sub.Dropdown>
                </Menu.Sub>
                <Menu.Divider />
                <Menu.Item
                  aria-keyshortcuts="#"
                  disabled={model.archivePending}
                  onClick={() => runArchive(handlers.onArchiveIssue)}
                  rightSection={<CopyShortcut label="#" />}
                >
                  {t('issueActions.restore')}
                </Menu.Item>
                <Menu.Item
                  color="red"
                  aria-keyshortcuts={`${modifierShortcut}+Delete`}
                  onClick={handlers.onDeleteIssue}
                  rightSection={<CopyShortcut label={`${modifierKey} ${t('ui.keyDelete')}`} />}
                >
                  {t('issueActions.delete')}
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Group>
      </Box>
    </Menu>
  );
}
