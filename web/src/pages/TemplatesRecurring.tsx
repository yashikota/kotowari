import { Link } from '@tanstack/react-router';
import { Alert, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { EmptyState, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';
import {
  useRecurringIssuesPagePresenter,
  useTemplatesPagePresenter,
} from '../presenters/TemplatesRecurring.tsx';

function TemplatesPageView({ model }: { model: ReturnType<typeof useTemplatesPagePresenter> }) {
  const { t } = useTranslation();
  const handlers = useActions(model.handlers);
  return (
    <SplitLayout single>
      <Pane single>
        <PageHeader title={t('templates.heading')} />
        {model.error ? (
          <Alert color="red" variant="light" mb="md">
            {model.error}
          </Alert>
        ) : null}
        {model.templates.length === 0 ? (
          <EmptyState>{t('templates.empty')}</EmptyState>
        ) : (
          <Stack gap={0} role="list" aria-label={t('templates.heading')}>
            {model.templates.map((template) => (
              <Group
                key={template.slug}
                role="listitem"
                justify="space-between"
                align="flex-start"
                wrap="nowrap"
                py="sm"
                px="md"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <Stack gap={3} style={{ minWidth: 0 }}>
                  <Text fw={500}>{template.name}</Text>
                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {t('templates.title')}: {template.title}
                  </Text>
                  {template.body ? (
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {template.body}
                    </Text>
                  ) : null}
                </Stack>
                <Button
                  type="button"
                  variant="subtle"
                  color="red"
                  size="compact-sm"
                  onClick={() => handlers.onDelete(template)}
                >
                  {t('templates.delete')}
                </Button>
              </Group>
            ))}
          </Stack>
        )}
      </Pane>
    </SplitLayout>
  );
}

export function TemplatesPage() {
  return (
    <PresenterScope name="TemplatesPage">
      <TemplatesPageBinding />
    </PresenterScope>
  );
}

function TemplatesPageBinding() {
  const model = useTemplatesPagePresenter();
  return <TemplatesPageView model={model} />;
}

function RecurringIssuesPageView({
  model,
}: {
  model: ReturnType<typeof useRecurringIssuesPagePresenter>;
}) {
  const { t, i18n } = useTranslation();
  const handlers = useActions(model.handlers);
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
      new Date(`${value}T12:00:00`),
    );
  return (
    <SplitLayout single>
      <Pane single>
        <PageHeader title={t('recurringIssues.heading')} />
        {model.error ? (
          <Alert color="red" variant="light" mb="md">
            {model.error}
          </Alert>
        ) : null}
        {model.items.length === 0 ? (
          <EmptyState>{t('recurringIssues.empty')}</EmptyState>
        ) : (
          <Stack gap={0} role="list" aria-label={t('recurringIssues.heading')}>
            {model.items.map((item) => (
              <Group
                key={item.slug}
                role="listitem"
                justify="space-between"
                align="flex-start"
                wrap="nowrap"
                py="sm"
                px="md"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <Stack gap={4} style={{ minWidth: 0 }}>
                  <Group gap="xs">
                    <Text fw={500}>{item.name}</Text>
                    <Badge color={item.enabled ? 'green' : 'gray'} variant="light">
                      {t(item.enabled ? 'recurringIssues.enabled' : 'recurringIssues.paused')}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {item.title}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t('recurringIssues.interval', {
                      interval: item.interval,
                      unit: t(`recurringIssues.${item.unit}`),
                    })}
                    {' · '}
                    {t('recurringIssues.nextDue', { date: formatDate(item.nextDueDate) })}
                  </Text>
                  {item.lastIssueIdentifier ? (
                    <Text size="sm">
                      {t('recurringIssues.lastIssue')}:{' '}
                      <Link
                        to="/issues/$identifier"
                        params={{ identifier: item.lastIssueIdentifier }}
                      >
                        {item.lastIssueIdentifier}
                      </Link>
                    </Text>
                  ) : null}
                </Stack>
                <Group gap="xs" wrap="nowrap">
                  <Button type="button" variant="subtle" onClick={() => handlers.onToggle(item)}>
                    {t(item.enabled ? 'recurringIssues.pause' : 'recurringIssues.resume')}
                  </Button>
                  <Button
                    type="button"
                    variant="subtle"
                    color="red"
                    onClick={() => handlers.onDelete(item)}
                  >
                    {t('recurringIssues.delete')}
                  </Button>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Pane>
    </SplitLayout>
  );
}

export function RecurringIssuesPage() {
  return (
    <PresenterScope name="RecurringIssuesPage">
      <RecurringIssuesPageBinding />
    </PresenterScope>
  );
}

function RecurringIssuesPageBinding() {
  const model = useRecurringIssuesPagePresenter();
  return <RecurringIssuesPageView model={model} />;
}
