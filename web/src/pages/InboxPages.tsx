import { Link } from '@tanstack/react-router';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArchive,
  IconClock,
  IconBell,
  IconCheck,
  IconCircleDot,
  IconChevronLeft,
  IconDots,
  IconInbox,
  IconMessage,
  IconPaperclip,
  IconAdjustments,
  IconFilter,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PresenterScope } from '../application/Root.tsx';
import { formatActivity } from '../activity.ts';
import { EmptyState } from '../mantine-ui.tsx';
import { useInboxPresenter, type InboxFilter } from '../presenters/Inbox.tsx';
import type { InboxActivity } from '../types.ts';
import styles from './InboxPages.module.css';

type InboxModel = ReturnType<typeof useInboxPresenter>;

function relativeTime(value: string, locale: string): string {
  const elapsedSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(elapsedSeconds);
  const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] =
    absoluteSeconds < 60
      ? [Math.round(elapsedSeconds), 'second']
      : absoluteSeconds < 3600
        ? [Math.round(elapsedSeconds / 60), 'minute']
        : absoluteSeconds < 86400
          ? [Math.round(elapsedSeconds / 3600), 'hour']
          : absoluteSeconds < 604800
            ? [Math.round(elapsedSeconds / 86400), 'day']
            : [Math.round(elapsedSeconds / 604800), 'week'];
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(amount, unit);
}

function activityGroup(
  activity: InboxActivity,
  now: Date,
): 'today' | 'yesterday' | 'thisWeek' | 'earlier' {
  const date = new Date(activity.createdAt);
  const dayNumber = (value: Date) =>
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000;
  const daysAgo = dayNumber(now) - dayNumber(date);
  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  if (daysAgo < 7) return 'thisWeek';
  return 'earlier';
}

function activityIcon(action: string) {
  if (action.startsWith('comment')) return <IconMessage size={15} aria-hidden />;
  if (action.includes('reaction')) return <IconBell size={15} aria-hidden />;
  if (action.startsWith('attachment_')) return <IconPaperclip size={15} aria-hidden />;
  if (action === 'status_changed') return <IconCircleDot size={15} aria-hidden />;
  return <IconInbox size={15} aria-hidden />;
}

