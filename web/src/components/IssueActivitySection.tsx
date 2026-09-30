import {
  ActionIcon,
  Alert,
  Avatar,
  Button,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  Textarea,
  VisuallyHidden,
} from '@mantine/core';
import {
  IconArrowUp,
  IconBell,
  IconDotsVertical,
  IconPaperclip,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatActivity, formatPriorityActivityGroup } from '../activity.ts';
import { useFocusWhen } from '../focus.ts';
import { MarkdownContent, Section } from '../mantine-ui.tsx';
import { renderMarkdown } from '../markdown.ts';
import { formatRelativeTime } from '../time.ts';
import { useIssueWorkflow } from '../workflow.tsx';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';
import { formatAttachmentSize, IssueAttachmentList } from './IssueAttachmentList.tsx';
import { ReactionPicker, ReactionSummary } from './ReactionPicker.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;
type IssueActivityHandlers = Pick<
  IssueDetailModel['handlers'],
  | 'New_note_onChange21'
  | 'New_note_onKeyDown22'
  | 'Subscription_onClick'
  | 'onCancelCommentEdit'
  | 'onChangeCommentEdit'
  | 'onChooseCommentFiles'
  | 'onCommentFilesChange'
  | 'onDeleteComment'
  | 'onEditComment'
  | 'onRemoveCommentFile'
  | 'onReactionPickerChange'
  | 'onSaveCommentEdit'
  | 'onSelectReaction'
  | 'onSubmitComment'
  | 'onToggleReaction'
>;
type IssueActivityModel = Pick<
  IssueDetailModel,
  | 'commentError'
  | 'commentFiles'
  | 'commentFilesInputRef'
  | 'commentSubmitShortcut'
  | 'draft'
  | 'editingCommentDraft'
  | 'editingCommentId'
  | 'identifier'
  | 'isSubscribed'
  | 'reactionPickerTarget'
  | 'timeline'
> & { handlers: IssueActivityHandlers };

type Props = {
  model: IssueActivityModel;
  noteRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
};

function ActivityAvatar() {
  return (
    <Avatar
      size={20}
      radius="xl"
      color="gray"
      aria-hidden="true"
      data-testid="issue-activity-avatar"
    >
      <IconUser size={12} stroke={1.8} />
    </Avatar>
  );
}

