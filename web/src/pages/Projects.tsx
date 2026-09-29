import { ActionIcon, Box, Button, Group, Stack, Text } from '@mantine/core';
import { IconPlus, IconStack2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

import { ProjectListView } from '../components/ProjectListView.tsx';
import { ProjectListControls } from '../components/ProjectListControls.tsx';
import { ProjectBoardView } from '../components/ProjectBoardView.tsx';
import { ProjectTimelineView } from '../components/ProjectTimelineView.tsx';
import { ProjectCreateDialog } from '../components/ProjectCreateDialog.tsx';
import { ProjectsEmptyState } from '../components/ProjectsEmptyState.tsx';

import { ViewIcon } from '../components/ViewIcon.tsx';

import type { ProjectSavedView } from '../project-views.ts';

import { PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useFocusWhen } from '../focus.ts';
import { useProjectsPagePresenter } from '../presenters/Projects.tsx';

export function ProjectsPageView({
  model,
  projectNameRef,
}: {
  model: ReturnType<typeof useProjectsPagePresenter>;
  projectNameRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const {
        projectGroups,
        projectBoard,
        projectTimeline,
        timelineFocusToday,
        displayProperties,
        projectIssueCounts,
        projectViews,
        archived,
        activeProjectView,
        visibleProjectCount,
        isGrouped,
        hasActiveSearch,
        controls,
        handlers,
      } = model;
      return (
        <SplitLayout single>
          <Pane single flush style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <PageHeader
              title={t('nav.projects')}
              minHeight={44}
              titleSize="md"
              titleWeight={500}
              titleLineHeight="normal"
              paddingX={19}
              actions={
                <Group gap="xs">
                  <Button
                    type="button"
                    size="xs"
                    variant="subtle"
                    onClick={handlers.onToggleArchivedProjects}
                  >
                    {t(archived ? 'projectList.showActive' : 'projectList.showArchived')}
                  </Button>
                  {!archived ? (
                    <ActionIcon
                      type="button"
                      variant="default"
                      aria-label={t('projectList.newProject')}
                      title={`${t('projectList.newProject')} · ${t('ui.shortcutCreateProject')}`}
                      onClick={handlers.onOpenCreateProject}
                    >
                      <IconPlus size={16} stroke={1.7} aria-hidden="true" />
                    </ActionIcon>
                  ) : null}
                </Group>
              }
            />
            <ProjectViewsBar
              views={projectViews}
              activeSlug={activeProjectView?.slug}
              handlers={handlers}
              controls={
                <ProjectListControls model={controls} compact filterPosition="bottom-end" />
              }
            />
            {visibleProjectCount === 0 && hasActiveSearch ? (
              <Stack align="center" py="xl" gap="xs">
                <Text c="dimmed" ta="center">
                  {t('projectList.noResults')}
                </Text>
                <Button type="button" variant="subtle" onClick={controls.handlers.onReset}>
                  {t('projectList.clearFilters')}
                </Button>
              </Stack>
            ) : visibleProjectCount === 0 ? (
              <ProjectsEmptyState onCreateProject={handlers.onOpenCreateProject} />
            ) : controls.view === 'board' ? (
              <ProjectBoardView
                model={projectBoard}
                showRows={controls.rowsBy !== 'none'}
                displayProperties={displayProperties}
                issueCounts={projectIssueCounts}
                onMoveProject={handlers.onMoveProjectOnBoard}
              />
            ) : controls.view === 'timeline' ? (
              <ProjectTimelineView
                model={projectTimeline}
                showProjectList={controls.showProjectList}
                showWeekNumbers={controls.showWeekNumbers}
                focusToday={timelineFocusToday}
                displayProperties={displayProperties}
                issueCounts={projectIssueCounts}
                grouped={isGrouped}
                handlers={{
                  onPrevious: handlers.onTimelinePrevious,
                  onNext: handlers.onTimelineNext,
                  onToday: handlers.onTimelineToday,
                }}
              />
            ) : (
              <ProjectListView
                groups={projectGroups}
                grouped={isGrouped}
                displayProperties={displayProperties}
                issueCounts={projectIssueCounts}
                orderBy={controls.orderBy}
                direction={controls.direction}
                onSort={controls.handlers.onSortProperty}
                onReorder={
                  controls.orderBy === 'manual' && !isGrouped
                    ? handlers.onReorderProject
                    : undefined
                }
              />
            )}
            <ProjectCreateDialog model={model} projectNameRef={projectNameRef} />
          </Pane>
        </SplitLayout>
      );
    }
  }
}

function ProjectViewsBar({
  views,
  activeSlug,
  handlers,
  controls,
}: {
  views: ProjectSavedView[];
  activeSlug?: string;
  handlers: ReturnType<typeof useProjectsPagePresenter>['handlers'];
  controls: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Group justify="space-between" align="center" gap="sm" wrap="wrap" mt={8} mb={8} pl={9} pr={8}>
      <Group gap={4} wrap="wrap" role="tablist" aria-label={t('projectViews.views')}>
        <Button
          type="button"
          size="xs"
          h={28}
          variant={activeSlug ? 'subtle' : 'light'}
          role="tab"
          aria-selected={!activeSlug}
          onClick={handlers.onShowAllProjects}
        >
          {t('projectViews.allProjects')}
        </Button>
        {views.map((view) => (
          <Button
            key={view.slug}
            type="button"
            size="xs"
            h={28}
            variant={activeSlug === view.slug ? 'light' : 'subtle'}
            role="tab"
            aria-selected={activeSlug === view.slug}
            title={view.description || view.name}
            onClick={() => void handlers.onApplyProjectView(view)}
          >
            <Group gap={4} wrap="nowrap">
              <ViewIcon name={view.icon ?? 'list'} />
              {view.name}
            </Group>
          </Button>
        ))}
        <ActionIcon
          type="button"
          size={28}
          variant="subtle"
          color="gray"
          aria-label={t('projectViews.add')}
          title={t('projectViews.add')}
          onClick={handlers.onOpenCreateProjectView}
        >
          <IconStack2 size={16} stroke={1.7} aria-hidden="true" />
        </ActionIcon>
        {activeSlug ? (
          <>
            <Button
              type="button"
              size="xs"
              variant="subtle"
              onClick={() => void handlers.onUpdateActiveProjectView()}
            >
              {t('projectViews.saveChanges')}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="subtle"
              color="red"
              onClick={() => void handlers.onDeleteActiveProjectView()}
            >
              {t('projectViews.delete')}
            </Button>
          </>
        ) : null}
      </Group>
      <Box style={{ marginInlineEnd: 11 }}>{controls}</Box>
    </Group>
  );
}

export function ProjectsPage() {
  return (
    <PresenterScope name="ProjectsPage">
      <ProjectsPageBinding />
    </PresenterScope>
  );
}

function ProjectsPageBinding() {
  const model = useProjectsPagePresenter();
  const handlers = useActions(model.handlers);
  const projectNameRef = useFocusWhen<HTMLInputElement>(model.createOpen);
  return (
    <ProjectsPageView
      model={{ ...model, handlers } as typeof model}
      projectNameRef={projectNameRef}
    />
  );
}
