import { Alert, ActionIcon, Box, Button, Group, Menu, Stack, Text, Title } from '@mantine/core';
import {
  IconArchive,
  IconCheck,
  IconChevronLeft,
  IconClock,
  IconInbox,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { formatActivity } from '../activity.ts';
import { formatRelativeTime } from '../time.ts';
import type { useInboxPresenter } from '../presenters/Inbox.tsx';
import { InboxActivityIcon } from './InboxActivityIcon.tsx';
import styles from './InboxPages.module.css';

type InboxDetailsModel = Pick<
  ReturnType<typeof useInboxPresenter>,
  | 'selectedActivity'
  | 'commentPreview'
  | 'commentStatus'
  | 'selectedIsRead'
  | 'snoozeMenuOpen'
  | 'handlers'
>;

export function InboxActivityDetails({ model }: { model: InboxDetailsModel }) {
  const { t, i18n } = useTranslation();
  const selected = model.selectedActivity;
  const detailRef = useRef<HTMLElement>(null);
  const previousId = useRef<number | null>(null);
  useEffect(() => {
    if (window.matchMedia('(max-width: 560px)').matches) {
      if (selected && previousId.current !== selected.id) detailRef.current?.focus();
      else if (!selected && previousId.current !== null) {
        detailRef.current?.parentElement
          ?.querySelector<HTMLButtonElement>(`[data-inbox-activity-id="${previousId.current}"]`)
          ?.focus();
      }
    }
    previousId.current = selected?.id ?? null;
  }, [selected]);
  return (
    <Box
      component="section"
      ref={detailRef}
      tabIndex={-1}
      aria-label={t('inbox.details')}
      className={styles.detailPane}
    >
      {selected ? (
        <>
          <Group
            justify="space-between"
            align="center"
            wrap="wrap"
            className={styles.detailToolbar}
          >
            <Group gap="xs" wrap="nowrap">
              <Button
                type="button"
                variant="subtle"
                color="gray"
                size="compact-sm"
                leftSection={<IconChevronLeft size={14} />}
                className={styles.mobileBack}
                onClick={model.handlers.onCloseSelected}
              >
                {t('inbox.back')}
              </Button>
              <Text size="xs" c="dimmed">
                {t('inbox.issueActivity')}
              </Text>
            </Group>
            <Group gap={4} wrap="wrap">
              <Button
                renderRoot={(props) => (
                  <Link
                    {...props}
                    to="/issues/$identifier"
                    params={{ identifier: selected.identifier }}
                  />
                )}
                size="compact-sm"
              >
                {t('inbox.openIssue')}
              </Button>
              <Menu
                opened={model.snoozeMenuOpen}
                onChange={model.handlers.onSetSnoozeMenuOpen}
                position="bottom-end"
                withinPortal
              >
                <Menu.Target>
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    aria-label={t('inbox.snooze')}
                  >
                    <IconClock size={15} aria-hidden />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{t('inbox.snoozeUntil')}</Menu.Label>
                  <Menu.Item onClick={() => model.handlers.onSnoozeSelected('one-hour')}>
                    {t('inbox.snoozeOneHour')}
                  </Menu.Item>
                  <Menu.Item onClick={() => model.handlers.onSnoozeSelected('later-today')}>
                    {t('inbox.snoozeLaterToday')}
                  </Menu.Item>
                  <Menu.Item onClick={() => model.handlers.onSnoozeSelected('tomorrow')}>
                    {t('inbox.snoozeTomorrow')}
                  </Menu.Item>
                  <Menu.Item onClick={() => model.handlers.onSnoozeSelected('next-week')}>
                    {t('inbox.snoozeNextWeek')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                aria-label={t('inbox.deleteNotification')}
                onClick={model.handlers.onDeleteSelected}
              >
                <IconTrash size={15} aria-hidden />
              </ActionIcon>
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                aria-label={t(model.selectedIsRead ? 'inbox.markUnread' : 'inbox.markRead')}
                onClick={model.handlers.onMarkSelectedRead}
              >
                <IconCheck size={15} aria-hidden />
              </ActionIcon>
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                aria-label={t('inbox.archive')}
                onClick={model.handlers.onArchiveSelected}
              >
                <IconArchive size={15} aria-hidden />
              </ActionIcon>
            </Group>
          </Group>
          <Stack gap="md" className={styles.detailContent}>
            <Group gap="xs" c="dimmed">
              {<InboxActivityIcon action={selected.action} />}
              <Text size="xs">
                {selected.identifier} · {formatRelativeTime(selected.createdAt, i18n.language)}
              </Text>
            </Group>
            <Title order={2} size="lg" fw={600}>
              {selected.title}
            </Title>
            <Text size="sm">{formatActivity(selected.action, selected.payload)}</Text>
            {model.commentStatus === 'loading' ? (
              <Text size="sm" c="dimmed" role="status">
                {t('inbox.commentLoading')}
              </Text>
            ) : model.commentStatus === 'failed' ? (
              <Alert color="red" role="alert" title={t('inbox.commentFailed')}>
                <Button mt="sm" variant="default" onClick={model.handlers.onRetryComment}>
                  {t('inbox.retryComment')}
                </Button>
              </Alert>
            ) : model.commentPreview ? (
              <Box className={styles.commentPreview}>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {model.commentPreview}
                </Text>
              </Box>
            ) : null}
          </Stack>
        </>
      ) : (
        <Box className={styles.noSelection}>
          <IconInbox size={42} stroke={1.2} aria-hidden />
          <Text size="sm" c="dimmed">
            {t('inbox.noSelection')}
          </Text>
        </Box>
      )}
    </Box>
  );
}
