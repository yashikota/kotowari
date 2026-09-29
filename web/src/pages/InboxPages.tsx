import {
  ActionIcon,
  Box,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArchive,
  IconCheck,
  IconChevronDown,
  IconDots,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PresenterScope } from '../application/Root.tsx';
import { formatActivity } from '../activity.ts';
import { formatRelativeTime } from '../time.ts';
import { InboxFilterChips, InboxFilterMenu } from '../components/InboxFilterControls.tsx';
import { EmptyState, Shortcut } from '../mantine-ui.tsx';
import { useInboxPresenter } from '../presenters/Inbox.tsx';
import type { InboxActivity } from '../types.ts';
import { InboxDisplayOptionsMenu } from './InboxDisplayOptionsMenu.tsx';
import { InboxActivityDetails } from './InboxActivityDetails.tsx';
import { InboxActivityIcon } from './InboxActivityIcon.tsx';
import styles from './InboxPages.module.css';

type InboxModel = ReturnType<typeof useInboxPresenter>;

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
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={model.handlers.onRequestDeleteAll}
              >
                {t('inbox.deleteAll')}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                color="red"
                rightSection={<Shortcut>Shift+⌫</Shortcut>}
                onClick={model.handlers.onRequestDeleteRead}
              >
                {t('inbox.deleteAllRead')}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconCheck size={14} />}
                onClick={model.handlers.onMarkAllRead}
              >
                {t('inbox.markAllAsRead')}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconArchive size={14} />}
                onClick={model.handlers.onArchiveReadActivities}
              >
                {t('inbox.archiveReadActivities')}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item component={Link} to="/config" leftSection={<IconSettings size={14} />}>
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
          <InboxFilterMenu
            filters={model.filters}
            projects={model.projectOptions}
            menu={model.filterMenu}
            handlers={model.handlers}
          />
          <InboxDisplayOptionsMenu model={model} />
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
                              aria-label={`${activity.identifier}: ${activity.title}. ${description}. ${formatRelativeTime(activity.createdAt, i18n.language)}`}
                              onClick={() => model.handlers.onSelect(activity.id)}
                            >
                              <span className={styles.activityIcon} aria-hidden>
                                <InboxActivityIcon action={activity.action} />
                              </span>
                              <span className={styles.activityContent}>
                                <span className={styles.activityTitle}>
                                  <span className={styles.identifier}>{activity.identifier}</span>
                                  <span className={styles.activityTime}>
                                    {formatRelativeTime(activity.createdAt, i18n.language)}
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

        <InboxActivityDetails model={model} />
      </Box>
      <Modal
        opened={model.deleteConfirmation !== null}
        onClose={model.handlers.onCancelDeleteNotifications}
        title={t(
          model.deleteConfirmation === 'read' ? 'inbox.deleteReadTitle' : 'inbox.deleteAllTitle',
        )}
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">{t('inbox.deleteConfirmBody')}</Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={model.handlers.onCancelDeleteNotifications}>
              {t('inbox.cancel')}
            </Button>
            <Button color="red" onClick={model.handlers.onConfirmDeleteNotifications}>
              {t('inbox.deleteConfirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
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