export function IssueActivitySection({ model, noteRef }: Props) {
  const { t, i18n } = useTranslation();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const {
    commentError,
    commentFiles,
    commentFilesInputRef,
    commentSubmitShortcut,
    draft,
    editingCommentDraft,
    editingCommentId,
    identifier,
    isSubscribed,
    reactionPickerTarget,
    timeline,
    handlers,
  } = model;

  return (
    <Section
      title={t('ui.activity')}
      ariaLabel={t('ui.activity')}
      titleVariant="heading"
      action={
        <ActionIcon
          type="button"
          variant="subtle"
          color={isSubscribed ? 'blue' : 'gray'}
          aria-label={t(
            isSubscribed ? 'issueSubscription.unsubscribe' : 'issueSubscription.subscribe',
          )}
          aria-pressed={isSubscribed}
          title={t(isSubscribed ? 'issueSubscription.unsubscribe' : 'issueSubscription.subscribe')}
          onClick={handlers.Subscription_onClick}
        >
          <IconBell
            size={15}
            stroke={1.7}
            fill={isSubscribed ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </ActionIcon>
      }
    >
      <Stack gap="sm">
        {timeline.map((entry) => {
          if (entry.kind === 'activity') {
            const { activity } = entry;
            const locale = i18n.resolvedLanguage ?? i18n.language;
            const action = formatActivity(
              activity.action,
              activity.payload,
              workflowStatuses,
            ).replace(/^\p{Lu}/u, (letter) => letter.toLocaleLowerCase(locale));
            return (
              <Group
                key={`activity-${entry.id}`}
                gap="xs"
                wrap="nowrap"
                align="flex-start"
                data-testid="issue-activity-entry"
              >
                <ActivityAvatar />
                <Text size="sm" style={{ flex: 1, minWidth: 0 }}>
                  <Text span fw={550}>
                    {t('issueComments.you')}
                  </Text>{' '}
                  {action}{' '}
                  <Text span c="dimmed" size="sm">
                    ·{' '}
                    {formatRelativeTime(activity.createdAt, locale, {
                      numeric: 'always',
                      style: 'narrow',
                    })}
                  </Text>
                </Text>
              </Group>
            );
          }

          if (entry.kind === 'priority-group') {
            const locale = i18n.resolvedLanguage ?? i18n.language;
            const summary = formatPriorityActivityGroup(entry.activities).replace(
              /^\p{Lu}/u,
              (letter) => letter.toLocaleLowerCase(locale),
            );
            return (
              <Group
                key={`priority-group-${entry.id}`}
                gap="xs"
                wrap="nowrap"
                align="flex-start"
                data-testid="issue-activity-group"
              >
                <ActivityAvatar />
                <details style={{ flex: 1, minWidth: 0 }}>
                  <summary
                    data-testid="issue-activity-entry"
                    style={{ cursor: 'pointer', minWidth: 0 }}
                  >
                    <Text size="sm" style={{ minWidth: 0 }}>
                      <Text span fw={550}>
                        {t('issueComments.you')}
                      </Text>{' '}
                      {summary}{' '}
                      <Text span c="dimmed" size="sm">
                        ·{' '}
                        {formatRelativeTime(entry.createdAt, locale, {
                          numeric: 'always',
                          style: 'narrow',
                        })}
                      </Text>
                    </Text>
                  </summary>
                  <Stack gap="xs" mt="xs" ml="sm">
                    {entry.activities.map((activity) => {
                      const action = formatActivity(
                        activity.action,
                        activity.payload,
                        workflowStatuses,
                      ).replace(/^\p{Lu}/u, (letter) => letter.toLocaleLowerCase(locale));
                      return (
                        <Group
                          key={`priority-history-${activity.id}`}
                          gap="xs"
                          wrap="nowrap"
                          align="flex-start"
                          data-testid="issue-activity-history-entry"
                        >
                          <ActivityAvatar />
                          <Text size="sm" style={{ flex: 1, minWidth: 0 }}>
                            <Text span fw={550}>
                              {t('issueComments.you')}
                            </Text>{' '}
                            {action}{' '}
                            <Text span c="dimmed" size="sm">
                              ·{' '}
                              {formatRelativeTime(activity.createdAt, locale, {
                                numeric: 'always',
                                style: 'narrow',
                              })}
                            </Text>
                          </Text>
                        </Group>
                      );
                    })}
                  </Stack>
                </details>
              </Group>
            );
          }

          const c = entry.comment;
          return (
            <Group
              key={`comment-${entry.id}`}
              gap="xs"
              wrap="nowrap"
              align="flex-start"
              data-testid="issue-activity-entry"
            >
              <ActivityAvatar />
              <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Text c="dimmed" size="sm">
                    <Text span fw={550} c="var(--mantine-color-text)">
                      {t('issueComments.you')}
                    </Text>
                    {' · '}
                    {formatRelativeTime(c.createdAt, i18n.resolvedLanguage ?? i18n.language, {
                      numeric: 'always',
                      style: 'narrow',
                    })}
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
                <IssueAttachmentList identifier={identifier} attachments={c.attachments ?? []} />
                <Group gap="xs">
                  <ReactionPicker
                    target={`comment:${c.id}`}
                    openedTarget={reactionPickerTarget}
                    onOpenChange={handlers.onReactionPickerChange}
                    onSelect={handlers.onSelectReaction}
                  />
                  <ReactionSummary
                    reactions={c.reactions ?? []}
                    onToggle={(emoji) => handlers.onToggleReaction(`comment:${c.id}`, emoji)}
                  />
                </Group>
              </Stack>
            </Group>
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
          {t(commentSubmitShortcut === 'enter' ? 'ui.enterToSave' : 'ui.modEnterToSave')}
        </VisuallyHidden>
        {commentError ? (
          <Alert color="red" role="alert">
            {commentError}
          </Alert>
        ) : null}
      </Stack>
    </Section>
  );
}
