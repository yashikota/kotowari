import { Link } from '@tanstack/react-router';
import { Alert, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { EmptyState, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';
import { useRemindersPresenter } from '../presenters/Reminders.tsx';

function RemindersPageView({ model }: { model: ReturnType<typeof useRemindersPresenter> }) {
  const { t, i18n } = useTranslation();
  if (model.error) return <Alert color="red">{model.error}</Alert>;
  const now = Date.now();
  return (
    <SplitLayout single>
      <Pane single>
        <PageHeader title={t('reminders.heading')} />
        {model.issues.length === 0 ? (
          <EmptyState>{t('reminders.empty')}</EmptyState>
        ) : (
          <Stack gap={0}>
            {model.issues.map((issue) => {
              const reminder = new Date(issue.reminderAt!).getTime();
              const overdue = reminder <= now;
              return (
                <Group
                  key={issue.identifier}
                  justify="space-between"
                  wrap="nowrap"
                  py="sm"
                  px="md"
                  style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
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
                        }).format(new Date(issue.reminderAt!))}
                      </Text>
                    </Group>
                    <Link
                      to="/issues/$identifier"
                      params={{ identifier: issue.identifier }}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      <Text fw={500} truncate>
                        <Text span ff="monospace" c="dimmed" mr="xs">
                          {issue.identifier}
                        </Text>
                        {issue.title}
                      </Text>
                    </Link>
                  </Stack>
                  <Button
                    variant="subtle"
                    color="gray"
                    size="compact-sm"
                    onClick={() => model.handlers.onClearReminder(issue.identifier)}
                  >
                    {t('reminders.dismiss')}
                  </Button>
                </Group>
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
