import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import { PageHeader } from '../mantine-ui.tsx';
import styles from './DraftsPages.module.css';
import {
  Badge,
  ActionIcon,
  Box,
  Button,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { IconCircleDashed, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { DraftsEmptyState } from '../components/DraftsEmptyState.tsx';
import { useDraftsPresenter } from '../presenters/Drafts.ts';

type DraftsModel = ReturnType<typeof useDraftsPresenter>;

function formatRelativeUpdatedAt(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const secondsAgo = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (secondsAgo < 10) return locale.startsWith('ja') ? '今' : 'now';

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (secondsAgo < 60) return formatter.format(-secondsAgo, 'second');
  const minutesAgo = Math.round(secondsAgo / 60);
  if (minutesAgo < 60) return formatter.format(-minutesAgo, 'minute');
  const hoursAgo = Math.round(minutesAgo / 60);
  if (hoursAgo < 24) return formatter.format(-hoursAgo, 'hour');
  const daysAgo = Math.round(hoursAgo / 24);
  if (daysAgo < 30) return formatter.format(-daysAgo, 'day');
  const monthsAgo = Math.round(daysAgo / 30);
  if (monthsAgo < 12) return formatter.format(-monthsAgo, 'month');
  return formatter.format(-Math.round(monthsAgo / 12), 'year');
}

function formatUpdatedAt(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function DraftsPageView({ model }: { model: DraftsModel }) {
  const { t, i18n } = useTranslation();
  return (
    <Stack gap={0} h="100%" px="md">
      <PageHeader
        title={t('nav.drafts')}
        paddingX={0}
        actions={
          model.drafts.length > 0 ? (
            <ActionIcon
              className={styles.discardAction}
              type="button"
              variant="subtle"
              color="gray"
              aria-label={t('drafts.discardAll')}
              title={t('drafts.discardAll')}
              disabled={Boolean(model.error)}
              onClick={model.handlers.onRequestDiscardAll}
            >
              <IconTrash size={15} aria-hidden />
            </ActionIcon>
          ) : null
        }
      />
      <SaveFeedback
        saving={false}
        saved={false}
        error={model.error}
        savingLabel=""
        savedLabel=""
        failureLabel={t('drafts.loadFailed')}
        retryLabel={t('drafts.retryLoad')}
        onRetry={model.handlers.onRetry}
      />
      {model.drafts.length === 0 && model.error ? null : model.drafts.length === 0 ? (
        <DraftsEmptyState message={t('drafts.empty')} />
      ) : (
        <ScrollArea style={{ flex: 1, minHeight: 0 }}>
          <Stack gap="sm" pt="xs" pb="md">
            <Text component="h3" size="sm" fw={550}>
              {t('drafts.issues')}
            </Text>
            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 23rem), 23.25rem))',
                gap: 12,
                alignItems: 'start',
              }}
            >
              {model.drafts.map((draft) => (
                <Paper
                  key={draft.id}
                  component="article"
                  data-testid="issue-draft-card"
                  withBorder
                  radius="md"
                  p="sm"
                  shadow="xs"
                >
                  <Stack gap="sm">
                    {draft.publishedIssue ? (
                      <Badge variant="light" color="teal">
                        {t('drafts.issueCreated', { identifier: draft.publishedIssue })}
                      </Badge>
                    ) : null}
                    <Group gap={6} wrap="nowrap">
                      <Button
                        className={styles.openButton}
                        type="button"
                        variant="subtle"
                        color="gray"
                        size="compact-sm"
                        justify="flex-start"
                        leftSection={<IconCircleDashed size={14} aria-hidden />}
                        disabled={Boolean(model.error)}
                        onClick={() => model.handlers.onOpenDraft(draft.id)}
                        style={{ flex: 1, minWidth: 0, height: 'auto', paddingInline: 0 }}
                      >
                        <Text
                          size="sm"
                          fw={550}
                          lineClamp={2}
                          w="100%"
                          className={styles.draftTitle}
                        >
                          {draft.title}
                        </Text>
                      </Button>
                      <Text
                        size="xs"
                        c="dimmed"
                        title={formatUpdatedAt(draft.updatedAt, i18n.language)}
                        style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        {formatRelativeUpdatedAt(draft.updatedAt, i18n.language)}
                      </Text>
                      <ActionIcon
                        className={styles.discardAction}
                        type="button"
                        variant="subtle"
                        color="gray"
                        aria-label={t('drafts.discardDraft')}
                        title={t('drafts.discardDraft')}
                        disabled={Boolean(model.error)}
                        onClick={model.handlers.onRequestDiscardDraft.bind(null, draft.id)}
                      >
                        <IconTrash size={15} aria-hidden />
                      </ActionIcon>
                    </Group>
                    <Button
                      type="button"
                      variant="subtle"
                      color="gray"
                      size="compact-sm"
                      justify="flex-start"
                      disabled={Boolean(model.error)}
                      onClick={() => model.handlers.onOpenDraft(draft.id)}
                      style={{ minHeight: 64, height: 'auto', paddingInline: 0 }}
                    >
                      <Text size="sm" c="dimmed" lineClamp={3} ta="left" w="100%">
                        {draft.body || t('drafts.addDescription')}
                      </Text>
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Stack>
        </ScrollArea>
      )}
    </Stack>
  );
}

function DraftsPageBinding() {
  const model = useDraftsPresenter();
  const handlers = useActions(model.handlers);
  return <DraftsPageView model={{ ...model, handlers } as DraftsModel} />;
}

export function DraftsPage() {
  return (
    <PresenterScope name="DraftsPage">
      <DraftsPageBinding />
    </PresenterScope>
  );
}
