import { ActionIcon, Menu, Text } from '@mantine/core';
import { IconAdjustments, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { INBOX_PRIORITY_TYPES, type InboxPriorityType } from '../inbox-state.ts';
import type { useInboxPresenter } from '../presenters/Inbox.tsx';

type InboxDisplayOptionsModel = Pick<
  ReturnType<typeof useInboxPresenter>,
  | 'priorityInboxEnabled'
  | 'priorityTypes'
  | 'badgeCount'
  | 'unreadGrouping'
  | 'density'
  | 'groupByDate'
  | 'showSnoozed'
  | 'showUnreadFirst'
  | 'ordering'
  | 'handlers'
>;

export function InboxDisplayOptionsMenu({ model }: { model: InboxDisplayOptionsModel }) {
  const { t } = useTranslation();
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
  return (
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
          aria-description={t(model.priorityInboxEnabled ? 'inbox.enabled' : 'inbox.disabled')}
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
                  rightSection={model.priorityTypes.length === 0 ? <IconCheck size={14} /> : null}
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
                      model.priorityTypes.includes(priorityType) ? <IconCheck size={14} /> : null
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
                    rightSection={model.badgeCount === badgeCount ? <IconCheck size={14} /> : null}
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
  );
}
