import { ManagementRow } from '../design-system/ManagementRow.tsx';
import { Link } from '@tanstack/react-router';
import { Alert, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { EmptyState, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';
import { useRemindersPresenter, type ReminderItem } from '../presenters/Reminders.tsx';

function RemindersPageView({ model }: { model: ReturnType<typeof useRemindersPresenter> }) {
  const { t, i18n } = useTranslation();

  const now = Date.now();
  return (
    <SplitLayout single>
      <Pane single>
        <PageHeader title={t('reminders.heading')} />
        {model.error ? (
          <Alert color="red" role="alert" my="md">
            {model.error}
            <Button variant="default" mt="sm" onClick={model.handlers.onRetry}>
              {t('reminders.retry')}
            </Button>
          </Alert>
        ) : null}
        {model.loading ? (
          <Text role="status" c="dimmed" p="md">
            {t('ui.loading')}
          </Text>
        ) : null}
        {model.reminders.length === 0 && !model.loading && !model.error ? (
          <EmptyState>{t('reminders.empty')}</EmptyState>
        ) : (
          <Stack gap={0} role="list" aria-label={t('reminders.heading')}>
            {model.reminders.map((item: ReminderItem) => {
              const reminder = new Date(item.reminderAt).getTime();
              const overdue = reminder <= now;
              return (
                <ManagementRow
                  key={item.key}
                  actions={
                    <Button
                      variant="subtle"
                      color="gray"
                      size="compact-sm"
                      onClick={() => model.handlers.onClearReminder(item)}
                    >
                      {t('reminders.dismiss')}
                    </Button>
                  }
                >
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Group gap="xs">
                      <Badge color={overdue ? 'red' : 'gray'} variant="light">
                        {t(overdue ? 'reminders.overdue' : 'reminders.upcoming')}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {new Intl.DateTimeFormat(i18n.language, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: model.timeZone,
                        }).format(new Date(item.reminderAt))}
                      </Text>
                    </Group>
                    {item.kind === 'issue' ? (
                      <Link
                        to="/issues/$identifier"
                        params={{ identifier: item.identifier }}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        <Text fw={500} lineClamp={2}>
                          <Text span ff="monospace" c="dimmed" mr="xs">
                            {item.identifier}
                          </Text>
                          {item.title}
                        </Text>
                      </Link>
                    ) : item.kind === 'initiative' ? (
                      <Link
                        to="/initiatives/$slug"
                        params={{ slug: item.slug }}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        <Text fw={500} lineClamp={2}>
                          {item.title}
                        </Text>
                      </Link>
                    ) : (
                      <Link
                        to="/projects/$slug"
                        params={{ slug: item.slug }}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        <Text fw={500} lineClamp={2}>
                          {item.title}
                        </Text>
                      </Link>
                    )}
                  </Stack>
                </ManagementRow>
              );
            })}
          </Stack>
        )}
      </Pane>
    </SplitLayout>
  );
}

export function RemindersPage() {
  return (
    <PresenterScope name="RemindersPage">
      <RemindersBinding />
    </PresenterScope>
  );
}

function RemindersBinding() {
  const model = useRemindersPresenter();
  const handlers = useActions(model.handlers);
  return <RemindersPageView model={{ ...model, handlers } as typeof model} />;
}
