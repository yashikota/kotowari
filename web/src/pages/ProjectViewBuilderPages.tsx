import { Box, Button, Group, Popover, SimpleGrid, Stack, TextInput, Textarea } from '@mantine/core';
import { IconChevronLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { ProjectListControls } from '../components/ProjectListControls.tsx';
import { ProjectBoardView } from '../components/ProjectBoardView.tsx';
import { ProjectTimelineView } from '../components/ProjectTimelineView.tsx';
import { ProjectListItem } from '../components/ProjectListItem.tsx';
import { ViewIcon } from '../components/ViewIcon.tsx';
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
          <Group
            component="header"
            px="md"
            py={6}
            mt={20}
            gap="sm"
            wrap="nowrap"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <Popover
              opened={model.iconPickerOpen}
              onChange={model.handlers.onIconPickerChange}
              position="bottom-start"
              shadow="md"
            >
              <Popover.Target>
                <Button
                  type="button"
                  variant="default"
                  px="xs"
                  aria-label={t('viewBuilder.chooseIcon')}
                  onClick={() => model.handlers.onIconPickerChange(!model.iconPickerOpen)}
                >
                  <ViewIcon name={model.icon} />
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <SimpleGrid cols={6} spacing={4} aria-label={t('viewBuilder.iconChoices')}>
                  {model.iconOptions.map((name) => (
                    <Button
                      key={name}
                      type="button"
                      variant={model.icon === name ? 'light' : 'subtle'}
                      color="gray"
                      aria-label={t(`viewBuilder.icons.${name}`)}
                      aria-pressed={model.icon === name}
                      onClick={() => {
                        model.handlers.onIconChange(name);
                        model.handlers.onIconPickerChange(false);
                      }}
                    >
                      <ViewIcon name={name} />
                    </Button>
                  ))}
                </SimpleGrid>
              </Popover.Dropdown>
            </Popover>
            <TextInput
              ref={nameRef}
              data-autofocus
              aria-label={t('viewBuilder.name')}
              value={model.name}
              maxLength={100}
              onChange={model.handlers.onNameChange}
              styles={{
                input: {
                  height: 36,
                  minHeight: 36,
                  borderColor: 'transparent',
                  background: 'transparent',
                  fontSize: 20,
                  fontWeight: 600,
                },
              }}
              style={{ flex: 1, minWidth: 140 }}
            />
            <Button type="button" variant="default" onClick={model.handlers.onCancel}>
              <IconChevronLeft size={14} aria-hidden="true" />
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={model.handlers.onCreate} disabled={!model.name.trim()}>
              {t('viewBuilder.createView')}
            </Button>
          </Group>
          <Textarea
            aria-label={t('viewBuilder.description')}
            placeholder={t('viewBuilder.descriptionPlaceholder')}
            value={model.description}
            maxLength={1000}
            autosize
            minRows={1}
            maxRows={3}
            onChange={model.handlers.onDescriptionChange}
            px="md"
            py={3}
            styles={{
              input: { borderColor: 'transparent', background: 'transparent', resize: 'none' },
            }}
          />
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
