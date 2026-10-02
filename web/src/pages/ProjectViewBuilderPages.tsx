import { Box, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { ProjectListControls } from '../components/ProjectListControls.tsx';
import { ProjectBoardView } from '../components/ProjectBoardView.tsx';
import { ProjectTimelineView } from '../components/ProjectTimelineView.tsx';
import { ProjectListItem } from '../components/ProjectListItem.tsx';
import { ViewBuilderHeader } from '../components/ViewBuilderHeader.tsx';
import { ViewEntityTabs } from '../components/ViewEntityTabs.tsx';
import { EmptyState, Section } from '../mantine-ui.tsx';
import { useFocusWhen } from '../focus.ts';
import { useProjectViewBuilderPresenter } from '../presenters/ProjectViewBuilderPages.tsx';

export function ProjectViewBuilderPageView({
  model,
  nameRef,
}: {
  model: ReturnType<typeof useProjectViewBuilderPresenter>;
  nameRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0:
      return (
        <Box
          h="100%"
          style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
        >
          <ViewBuilderHeader model={model} nameRef={nameRef} />
          <Box
            px="md"
            py={6}
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <ProjectListControls
              model={model.controls}
              compact
              leading={<ViewEntityTabs active="projects" />}
            />
          </Box>
          <Box
            aria-label={t('viewBuilder.preview')}
            aria-hidden="true"
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              pointerEvents: 'none',
            }}
          >
            {model.filteredProjects.length === 0 ? (
              <EmptyState>{t('ui.noProjectsMatchView')}</EmptyState>
            ) : model.controls.view === 'board' ? (
              <Box p="md">
                <ProjectBoardView
                  model={model.projectBoard}
                  showRows={model.controls.rowsBy !== 'none'}
                  displayProperties={model.displayProperties}
                  issueCounts={model.projectIssueCounts}
                />
              </Box>
            ) : model.controls.view === 'timeline' ? (
              <Box p="md">
                <ProjectTimelineView
                  model={model.projectTimeline}
                  showProjectList={model.controls.showProjectList}
                  showWeekNumbers={model.controls.showWeekNumbers}
                  focusToday={model.timelineFocusToday}
                  displayProperties={model.displayProperties}
                  issueCounts={model.projectIssueCounts}
                  grouped={model.controls.groupBy !== 'none'}
                  handlers={{
                    onPrevious: () => undefined,
                    onNext: () => undefined,
                    onToday: () => undefined,
                  }}
                />
              </Box>
            ) : (
              <Stack gap="md" p="md">
                {model.groups.map((group) => (
                  <Section key={group.key} title={group.label} ariaLabel={group.label || undefined}>
                    <Stack gap={0}>
                      {group.projects.map((project) => (
                        <ProjectListItem
                          key={project.slug}
                          project={project}
                          displayProperties={model.displayProperties}
                          issueCount={model.projectIssueCounts[project.slug] ?? 0}
                        />
                      ))}
                    </Stack>
                  </Section>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      );
  }
}

export function ProjectViewBuilderPage() {
  return (
    <PresenterScope name="ProjectViewBuilderPage">
      <ProjectViewBuilderPageBinding />
    </PresenterScope>
  );
}

function ProjectViewBuilderPageBinding() {
  const model = useProjectViewBuilderPresenter();
  const handlers = useActions(model.handlers);
  const nameRef = useFocusWhen<HTMLInputElement>(true, []);
  return (
    <ProjectViewBuilderPageView model={{ ...model, handlers } as typeof model} nameRef={nameRef} />
  );
}
