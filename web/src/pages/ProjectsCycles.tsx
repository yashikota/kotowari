import { Link } from '@tanstack/react-router';
import {
  Box,
  Button,
  Group,
  NativeSelect,
  Progress,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';

import { IssueList } from '../components/IssueList.tsx';
import { CycleListItem, CycleStatusHeading } from '../components/CycleListItem.tsx';
import { ProjectListItem } from '../components/ProjectListItem.tsx';
import { CYCLE_STATUSES, PROJECT_STATUSES } from '../types.ts';
import { EmptyState, MetaBadge, PageHeader, Pane, Section, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import {
  useCycleDetailPagePresenter,
  useCyclesPagePresenter,
  useProjectDetailPagePresenter,
  useProjectsPagePresenter,
} from '../presenters/ProjectsCycles.tsx';

function projectStatusLabel(status: string): string {
  return status.replace(/^./, (letter) => letter.toUpperCase());
}

function cycleStatusLabel(status: string): string {
  if (status === 'active') return 'Current';
  return projectStatusLabel(status);
}

export function ProjectsPageView({
  model,
  projectNameRef,
}: {
  model: ReturnType<typeof useProjectsPagePresenter>;
  projectNameRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  switch (model._view) {
    case 0: {
      const { projects, name, handlers } = model;
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title="Projects"
              actions={
                <Box
                  component="form"
                  onSubmit={handlers.onSubmit0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: 'min(420px, 55vw)',
                  }}
                >
                  <TextInput
                    ref={projectNameRef}
                    aria-label="New project name"
                    placeholder="Project name"
                    value={name}
                    onChange={handlers.New_project_name_onChange1}
                    styles={{
                      root: { flex: '1 1 auto', minWidth: 150 },
                      input: { height: 32, minHeight: 32, fontSize: 'var(--mantine-font-size-sm)' },
                    }}
                  />
                  <Button type="submit" variant="default">
                    New project
                  </Button>
                </Box>
              }
            />
            {projects.length === 0 ? (
              <EmptyState>No projects yet. Name one above.</EmptyState>
            ) : (
              <Stack gap={0}>
                {projects.map((project) => (
                  <ProjectListItem key={project.slug} project={project} />
                ))}
              </Stack>
            )}
          </Pane>
        </SplitLayout>
      );
    }
  }
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
  const projectNameRef = useFocusWhen<HTMLInputElement>(true);
  return (
    <ProjectsPageView
      model={{ ...model, handlers } as typeof model}
      projectNameRef={projectNameRef}
    />
  );
}

export function ProjectDetailPageView({
  model,
  descriptionRef,
}: {
  model: ReturnType<typeof useProjectDetailPagePresenter>;
  descriptionRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
}) {
  switch (model._view) {
    case 0: {
      const { slug, data, selected, project, handlers } = model;
      return (
        <Box h="100%" style={{ overflow: 'auto' }}>
          <SplitLayout single>
            <Pane single>
              <PageHeader
                title={project.name}
                actions={
                  <Group gap="xs" wrap="wrap">
                    <NativeSelect
                      aria-label="Project status"
                      value={project.status}
                      onChange={handlers.Project_status_onChange0}
                      data={PROJECT_STATUSES.map((s) => ({
                        value: s,
                        label: projectStatusLabel(s),
                      }))}
                    />
                    <Button type="button" variant="subtle" onClick={handlers.onClick1}>
                      New issue
                    </Button>
                    <Button type="button" variant="subtle" color="red" onClick={handlers.onClick2}>
                      Delete
                    </Button>
                  </Group>
                }
              />
              <Stack gap="md">
                <Textarea
                  ref={descriptionRef}
                  aria-label="Project description"
                  placeholder="Description"
                  value={project.description}
                  onChange={handlers.Project_description_onChange3}
                  onBlur={handlers.Project_description_onBlur4}
                  styles={{
                    input: {
                      minHeight: 42,
                      padding: '8px 10px',
                      fontSize: 'var(--mantine-font-size-sm)',
                    },
                  }}
                />
                <Group gap="md" wrap="wrap" align="flex-end">
                  <TextInput
                    type="date"
                    aria-label="Start date"
                    label="Start"
                    value={project.startDate?.slice(0, 10) ?? ''}
                    onChange={handlers.Start_date_onChange5}
                  />
                  <TextInput
                    type="date"
                    aria-label="Target date"
                    label="Target"
                    value={project.targetDate?.slice(0, 10) ?? ''}
                    onChange={handlers.Target_date_onChange6}
                  />
                </Group>
                <Stack gap="md" aria-label="Project documents">
                  <Section
                    title="ADRs"
                    action={
                      <Button type="button" variant="subtle" size="xs" onClick={handlers.onClick7}>
                        New ADR
                      </Button>
                    }
                  >
                    <Stack
                      gap="xs"
                      component="ul"
                      style={{ listStyle: 'none', margin: 0, padding: 0 }}
                    >
                      {data.adrs
                        .filter(
                          (a) =>
                            a.projectSlug === slug ||
                            data.issues.some((i) => a.issueNumbers.includes(i.number)),
                        )
                        .map((a) => (
                          <Group component="li" key={a.identifier} gap="xs" wrap="wrap">
                            <Link to="/adrs/$identifier" params={{ identifier: a.identifier }}>
                              {a.identifier} {a.title}
                            </Link>
                            <MetaBadge>{a.status}</MetaBadge>
                          </Group>
                        ))}
                    </Stack>
                  </Section>
                  <Section title="Pages">
                    <Stack
                      gap="xs"
                      component="ul"
                      style={{ listStyle: 'none', margin: 0, padding: 0 }}
                    >
                      {data.pages
                        .filter((p) => p.projectSlug === slug)
                        .map((p) => (
                          <Text component="li" key={p.slug} size="sm">
                            <Link to="/pages/$slug" params={{ slug: p.slug }}>
                              {p.title}
                            </Link>
                          </Text>
                        ))}
                    </Stack>
                  </Section>
                </Stack>
                <IssueList
                  issues={data.issues}
                  selectedId={selected}
                  onSelect={handlers.onSelect8}
                  groupBy="status"
                  hideProjectSlug
                />
              </Stack>
            </Pane>
          </SplitLayout>
        </Box>
      );
    }
  }
}

export function ProjectDetailPage() {
  return (
    <PresenterScope name="ProjectDetailPage">
      <ProjectDetailPageBinding />
    </PresenterScope>
  );
}

function ProjectDetailPageBinding() {
  const model = useProjectDetailPagePresenter();
  const handlers = useActions(model.handlers);
  const autofocusDescription = useAutofocusTarget('description');
  const descriptionRef = useFocusWhen<HTMLTextAreaElement>(autofocusDescription, [model.slug]);
  return (
    <ProjectDetailPageView
      model={{ ...model, handlers } as typeof model}
      descriptionRef={descriptionRef}
    />
  );
}

export function CyclesPageView({ model }: { model: ReturnType<typeof useCyclesPagePresenter> }) {
  switch (model._view) {
    case 0: {
      const { cycles, handlers } = model;
      const sections = [
        { name: 'Upcoming', rows: cycles.filter((cycle) => cycle.status === 'upcoming') },
        { name: 'Current', rows: cycles.filter((cycle) => cycle.status === 'active') },
        { name: 'Completed', rows: cycles.filter((cycle) => cycle.status === 'completed') },
      ].filter((section) => section.rows.length > 0);
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title="Cycles"
              actions={
                <Button type="button" variant="subtle" onClick={handlers.onClick0}>
                  New cycle
                </Button>
              }
            />
            {cycles.length === 0 ? (
              <EmptyState>No cycles yet. Start one to timebox work.</EmptyState>
            ) : (
              <Stack gap="lg" p="md" pb="xl">
                {sections.map((section) => (
                  <Stack gap={0} key={section.name}>
                    <CycleStatusHeading title={section.name} count={section.rows.length} />
                    {section.rows.map((cycle) => (
                      <CycleListItem key={cycle.number} cycle={cycle} />
                    ))}
                  </Stack>
                ))}
              </Stack>
            )}
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function CyclesPage() {
  return (
    <PresenterScope name="CyclesPage">
      <CyclesPageBinding />
    </PresenterScope>
  );
}

function CyclesPageBinding() {
  const model = useCyclesPagePresenter();
  const handlers = useActions(model.handlers);
  return <CyclesPageView model={{ ...model, handlers } as typeof model} />;
}

export function CycleDetailPageView({
  model,
}: {
  model: ReturnType<typeof useCycleDetailPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { data, selected, cycle, done, handlers } = model;
      return (
        <Box h="100%" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <SplitLayout single>
            <Pane single>
              <PageHeader
                title={`Cycle ${cycle.number}`}
                actions={
                  <Group gap="xs" wrap="wrap">
                    <NativeSelect
                      aria-label="Cycle status"
                      value={cycle.status}
                      onChange={handlers.Cycle_status_onChange0}
                      data={CYCLE_STATUSES.map((s) => ({ value: s, label: cycleStatusLabel(s) }))}
                    />
                    <Button type="button" variant="subtle" onClick={handlers.onClick1}>
                      New issue
                    </Button>
                  </Group>
                }
              />
              <Group
                gap="xl"
                wrap="wrap"
                px="md"
                py="sm"
                mih={48}
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <Group gap={6}>
                  <Text size="xs" c="dimmed">
                    Dates
                  </Text>
                  <Text size="sm">
                    {cycle.startsAt.slice(0, 10)} — {cycle.endsAt.slice(0, 10)}
                  </Text>
                </Group>
                <Group gap={6}>
                  <Text size="xs" c="dimmed">
                    Scope
                  </Text>
                  <Text size="sm">{data.issues.length} issues</Text>
                </Group>
                <Group gap={6}>
                  <Text size="xs" c="dimmed">
                    Completed
                  </Text>
                  <Text size="sm">
                    {done} / {data.issues.length}
                  </Text>
                </Group>
                <Progress
                  aria-label="Cycle completion"
                  value={data.issues.length ? (done / data.issues.length) * 100 : 0}
                  w={132}
                  size="sm"
                />
              </Group>
              <Box style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <IssueList
                  issues={data.issues}
                  selectedId={selected}
                  onSelect={handlers.onSelect2}
                  groupBy="status"
                />
              </Box>
            </Pane>
          </SplitLayout>
        </Box>
      );
    }
  }
}

export function CycleDetailPage() {
  return (
    <PresenterScope name="CycleDetailPage">
      <CycleDetailPageBinding />
    </PresenterScope>
  );
}

function CycleDetailPageBinding() {
  const model = useCycleDetailPagePresenter();
  const handlers = useActions(model.handlers);
  return <CycleDetailPageView model={{ ...model, handlers } as typeof model} />;
}
