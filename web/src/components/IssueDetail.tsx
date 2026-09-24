import { Link } from '@tanstack/react-router';
import {
  ActionIcon,
  Anchor,
  Alert,
  Box,
  Button,
  Grid,
  Group,
  Image,
  Menu,
  Modal,
  NativeSelect,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import {
  IconDotsVertical,
  IconExternalLink,
  IconFileText,
  IconPaperclip,
  IconStar,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { formatActivity } from '../activity.ts';
import { MarkdownContent, MetaBadge, Section } from '../mantine-ui.tsx';
import { renderMarkdown } from '../markdown.ts';
import { formatStamp } from '../time.ts';
import { issueStatusLabel } from '../i18n/labels.ts';
import { priorityLabel } from '../i18n/labels.ts';
import { PROJECT_STATUSES } from '../types.ts';
import { AIPanel } from './AIPanel.tsx';
import { DocumentEditor } from './DocumentEditor.tsx';
import { IssuePropertiesPanel } from './IssuePropertiesPanel.tsx';
import { ReactionPicker, ReactionSummary } from './ReactionPicker.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
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
        issue,
        cycles,
        pages,
        comments,
        editingCommentId,
        editingCommentDraft,
        reactionPickerTarget,
        reactionPickerQuery,
        reactionError,
        commentFiles,
        commentError,
        commentFilesInputRef,
        commentSubmitShortcut,
        activities,
        draft,
        subTitle,
        adrPick,
        timeZone,
        copied,
        historyRequest,
        customReminderOpen,
        customReminderValue,
        issueOptionsOpen,
        relatedIssueKind,
        relatedIssueTitle,
        markAsKind,
        markAsIssueOptions,
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
        dueDateOpen,
        dueDateValue,
        hasUpcomingCycle,
        relationTarget,
        relationKind,
        relationIssues,
        relationTargetOptions,
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
              <Link
                to="/issues"
                aria-label={t('ui.backToIssues')}
                style={{
                  color: 'var(--mantine-color-dimmed)',
                  fontSize: 'var(--mantine-font-size-xs)',
                }}
              >
                {t('nav.issues')}
              </Link>
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
            </Group>
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
                <Menu.Sub>
                  <Menu.Sub.Target>
                    <Menu.Sub.Item>{t('issueActions.dueDate.label')}</Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown>
                    <Menu.Sub.Item onClick={() => handlers.onSetDueDatePreset('tomorrow')}>
                      {t('issueActions.dueDate.tomorrow')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onSetDueDatePreset('week')}>
                      {t('issueActions.dueDate.week')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item
                      disabled={!hasUpcomingCycle}
                      onClick={() => handlers.onSetDueDatePreset('cycle')}
                    >
                      {t('issueActions.dueDate.cycle')}
                    </Menu.Sub.Item>
                    <Menu.Divider />
                    <Menu.Sub.Item onClick={handlers.onOpenDueDate}>
                      {t('issueActions.dueDate.custom')}
                    </Menu.Sub.Item>
                    {issue.dueDate ? (
                      <Menu.Sub.Item onClick={handlers.onClearDueDate}>
                        {t('issueActions.dueDate.clear')}
                      </Menu.Sub.Item>
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
                <Menu.Label>{t('issueActions.copy')}</Menu.Label>
                <Menu.Item onClick={handlers.Copy_id_onClick34}>
                  {t('issueActions.copyId')}
                </Menu.Item>
                <Menu.Item onClick={handlers.Copy_url_onClick35}>
                  {t('issueActions.copyUrl')}
                </Menu.Item>
                <Menu.Item onClick={handlers.Copy_title_onClick36}>
                  {t('issueActions.copyTitle')}
                </Menu.Item>
                <Menu.Item onClick={handlers.Copy_title_link_onClick37}>
                  {t('issueActions.copyTitleLink')}
                </Menu.Item>
                <Menu.Item onClick={handlers.Copy_issue_markdown_onClick38}>
                  {t('issueActions.copyIssueMarkdown')}
                </Menu.Item>
                <Menu.Item onClick={handlers.Copy_everything_onClick39}>
                  {t('issueActions.copyEverything')}
                </Menu.Item>
                <Menu.Item onClick={handlers.Copy_branch_onClick40}>
                  {t('issueActions.copyBranch')}
                </Menu.Item>
                <Menu.Item onClick={handlers.Copy_prompt_onClick41}>
                  {t('issueActions.copyPrompt')}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Sub>
                  <Menu.Sub.Target>
                    <Menu.Sub.Item>{t('issueActions.createRelated')}</Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown>
                    <Menu.Sub.Item onClick={() => handlers.onOpenCreateRelated('issue')}>
                      {t('issueActions.related.issue')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onOpenCreateRelated('subIssue')}>
                      {t('issueActions.related.subIssue')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onOpenCreateRelated('parent')}>
                      {t('issueActions.related.parent')}
                    </Menu.Sub.Item>
                    <Menu.Divider />
                    <Menu.Sub.Item onClick={() => handlers.onOpenCreateRelated('blocked')}>
                      {t('issueActions.related.blocked')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onOpenCreateRelated('blocking')}>
                      {t('issueActions.related.blocking')}
                    </Menu.Sub.Item>
                  </Menu.Sub.Dropdown>
                </Menu.Sub>
                <Menu.Sub>
                  <Menu.Sub.Target>
                    <Menu.Sub.Item>{t('issueActions.markAs.label')}</Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown>
                    <Menu.Sub.Item onClick={() => handlers.onOpenMarkAs('parentOf')}>
                      {t('issueActions.markAs.parentOf')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onOpenMarkAs('subIssueOf')}>
                      {t('issueActions.markAs.subIssueOf')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onOpenMarkAs('relatedTo')}>
                      {t('issueActions.markAs.relatedTo')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onOpenMarkAs('blockedBy')}>
                      {t('issueActions.markAs.blockedBy')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onOpenMarkAs('blocking')}>
                      {t('issueActions.markAs.blocking')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onOpenMarkAs('duplicateOf')}>
                      {t('issueActions.markAs.duplicateOf')}
                    </Menu.Sub.Item>
                  </Menu.Sub.Dropdown>
                </Menu.Sub>
                <Menu.Divider />
                <Menu.Sub>
                  <Menu.Sub.Target>
                    <Menu.Sub.Item>{t('issueActions.convertTo')}</Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown>
                    <Menu.Sub.Item onClick={handlers.onOpenConvertToProject}>
                      {t('issueActions.project')}
                    </Menu.Sub.Item>
                    <Menu.Divider />
                    <Menu.Sub.Item onClick={handlers.onOpenConvertToTemplate}>
                      {t('issueActions.template')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={handlers.onOpenRecurringIssue}>
                      {t('issueActions.recurringIssue')}
                    </Menu.Sub.Item>
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
                    <Menu.Sub.Item onClick={() => handlers.onSetReminder('hour')}>
                      {t('issueActions.reminder.hour')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onSetReminder('tomorrow')}>
                      {t('issueActions.reminder.tomorrow')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onSetReminder('week')}>
                      {t('issueActions.reminder.week')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item onClick={() => handlers.onSetReminder('month')}>
                      {t('issueActions.reminder.month')}
                    </Menu.Sub.Item>
                    <Menu.Sub.Item
                      disabled={!cycles.some((cycle) => new Date(cycle.startsAt) > new Date())}
                      onClick={() => handlers.onSetReminder('cycle')}
                    >
                      {t('issueActions.reminder.cycle')}
                    </Menu.Sub.Item>
                    <Menu.Divider />
                    <Menu.Sub.Item onClick={handlers.onOpenCustomReminder}>
                      {t('issueActions.reminder.custom')}
                    </Menu.Sub.Item>
                    {issue.reminderAt ? (
                      <Menu.Sub.Item onClick={handlers.onClearReminder}>
                        {t('issueActions.reminder.clear')}
                      </Menu.Sub.Item>
                    ) : null}
                  </Menu.Sub.Dropdown>
                </Menu.Sub>
                <Menu.Item onClick={handlers.Show_description_history_onClick50}>
                  {t('issueActions.descriptionHistory')}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" onClick={handlers.onClick2}>
                  {t('issueActions.delete')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          <Grid gap="xl" mt="md">
            <Grid.Col span={{ base: 12, md: 9 }}>
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
                      fontSize: 'var(--mantine-h1-font-size)',
                      fontWeight: 600,
                      lineHeight: 1.3,
                    },
                  }}
                />

                <DocumentEditor
                  documentKey={`issues/${identifier}/body`}
                  inline
                  historyRequest={historyRequest}
                />
                <Group gap="xs">
                  <ReactionPicker
                    target="issue"
                    openedTarget={reactionPickerTarget}
                    query={reactionPickerQuery}
                    onOpenChange={handlers.onReactionPickerChange}
                    onQueryChange={handlers.onReactionSearchChange}
                    onSelect={handlers.onSelectReaction}
                  />
                  <ReactionSummary
                    reactions={issue.reactions ?? []}
                    onToggle={(emoji) => handlers.onToggleReaction('issue', emoji)}
                  />
                </Group>
                {reactionError ? (
                  <Alert color="red" role="alert">
                    {reactionError}
                  </Alert>
                ) : null}

                <Section title={t('issueLinks.heading')}>
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
                            const candidate = url.pathname.slice(markerIndex + pageMarker.length);
                            if (candidate && !candidate.includes('/')) {
                              pageSlug = decodeURIComponent(candidate);
                            }
                          }
                        } catch {
                          pageSlug = null;
                        }
                        const page = pageSlug ? pages.find((item) => item.slug === pageSlug) : null;
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
                  <form onSubmit={handlers.External_link_onSubmit27}>
                    <Stack gap="xs">
                      <Group align="flex-end" wrap="wrap">
                        <TextInput
                          type="url"
                          required
                          label={t('issueLinks.url')}
                          placeholder={t('issueLinks.urlPlaceholder')}
                          value={externalLinkURL}
                          onChange={handlers.External_link_URL_onChange24}
                          style={{ flex: '1 1 240px' }}
                        />
                        <TextInput
                          label={t('issueLinks.title')}
                          placeholder={t('issueLinks.titlePlaceholder')}
                          value={externalLinkTitle}
                          onChange={handlers.External_link_title_onChange25}
                          style={{ flex: '1 1 200px' }}
                        />
                        <NativeSelect
                          aria-label={t('issueLinks.kind')}
                          value={externalLinkKind}
                          onChange={handlers.External_link_kind_onChange26}
                          data={(['link', 'pullRequest', 'document'] as const).map((kind) => ({
                            value: kind,
                            label: t(`issueLinks.${kind}`),
                          }))}
                        />
                        <Button type="submit" disabled={!externalLinkURL.trim()}>
                          {t('issueLinks.add')}
                        </Button>
                      </Group>
                    </Stack>
                  </form>
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

                <Section title={t('ui.subIssues')}>
                  {children.length === 0 ? (
                    <Text c="dimmed" size="sm">
                      {t('ui.breakIntoSmallerWork')}
                    </Text>
                  ) : (
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
                            <MetaBadge>{issueStatusLabel(c.status)}</MetaBadge>
                          </Group>
                        </Button>
                      ))}
                    </Stack>
                  )}
                  <Textarea
                    ref={subRef}
                    rows={2}
                    aria-label={t('ui.newSubIssue')}
                    placeholder={t('ui.addSubIssue')}
                    value={subTitle}
                    onChange={handlers.New_sub_issue_onChange19}
                    onKeyDown={handlers.New_sub_issue_onKeyDown20}
                  />
                </Section>

                <Section title={t('issueRelations.heading')}>
                  {relationIssues.length === 0 ? (
                    <Text c="dimmed" size="sm">
                      {t('issueRelations.empty')}
                    </Text>
                  ) : (
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
                  )}
                  <form onSubmit={handlers.Relation_onSubmit32}>
                    <Group align="flex-end" wrap="wrap">
                      <NativeSelect
                        aria-label={t('issueRelations.kindLabel')}
                        value={relationKind}
                        onChange={handlers.Relation_kind_onChange31}
                        data={(['related', 'blocks', 'blockedBy', 'duplicateOf'] as const).map(
                          (kind) => ({ value: kind, label: t(`issueRelations.${kind}`) }),
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
                      <Button type="submit" disabled={!relationTarget}>
                        {t('issueRelations.add')}
                      </Button>
                    </Group>
                  </form>
                </Section>

                <Section title={t('ui.notes')}>
                  <Stack gap="sm">
                    {comments.map((c) => (
                      <Stack key={c.id} gap={4}>
                        <Group justify="space-between" wrap="nowrap" align="flex-start">
                          <Text c="dimmed" size="sm">
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
                          <MarkdownContent html={renderMarkdown(c.body, '', `comment-${c.id}-`)} />
                        ) : null}
                        {(c.attachments ?? []).map((attachment) => {
                          const src = `/api/issues/${encodeURIComponent(identifier)}/attachments/${encodeURIComponent(attachment.id)}`;
                          const mediaType = attachment.mediaType.split(';')[0];
                          const isPreviewImage = [
                            'image/jpeg',
                            'image/png',
                            'image/gif',
                            'image/webp',
                          ].includes(mediaType);
                          const isPreviewVideo = ['video/mp4', 'video/webm'].includes(mediaType);
                          return isPreviewImage ? (
                            <Anchor
                              key={attachment.id}
                              href={src}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={t('issueAttachments.imagePreview', {
                                name: attachment.name,
                              })}
                              style={{ width: 'fit-content', maxWidth: '100%' }}
                            >
                              <Image
                                src={src}
                                alt={attachment.name}
                                maw={420}
                                mah={320}
                                fit="contain"
                                radius="sm"
                              />
                            </Anchor>
                          ) : isPreviewVideo ? (
                            <Box
                              key={attachment.id}
                              component="video"
                              src={src}
                              controls
                              preload="metadata"
                              aria-label={attachment.name}
                              style={{ maxWidth: 'min(100%, 420px)', maxHeight: 320 }}
                            />
                          ) : (
                            <Anchor
                              key={attachment.id}
                              href={src}
                              download={attachment.name}
                              style={{ width: 'fit-content' }}
                            >
                              <Group gap="xs" wrap="nowrap">
                                <IconPaperclip size={16} aria-hidden="true" />
                                <Text size="sm">{attachment.name}</Text>
                                <Text size="xs" c="dimmed">
                                  {t('issueAttachments.fileSize', {
                                    size: formatAttachmentSize(attachment.size),
                                  })}
                                </Text>
                              </Group>
                            </Anchor>
                          );
                        })}
                        <Group gap="xs">
                          <ReactionPicker
                            target={`comment:${c.id}`}
                            openedTarget={reactionPickerTarget}
                            query={reactionPickerQuery}
                            onOpenChange={handlers.onReactionPickerChange}
                            onQueryChange={handlers.onReactionSearchChange}
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
                    ))}
                    <input
                      ref={commentFilesInputRef}
                      type="file"
                      multiple
                      aria-label={t('issueAttachments.chooseFiles')}
                      onChange={handlers.onCommentFilesChange}
                      style={{ display: 'none' }}
                    />
                    {commentFiles.length ? (
                      <Stack gap={4} aria-label={t('issueAttachments.pending')}>
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
                      rows={3}
                      aria-label={t('ui.newNote')}
                      placeholder={t('ui.note')}
                      value={draft}
                      onChange={handlers.New_note_onChange21}
                      onKeyDown={handlers.New_note_onKeyDown22}
                    />
                    <Group justify="space-between" wrap="wrap">
                      <Button
                        type="button"
                        variant="subtle"
                        size="sm"
                        leftSection={<IconPaperclip size={16} aria-hidden="true" />}
                        onClick={handlers.onChooseCommentFiles}
                      >
                        {t('issueAttachments.add')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handlers.onSubmitComment}
                        disabled={!draft.trim() && commentFiles.length === 0}
                      >
                        {t('issueAttachments.submit')}
                      </Button>
                    </Group>
                    <Text c="dimmed" size="xs">
                      {t('issueAttachments.limits')}
                    </Text>
                    {commentError ? (
                      <Alert color="red" role="alert">
                        {commentError}
                      </Alert>
                    ) : null}
                    <Text c="dimmed" size="sm">
                      {t(
                        commentSubmitShortcut === 'enter' ? 'ui.enterToSave' : 'ui.modEnterToSave',
                      )}
                    </Text>
                  </Stack>
                </Section>

                <Section title={t('ui.activity')}>
                  <Stack gap="sm">
                    {activities.map((a) => (
                      <Text key={a.id}>
                        {formatActivity(a.action, a.payload)}{' '}
                        <Text span c="dimmed" size="sm">
                          {formatStamp(a.createdAt, timeZone)}
                        </Text>
                      </Text>
                    ))}
                  </Stack>
                </Section>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <IssuePropertiesPanel model={model} />
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
                    data={PROJECT_STATUSES.map((status) => ({
                      value: status,
                      label: t(`projectStatus.${status}`),
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
  const autofocusTitle = useAutofocusTarget('title');
  const identifier = model._view === 2 ? model.identifier : '';
  const focusSub = model._view === 2 ? model.focusSub : 0;
  const focusNote = model._view === 2 ? model.focusNote : 0;
  const titleRef = useFocusWhen<HTMLInputElement>(autofocusTitle && model._view === 2, [
    identifier,
  ]);
  const subRef = useFocusWhen<HTMLTextAreaElement>(focusSub > 0, [focusSub]);
  const noteRef = useFocusWhen<HTMLTextAreaElement>(focusNote > 0, [focusNote]);
  return (
    <IssueDetailView
      model={{ ...model, handlers } as typeof model}
      titleRef={titleRef}
      subRef={subRef}
      noteRef={noteRef}
    />
  );
}
