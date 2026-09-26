import { Link } from '@tanstack/react-router';
import {
  ActionIcon,
  Box,
  Badge,
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
  IconChevronDown,
  IconChevronLeft,
  IconDots,
  IconInbox,
  IconMessage,
  IconPaperclip,
  IconAdjustments,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PresenterScope } from '../application/Root.tsx';
import { formatActivity } from '../activity.ts';
import { InboxFilterChips, InboxFilterMenu } from '../components/InboxFilterControls.tsx';
import { EmptyState, Shortcut } from '../mantine-ui.tsx';
import { useInboxPresenter } from '../presenters/Inbox.tsx';
import type { InboxActivity } from '../types.ts';
import { INBOX_PRIORITY_TYPES, type InboxPriorityType } from '../inbox-state.ts';
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
    const dateGroups = (activities: typeof model.activities) => {
      const entries = activities.map((activity) => ({
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
    };
    if (model.unreadGrouping !== 'focus') return dateGroups(model.activities);
    const unread = model.activities.filter((activity) => !activity.isRead);
    const read = model.activities.filter((activity) => activity.isRead);
    return [
      ...(unread.length > 0
        ? [{ name: 'unread' as const, items: unread.map((activity) => ({ activity })) }]
        : []),
      ...dateGroups(read),
    ];
  }, [model.activities, model.groupByDate, model.unreadGrouping]);

  const priorityTypeLabels: Record<InboxPriorityType, string> = {
    assignedToYou: t('inbox.priorityAssignedToYou'),
    documentActivity: t('inbox.priorityDocumentActivity'),
    issueActivity: t('inbox.priorityIssueActivity'),
    mentions: t('inbox.priorityMentions'),
    projectActivity: t('inbox.priorityProjectActivity'),
    projectUpdates: t('inbox.priorityProjectUpdates'),
    replies: t('inbox.priorityReplies'),
    resolvedThreads: t('inbox.priorityResolvedThreads'),
    reviews: t('inbox.priorityReviews'),
    updateReminders: t('inbox.priorityUpdateReminders'),
  };
  const selected = model.selectedActivity;
  const hasFilters = Object.values(model.filters).some((values) => values.length > 0);
  const emptyMessage = model.onlyUnread || hasFilters ? t('inbox.emptyFiltered') : t('inbox.empty');

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
                leftSection={<IconCheck size={14} />}
                onClick={model.handlers.onMarkAllRead}
              >
                {t('inbox.markAllAsRead')}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconArchive size={14} />}
                onClick={model.handlers.onArchiveReadActivities}
                rightSection={<Shortcut>Shift+⌫</Shortcut>}
              >
                {t('inbox.archiveReadActivities')}
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
          <InboxFilterMenu
            filters={model.filters}
            projects={model.projectOptions}
            menu={model.filterMenu}
            handlers={model.handlers}
          />
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
                aria-description={t(
                  model.priorityInboxEnabled ? 'inbox.enabled' : 'inbox.disabled',
                )}
                closeMenuOnClick={false}
                rightSection={model.priorityInboxEnabled ? <IconCheck size={14} /> : null}
                onClick={model.handlers.onTogglePriorityInbox}
              >
                {t('inbox.enablePriorityInbox')}
              </Menu.Item>
              {model.priorityInboxEnabled ? (
                <>
                  <Menu.Sub>
                    <Menu.Sub.Target>
                      <Menu.Sub.Item
                        rightSection={
                          <Text size="xs" c="dimmed">
                            {model.priorityTypes.length === INBOX_PRIORITY_TYPES.length
                              ? t('inbox.all')
                              : model.priorityTypes.length}
                          </Text>
                        }
                      >
                        {t('inbox.includeInPriorityInbox')}
                      </Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown>
                      <Menu.Item
                        closeMenuOnClick={false}
                        rightSection={
                          model.priorityTypes.length === INBOX_PRIORITY_TYPES.length ? (
                            <IconCheck size={14} />
                          ) : null
                        }
                        onClick={() => model.handlers.onSetAllPriorityTypes(true)}
                      >
                        {t('inbox.all')}
                      </Menu.Item>
                      <Menu.Item
                        closeMenuOnClick={false}
                        rightSection={
                          model.priorityTypes.length === 0 ? <IconCheck size={14} /> : null
                        }
                        onClick={() => model.handlers.onSetAllPriorityTypes(false)}
                      >
                        {t('inbox.none')}
                      </Menu.Item>
                      <Menu.Divider />
                      {INBOX_PRIORITY_TYPES.map((priorityType) => (
                        <Menu.Item
                          key={priorityType}
                          aria-description={t(
                            model.priorityTypes.includes(priorityType)
                              ? 'inbox.includedInPriority'
                              : 'inbox.inOther',
                          )}
                          closeMenuOnClick={false}
                          rightSection={
                            model.priorityTypes.includes(priorityType) ? (
                              <IconCheck size={14} />
                            ) : null
                          }
                          onClick={() => model.handlers.onTogglePriorityType(priorityType)}
                        >
                          {priorityTypeLabels[priorityType]}
                        </Menu.Item>
                      ))}
                    </Menu.Sub.Dropdown>
                  </Menu.Sub>
                  <Menu.Sub>
                    <Menu.Sub.Target>
                      <Menu.Sub.Item>{t('inbox.badgeCount')}</Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown>
                      {(['all', 'priority', 'none'] as const).map((badgeCount) => (
                        <Menu.Item
                          key={badgeCount}
                          closeMenuOnClick={false}
                          rightSection={
                            model.badgeCount === badgeCount ? <IconCheck size={14} /> : null
                          }
                          onClick={() => model.handlers.onSetBadgeCount(badgeCount)}
                        >
                          {t(
                            `inbox.badgeCount${badgeCount === 'all' ? 'All' : badgeCount === 'priority' ? 'Priority' : 'None'}`,
                          )}
                        </Menu.Item>
                      ))}
                    </Menu.Sub.Dropdown>
                  </Menu.Sub>
                </>
              ) : null}
              <Menu.Sub>
                <Menu.Sub.Target>
                  <Menu.Sub.Item>{t('inbox.groupUnreadsBy')}</Menu.Sub.Item>
                </Menu.Sub.Target>
                <Menu.Sub.Dropdown>
                  {(['none', 'focus'] as const).map((unreadGrouping) => (
                    <Menu.Item
                      key={unreadGrouping}
                      rightSection={
                        model.unreadGrouping === unreadGrouping ? <IconCheck size={14} /> : null
                      }
                      onClick={() => model.handlers.onSetUnreadGrouping(unreadGrouping)}
                    >
                      {t(`inbox.groupUnreads${unreadGrouping === 'focus' ? 'Focus' : 'None'}`)}
                    </Menu.Item>
                  ))}
                </Menu.Sub.Dropdown>
              </Menu.Sub>
              <Menu.Divider />
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
              <Menu.Divider />
              <Menu.Item
                rightSection={model.showSnoozed ? <IconCheck size={14} /> : null}
                onClick={model.handlers.onToggleShowSnoozed}
              >
                {t('inbox.showSnoozed')}
              </Menu.Item>
              <Menu.Item
                rightSection={model.showUnreadFirst ? <IconCheck size={14} /> : null}
                onClick={model.handlers.onToggleShowUnreadFirst}
              >
                {t('inbox.showUnreadFirst')}
              </Menu.Item>
              <Menu.Sub>
                <Menu.Sub.Target>
                  <Menu.Sub.Item>{t('inbox.ordering')}</Menu.Sub.Item>
                </Menu.Sub.Target>
                <Menu.Sub.Dropdown>
                  <Menu.Item
                    rightSection={model.ordering === 'newest' ? <IconCheck size={14} /> : null}
                    onClick={() => model.handlers.onSetOrdering('newest')}
                  >
                    {t('inbox.newest')}
                  </Menu.Item>
                  <Menu.Item
                    rightSection={model.ordering === 'oldest' ? <IconCheck size={14} /> : null}
                    onClick={() => model.handlers.onSetOrdering('oldest')}
                  >
                    {t('inbox.oldest')}
                  </Menu.Item>
                </Menu.Sub.Dropdown>
              </Menu.Sub>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <InboxFilterChips
        filters={model.filters}
        projects={model.projectOptions}
        handlers={model.handlers}
      />
      {model.priorityInboxEnabled ? (
        <Group
          component="nav"
          role="tablist"
          aria-label={t('inbox.priorityViews')}
          gap="xs"
          px="md"
          className={styles.priorityTabs}
        >
          {(['priority', 'other'] as const).map((priorityView) => {
            const unreadCount =
              priorityView === 'priority' ? model.priorityUnreadCount : model.otherUnreadCount;
            const showCount =
              model.badgeCount === 'all' ||
              (model.badgeCount === 'priority' && priorityView === 'priority');
            return (
              <Button
                key={priorityView}
                type="button"
                role="tab"
                aria-selected={model.priorityView === priorityView}
                variant={model.priorityView === priorityView ? 'light' : 'subtle'}
                color="gray"
                size="compact-sm"
                onClick={() => model.handlers.onSetPriorityView(priorityView)}
              >
                {t(`inbox.${priorityView}`)}
                {showCount ? (
                  <Badge size="xs" variant="light" color="gray" ml={7}>
                    {unreadCount}
                  </Badge>
                ) : null}
              </Button>
            );
          })}
        </Group>
      ) : null}

      <Box className={styles.layout}>
        <Box component="section" aria-label={t('inbox.notifications')} className={styles.listPane}>
          <ScrollArea type="auto" className={styles.listScroll}>
            {groups.length === 0 ? (
              <EmptyState>{emptyMessage}</EmptyState>
            ) : (
              <Stack gap={0}>
                {groups.map((group) => (
                  <Box component="section" aria-label={t(`inbox.${group.name}`)} key={group.name}>
                    {group.name === 'unread' ? (
                      <Button
                        type="button"
                        variant="subtle"
                        color="gray"
                        size="compact-sm"
                        justify="flex-start"
                        fullWidth
                        px="md"
                        aria-expanded={!model.focusUnreadCollapsed}
                        onClick={model.handlers.onToggleFocusUnreadGroup}
                        leftSection={
                          <IconChevronDown
                            size={13}
                            aria-hidden
                            style={{
                              transform: model.focusUnreadCollapsed ? 'rotate(-90deg)' : undefined,
                            }}
                          />
                        }
                      >
                        {t('inbox.unread')}
                      </Button>
                    ) : model.groupByDate ? (
                      <Text size="xs" fw={550} c="dimmed" px="md" pt="sm" pb={6}>
                        {t(`inbox.${group.name}`)}
                      </Text>
                    ) : null}
                    {group.name === 'unread' && model.focusUnreadCollapsed
                      ? null
                      : group.items.map(({ activity }) => {
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
                                {activity.snoozedUntil && activity.snoozedUntil > Date.now() ? (
                                  <Text size="xs" c="dimmed">
                                    {t('inbox.snoozed')}
                                  </Text>
                                ) : null}
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
