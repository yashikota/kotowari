import { Link } from '@tanstack/react-router';
import { Anchor, Box, Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { IconGitPullRequest } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PresenterScope } from '../application/Root.tsx';
import { EmptyState, MetaBadge, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';
import { useReviewsPagePresenter } from '../presenters/ReviewsPages.tsx';
import type { LinkedPullRequest } from '../reviews.ts';

function formatLinkedDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

export function ReviewsPageView({ model }: { model: ReturnType<typeof useReviewsPagePresenter> }) {
  const { t } = useTranslation();
  const requests = model.pullRequests;
  return (
    <SplitLayout single>
      <Pane single flush>
        <PageHeader
          title={t('nav.reviews')}
          actions={
            requests.length > 0 ? (
              <MetaBadge>{t('reviews.pullRequestCount', { count: requests.length })}</MetaBadge>
            ) : null
          }
        />
        <ScrollArea style={{ flex: 1, minHeight: 0 }}>
          {requests.length === 0 ? (
            <EmptyState
              action={
                <Button component={Link} to="/issues" variant="default">
                  {t('reviews.emptyAction')}
                </Button>
              }
            >
              {t('reviews.empty')}
            </EmptyState>
          ) : (
            <Stack gap={0}>
              {requests.map((request) => (
                <PullRequestRow
                  key={`${request.issueIdentifier}:${request.linkId}`}
                  request={request}
                />
              ))}
            </Stack>
          )}
        </ScrollArea>
      </Pane>
    </SplitLayout>
  );
}

function PullRequestRow({ request }: { request: LinkedPullRequest }) {
  const { t, i18n } = useTranslation();
  return (
    <Group
      component="article"
      wrap="nowrap"
      gap="sm"
      px="md"
      py={10}
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <IconGitPullRequest size={16} color="var(--mantine-color-dimmed)" aria-hidden="true" />
      <Box style={{ minWidth: 0, flex: 1 }}>
        <Group gap="xs" wrap="wrap" align="flex-start">
          <Anchor
            href={request.url}
            target="_blank"
            rel="noreferrer"
            size="sm"
            fw={500}
            lineClamp={2}
            title={request.title}
            style={{ flex: '1 1 200px', minWidth: 0, overflowWrap: 'anywhere' }}
          >
            {request.title}
          </Anchor>
          <Text component="time" dateTime={request.createdAt} size="xs" c="dimmed">
            {formatLinkedDate(request.createdAt, i18n.language)}
          </Text>
        </Group>
        <Group gap="xs" wrap="wrap">
          <Link
            to="/issues/$identifier"
            params={{ identifier: request.issueIdentifier }}
            style={{
              fontFamily: 'var(--mantine-font-family-monospace)',
              fontSize: 'var(--mantine-font-size-xs)',
            }}
          >
            {request.issueIdentifier}
          </Link>
          <Text
            size="xs"
            c="dimmed"
            lineClamp={2}
            title={request.issueTitle}
            style={{ flex: '1 1 160px', minWidth: 0, overflowWrap: 'anywhere' }}
          >
            {request.issueTitle}
          </Text>
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {t(`issueStatus.${request.issueStatus}`)}
          </Text>
        </Group>
      </Box>
    </Group>
  );
}

export function ReviewsPage() {
  return (
    <PresenterScope name="ReviewsPage">
      <ReviewsPageBinding />
    </PresenterScope>
  );
}

function ReviewsPageBinding() {
  const model = useReviewsPagePresenter();
  return <ReviewsPageView model={model} />;
}
