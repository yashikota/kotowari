import { Box, Button, Group, Stack, Tabs, Text, UnstyledButton } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import styles from './ViewsIndexPages.module.css';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { ViewIcon } from '../components/ViewIcon.tsx';
import { ViewsCollectionControls } from '../components/ViewsCollectionControls.tsx';
import { ViewsEmptyState } from '../components/ViewsEmptyState.tsx';
import { PageHeader } from '../mantine-ui.tsx';
import { useViewsIndexPresenter } from '../presenters/ViewsIndexPages.tsx';
import type { ViewCollectionEntity, ViewDisplayProperty } from '../presenters/ViewsIndexPages.tsx';
import type { ProjectSavedView } from '../project-views.ts';
import type { View } from '../types.ts';

export function ViewsIndexPageView({
  model,
}: {
  model: ReturnType<typeof useViewsIndexPresenter>;
}) {
  const { t } = useTranslation();
  const isEmpty = model.views.length === 0;
  const createLabel = t('views.create');
  const contentDescription = t(
    model.entity === 'issues' ? 'views.emptyDescriptionIssues' : 'views.emptyDescriptionProjects',
  );

  return (
    <Box
      h="100%"
      style={{ minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <PageHeader
        title={t('nav.views')}
        actions={
          <Button
            type="button"
            size="xs"
            leftSection={<IconPlus size={14} aria-hidden />}
            onClick={model.handlers.onCreateView}
          >
            {createLabel}
          </Button>
        }
      />
      <Group
        component="div"
        role="group"
        aria-label={t('views.collectionToolbar')}
        justify="space-between"
        gap="sm"
        px="md"
        py={8}
        wrap="wrap"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <Tabs
          value={model.entity}
          onChange={(value) => {
            if (value === 'issues' || value === 'projects') {
              void model.handlers.onEntityChange(value as ViewCollectionEntity);
            }
          }}
        >
          <Tabs.List aria-label={t('views.collectionTabs')}>
            <Tabs.Tab value="issues">{t('viewBuilder.issues')}</Tabs.Tab>
            <Tabs.Tab value="projects">{t('viewBuilder.projects')}</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <ViewsCollectionControls
          order={model.order}
          direction={model.direction}
          displayProperties={model.displayProperties}
          onOrderChange={model.handlers.onOrderChange}
          onToggleDirection={model.handlers.onToggleDirection}
          onToggleDisplayProperty={model.handlers.onToggleDisplayProperty}
        />
      </Group>

      {isEmpty ? (
        <ViewsEmptyState
          title={t('nav.views')}
          description={contentDescription}
          createLabel={createLabel}
          documentationLabel={t('views.documentation')}
          onCreate={model.handlers.onCreateView}
        />
      ) : (
        <Stack
          component="nav"
          aria-label={t('nav.savedViews')}
          gap={0}
          p="md"
          style={{ minHeight: 0, flex: 1, overflow: 'auto' }}
        >
          {model.views.map((view) => (
            <SavedViewRow
              key={view.slug}
              entity={model.entity}
              view={view}
              displayProperties={model.displayProperties}
              onOpen={() => model.handlers.onOpenView(view)}
              labels={{
                created: t('views.properties.created'),
                updated: t('views.properties.updated'),
              }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function SavedViewRow({
  entity,
  view,
  displayProperties,
  onOpen,
  labels,
}: {
  entity: ViewCollectionEntity;
  view: View | ProjectSavedView;
  displayProperties: ViewDisplayProperty[];
  onOpen: () => void;
  labels: Record<ViewDisplayProperty, string>;
}) {
  const isProject = entity === 'projects';
  const projectView = isProject ? (view as ProjectSavedView) : undefined;
  const issueView = !isProject ? (view as View) : undefined;
  const { t } = useTranslation();
  return (
    <Group
      component="div"
      wrap="wrap"
      gap="sm"
      px="sm"
      py={5}
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      {issueView ? (
        <Link to="/views/$slug" params={{ slug: issueView.slug }} className={styles.open}>
          <SavedViewContent view={view} />
        </Link>
      ) : (
        <UnstyledButton
          type="button"
          onClick={onOpen}
          aria-label={projectView?.name}
          className={styles.open}
        >
          <SavedViewContent view={view} />
        </UnstyledButton>
      )}
      {displayProperties.map((property) => (
        <Text key={property} size="xs" c="dimmed" className={styles.date}>
          <span>{labels[property]} · </span>
          {formatCollectionDate(
            property === 'updated'
              ? view.updatedAt
              : (issueView?.createdAt ?? projectView?.createdAt ?? ''),
            t('views.notAvailable'),
          )}
        </Text>
      ))}
    </Group>
  );
}

function SavedViewContent({ view }: { view: View | ProjectSavedView }) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start" py="xs">
      <Box style={{ flex: '0 0 auto' }} aria-hidden>
        <ViewIcon name={view.icon ?? 'list'} size={16} />
      </Box>
      <Stack gap={3} style={{ minWidth: 0, flex: 1 }}>
        <Text size="sm" fw={600} lineClamp={2} title={view.name} className={styles.title}>
          {view.name}
        </Text>
        {view.description ? (
          <Text size="sm" c="dimmed" lineClamp={2} className={styles.title}>
            {view.description}
          </Text>
        ) : null}
      </Stack>
    </Group>
  );
}

function formatCollectionDate(value: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export function ViewsIndexPage() {
  return (
    <PresenterScope name="ViewsIndexPage">
      <ViewsIndexPageBinding />
    </PresenterScope>
  );
}

function ViewsIndexPageBinding() {
  const model = useViewsIndexPresenter();
  const handlers = useActions(model.handlers);
  return <ViewsIndexPageView model={{ ...model, handlers } as typeof model} />;
}
