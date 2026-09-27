import { Accordion, Button, Checkbox, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PresenterScope } from '../application/Root.tsx';
import type { InboxPriorityType } from '../inbox-state.ts';
import { useInboxSettingsPresenter } from '../presenters/InboxSettings.tsx';

type InboxSettingsModel = ReturnType<typeof useInboxSettingsPresenter>;
type InboxSettingsHandlers = InboxSettingsModel['handlers'];

const PRIORITY_LABELS: Record<InboxPriorityType, string> = {
  assignedToYou: 'priorityAssignedToYou',
  documentActivity: 'priorityDocumentActivity',
  issueActivity: 'priorityIssueActivity',
  mentions: 'priorityMentions',
  projectActivity: 'priorityProjectActivity',
  projectUpdates: 'priorityProjectUpdates',
  replies: 'priorityReplies',
  resolvedThreads: 'priorityResolvedThreads',
  reviews: 'priorityReviews',
  updateReminders: 'priorityUpdateReminders',
};

function InboxNotificationSettingsView({
  model,
  handlers,
}: {
  model: InboxSettingsModel;
  handlers: InboxSettingsHandlers;
}) {
  const { t } = useTranslation();
  const allSelected = model.priorityTypes.length === model.allPriorityTypes.length;

  return (
    <Stack gap="md" component="section" aria-label={t('inbox.settingsHeading')}>
      <Stack gap={4}>
        <Title order={4}>{t('inbox.settingsHeading')}</Title>
        <Text size="sm" c="dimmed">
          {t('inbox.settingsDescription')}
        </Text>
      </Stack>
      <Stack gap="xs" maw={560}>
        <Checkbox
          label={t('inbox.enablePriorityInbox')}
          description={t('inbox.priorityInboxSettingsDescription')}
          checked={model.priorityInboxEnabled}
          onChange={handlers.onTogglePriorityInbox}
        />
        <Accordion variant="default">
          <Accordion.Item value="priority-types">
            <Accordion.Control>
              <Group justify="space-between" wrap="nowrap" pr="sm">
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    {t('inbox.priorityNotifications')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('inbox.priorityNotificationsDescription')}
                  </Text>
                </Stack>
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {t('inbox.priorityTypesSelection', {
                    count: model.priorityTypes.length,
                    total: model.allPriorityTypes.length,
                  })}
                </Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Group justify="flex-end">
                  <Button
                    type="button"
                    variant="subtle"
                    size="compact-sm"
                    onClick={() => handlers.onSetAllPriorityTypes(!allSelected)}
                  >
                    {t(
                      allSelected ? 'inbox.priorityTypesClearAll' : 'inbox.priorityTypesSelectAll',
                    )}
                  </Button>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  {model.allPriorityTypes.map((priorityType) => (
                    <Checkbox
                      key={priorityType}
                      label={t(`inbox.${PRIORITY_LABELS[priorityType]}`)}
                      checked={model.priorityTypes.includes(priorityType)}
                      onChange={() => handlers.onTogglePriorityType(priorityType)}
                    />
                  ))}
                </SimpleGrid>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>
    </Stack>
  );
}

export function InboxNotificationSettings() {
  return (
    <PresenterScope name="InboxSettings">
      <InboxNotificationSettingsBinding />
    </PresenterScope>
  );
}

function InboxNotificationSettingsBinding() {
  const model = useInboxSettingsPresenter();
  return <InboxNotificationSettingsView model={model} handlers={model.handlers} />;
}