function InboxPageView({ model }: { model: InboxModel }) {
  const { t, i18n } = useTranslation();
  const groups = useMemo(() => {
    const now = new Date();
    const entries = model.activities.map((activity) => ({
      activity,
      group: model.groupByDate ? activityGroup(activity, now) : 'today',
    }));
    return model.groupByDate
      ? (['today', 'yesterday', 'thisWeek', 'earlier'] as const)
          .map((name) => ({
            name,
            items: entries.filter((entry) => entry.group === name),
          }))
          .filter((group) => group.items.length > 0)
      : [{ name: 'today' as const, items: entries }];
  }, [model.activities, model.groupByDate]);

  const filterLabels: Record<InboxFilter, string> = {
    all: t('inbox.filterAll'),
    changes: t('inbox.filterChanges'),
    comments: t('inbox.filterComments'),
    reactions: t('inbox.filterReactions'),
    attachments: t('inbox.filterAttachments'),
  };
  const selected = model.selectedActivity;
  const emptyMessage =
    model.onlyUnread || model.filter !== 'all' ? t('inbox.emptyFiltered') : t('inbox.empty');

  return (
    <Stack gap={0} className={styles.root}>
      <Group
        component="header"
        justify="space-between"
        gap="sm"
        wrap="nowrap"
        className={styles.toolbar}
      >
        <Group gap="xs" wrap="nowrap">
          <Title order={2} size="sm" fw={550} className={styles.heading}>
            {t('inbox.heading')}
          </Title>
          <Menu position="bottom-start" withinPortal>
            <Menu.Target>
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                aria-label={t('inbox.notificationActions')}
              >
                <IconDots size={16} aria-hidden />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                onClick={model.handlers.onDeleteAllRead}
              >
                {t('inbox.deleteAllRead')}
              </Menu.Item>
              <Menu.Item leftSection={<IconTrash size={14} />} onClick={model.handlers.onDeleteAll}>
                {t('inbox.deleteAll')}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item component={Link} to="/config">
                {t('inbox.goToSettings')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Button
            type="button"
            variant={model.onlyUnread ? 'light' : 'subtle'}
            color="gray"
            size="compact-sm"
            aria-pressed={model.onlyUnread}
            onClick={model.handlers.onToggleUnread}
          >
            {t('inbox.showUnreads')}
            {model.unreadCount > 0 ? (
              <Text span size="xs" c="dimmed" ml={6}>
                {model.unreadCount}
              </Text>
            ) : null}
          </Button>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Button
                type="button"
                variant="subtle"
                color="gray"
                size="compact-sm"
                leftSection={<IconFilter size={14} />}
                aria-label={t('inbox.addFilter')}
              >
                {filterLabels[model.filter]}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {(Object.keys(filterLabels) as InboxFilter[]).map((filter) => (
                <Menu.Item
                  key={filter}
                  rightSection={model.filter === filter ? <IconCheck size={14} /> : null}
                  onClick={() => model.handlers.onSetFilter(filter)}
                >
                  {filterLabels[filter]}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                aria-label={t('inbox.displayOptions')}
              >
                <IconAdjustments size={15} aria-hidden />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{t('inbox.displayOptions')}</Menu.Label>
              <Menu.Item
                rightSection={model.density === 'comfortable' ? <IconCheck size={14} /> : null}
                onClick={() => model.handlers.onSetDensity('comfortable')}
              >
                {t('inbox.comfortable')}
              </Menu.Item>
              <Menu.Item
                rightSection={model.density === 'compact' ? <IconCheck size={14} /> : null}
                onClick={() => model.handlers.onSetDensity('compact')}
              >
                {t('inbox.compact')}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                rightSection={model.groupByDate ? <IconCheck size={14} /> : null}
                onClick={model.handlers.onToggleGrouping}
              >
                {t('inbox.groupByDate')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <Box className={styles.layout}>
        <Box component="section" aria-label={t('inbox.notifications')} className={styles.listPane}>
          <ScrollArea type="auto" className={styles.listScroll}>
            {groups.length === 0 ? (
              <EmptyState>{emptyMessage}</EmptyState>
            ) : (
              <Stack gap={0}>
                {groups.map((group) => (
                  <Box component="section" aria-label={t(`inbox.${group.name}`)} key={group.name}>
                    {model.groupByDate ? (
                      <Text size="xs" fw={550} c="dimmed" px="md" pt="sm" pb={6}>
                        {t(`inbox.${group.name}`)}
                      </Text>
                    ) : null}
                    {group.items.map(({ activity }) => {
                      const description = formatActivity(activity.action, activity.payload);
                      const isSelected = activity.id === model.selectedId;
                      return (
                        <button
                          type="button"
                          key={activity.id}
                          className={`${styles.activity} ${isSelected ? styles.selected : ''} ${activity.isRead ? '' : styles.unread} ${model.density === 'compact' ? styles.compact : ''}`}
                          data-inbox-activity-id={activity.id}
                          aria-current={isSelected ? 'true' : undefined}
                          aria-label={`${activity.identifier}: ${activity.title}. ${description}. ${relativeTime(activity.createdAt, i18n.language)}`}
                          onClick={() => model.handlers.onSelect(activity.id)}
                        >
                          <span className={styles.activityIcon} aria-hidden>
                            {activityIcon(activity.action)}
                          </span>
                          <span className={styles.activityContent}>
                            <span className={styles.activityTitle}>
                              <span className={styles.identifier}>{activity.identifier}</span>
                              <span className={styles.activityTime}>
                                {relativeTime(activity.createdAt, i18n.language)}
                              </span>
                            </span>
                            <span className={styles.issueTitle}>{activity.title}</span>
                            <span className={styles.description}>{description}</span>
                          </span>
                          {!activity.isRead ? (
                            <span className={styles.unreadDot} aria-label={t('inbox.unread')} />
                          ) : null}
                        </button>
                      );
                    })}
                  </Box>
                ))}
              </Stack>
            )}
          </ScrollArea>
        </Box>

        <Box component="section" aria-label={t('inbox.details')} className={styles.detailPane}>
          {selected ? (
            <>
              <Group
                justify="space-between"
                align="center"
                wrap="nowrap"
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
                <Group gap={4} wrap="nowrap">
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
                  {activityIcon(selected.action)}
                  <Text size="xs">
                    {selected.identifier} · {relativeTime(selected.createdAt, i18n.language)}
                  </Text>
                </Group>
                <Title order={2} size="lg" fw={550}>
                  {selected.title}
                </Title>
                <Text size="sm">{formatActivity(selected.action, selected.payload)}</Text>
                {model.commentPreview ? (
                  <Box className={styles.commentPreview}>
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {model.commentPreview}
                    </Text>
                  </Box>
                ) : null}
                <Link
                  to="/issues/$identifier"
                  params={{ identifier: selected.identifier }}
                  className={styles.openIssue}
                >
                  {t('inbox.openIssue')}
                </Link>
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
      </Box>
    </Stack>
  );
}

export function InboxPage() {
  return (
    <PresenterScope name="InboxPage">
      <InboxBinding />
    </PresenterScope>
  );
}

function InboxBinding() {
  const model = useInboxPresenter();
  return <InboxPageView model={model} />;
}
