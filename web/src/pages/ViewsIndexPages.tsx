import { Box, Button, Group, Menu, Stack, Tabs, Text, UnstyledButton } from '@mantine/core';
import {
  IconAdjustmentsHorizontal,
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconChevronDown,
  IconPlus,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { ViewIcon } from '../components/ViewIcon.tsx';
import { ViewsEmptyState } from '../components/ViewsEmptyState.tsx';
import { PageHeader, RouterNavLink } from '../mantine-ui.tsx';
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
        <Menu shadow="md" width={220} position="bottom-end" withinPortal>
          <Menu.Target>
            <Button
              type="button"
              size="xs"
              variant="subtle"
              leftSection={<IconAdjustmentsHorizontal size={14} aria-hidden />}
              rightSection={<IconChevronDown size={13} aria-hidden />}
              aria-label={t('views.displayOptions')}
            >
              {t('views.displayOptions')}
            </Button>
          </Menu.Target>
          <Menu.Dropdown aria-label={t('views.displayOptions')}>
            <Menu.Label>{t('views.ordering')}</Menu.Label>
            {(['name', 'updated'] as const).map((order) => (
              <Menu.Item
                key={order}
                aria-current={model.order === order ? 'true' : undefined}
                leftSection={model.order === order ? <IconCheck size={14} aria-hidden /> : null}
                onClick={() => model.handlers.onOrderChange(order)}
              >
                {t(`views.order.${order}`)}
              </Menu.Item>
            ))}
            <Menu.Item
              leftSection={
                model.direction === 'asc' ? (
                  <IconArrowUp size={14} aria-hidden />
                ) : (
                  <IconArrowDown size={14} aria-hidden />
                )
              }
              onClick={model.handlers.onToggleDirection}
            >
              {t('views.direction', {
                direction: t(`views.${model.direction === 'asc' ? 'ascending' : 'descending'}`),
              })}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label>{t('views.displayProperties')}</Menu.Label>
            {(['created', 'updated'] as const).map((property) => (
              <Menu.CheckboxItem
                key={property}
                checked={model.displayProperties.includes(property)}
                onChange={() => model.handlers.onToggleDisplayProperty(property)}
              >
                {t(`views.properties.${property}`)}
              </Menu.CheckboxItem>
            ))}
          </Menu.Dropdown>
        </Menu>
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
      wrap="nowrap"
      gap="md"
      px="sm"
      py={5}
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      {issueView ? (
        <RouterNavLink
          to="/views/$slug"
          params={{ slug: issueView.slug }}
          label={issueView.name}
          description={issueView.description || undefined}
          leftSection={<ViewIcon name={issueView.icon} size={14} />}
          style={{ flex: 1 }}
        />
      ) : (
        <UnstyledButton
          type="button"
          onClick={onOpen}
          aria-label={projectView?.name}
          style={{ flex: 1, minWidth: 0, textAlign: 'start', borderRadius: 4 }}
        >
          <Group gap="xs" wrap="nowrap" py={5}>
            <ViewIcon name={projectView?.icon ?? 'list'} size={14} />
            <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
              <Text size="sm" truncate>
                {projectView?.name}
              </Text>
              {projectView?.description ? (
                <Text size="xs" c="dimmed" truncate>
                  {projectView.description}
                </Text>
              ) : null}
            </Stack>
          </Group>
        </UnstyledButton>
      )}
      {displayProperties.map((property) => (
        <Text key={property} size="xs" c="dimmed" w={100} ta="end" visibleFrom="sm">
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
